// 回答进度推导纯逻辑：把会话事件（session/event 载荷）折叠成「回答进度」状态机。
// 零宿主依赖、可单测。契约：
// - 输入是与官方 SessionEvent 一致的事件：{ type, seq, time, data }。
// - 阶段：idle → turn(开始处理) → think(思考) → stream(输出) ⇄ tool(工具) → done(完成)/error。
// - 进度模型（混合）：阶段权重 + token 填充。
//   · token 权威值来自 assistant/chunk 的 usage 载荷（适配器上报的真实计数）；
//     流式期间用文本长度/4 估算（中英文混合经验值）。
//   · maxTokens 来自 request/header 的 data.config.maxTokens：有则精确填充
//     （10%→90% 按 out/max 线性），无则用饱和曲线 1-exp(-out/600) 估计（不卡死、不虚假）。
//   · 同一 turn 内进度单调不减（bar 不倒退）；tool 阶段冻结当前进度（不跳变）。
// - done 固定 100，error/idle 固定 0（turn 内不单调——错误回合直接归零）。
export const PHASES = Object.freeze({
  IDLE: 'idle', TURN: 'turn', THINK: 'think', STREAM: 'stream',
  TOOL: 'tool', DONE: 'done', ERROR: 'error',
})

export const PHASE_LABELS = Object.freeze({
  idle: '待命', turn: '开始处理', think: '思考中', stream: '回答中',
  tool: '使用工具', done: '完成', error: '出错',
})

/** 4 字符 ≈ 1 token（中英文混合经验值；usage 到达后以权威值为准）。 */
export const CHARS_PER_TOKEN = 4

export function estimateTokens(chars) {
  return Math.round(chars / CHARS_PER_TOKEN)
}

/** 空进度状态（idle 基线）。 */
export function initialProgressState() {
  return {
    phase: PHASES.IDLE,
    turn: null,
    step: null,
    inputTokens: 0,
    usageOutputTokens: null, // usage 事件到达前的权威输出 token（null = 未知）
    estOutputTokens: 0,      // 文本/推理字符估算的输出 token
    reasoningChars: 0,
    textChars: 0,
    chunkCount: 0,
    toolName: null,
    toolCount: 0,
    startedAt: null,         // turn/start 时刻
    firstChunkAt: null,      // 首个输出 chunk 时刻
    endedAt: null,
    endReason: null,
    maxTokens: null,         // request/header 的 config.maxTokens（未知为 null）
    rate: 0,                 // 输出速率 EMA（tok/s）
    lastChunkAt: null,
    textSnippet: '',         // 滚动文本片段（最近 ~64 字符，气泡展示用）
    progress: 0,
  }
}

/** 新 turn 开始：重置回合态（调用方拿到全新状态，旧状态由调用方替换）。 */
export function startTurn(data, now = Date.now()) {
  const next = initialProgressState()
  next.phase = PHASES.TURN
  next.turn = typeof data?.turn === 'number' ? data.turn : null
  next.startedAt = now
  return next
}

/**
 * 把一条会话事件应用到进度状态（原地修改并返回同一对象，便于宿主比较 phase 变化）。
 * 非进度相关事件（user/message、compaction/* 等）不改动任何字段——幂等。
 */
export function applyEvent(state, event, now = Date.now()) {
  const type = event?.type
  const data = event?.data ?? {}
  switch (type) {
    case 'step/start': {
      state.phase = PHASES.THINK
      state.step = typeof data.step === 'number' ? data.step : state.step
      state.toolName = null
      break
    }
    case 'request/header': {
      // 每请求记录配置快照：maxTokens 存在时用于精确填充进度。
      const m = data?.config?.maxTokens
      if (typeof m === 'number' && m > 0) state.maxTokens = m
      break
    }
    case 'assistant/chunk': {
      const chunk = data?.chunk ?? {}
      state.chunkCount += 1
      const type = chunk.type
      let added = 0
      if (type === 'text-delta') {
        const len = typeof chunk.text === 'string' ? chunk.text.length : 0
        state.textChars += len
        added = estimateTokens(len)
        state.estOutputTokens += added
        if (len > 0) state.textSnippet = (state.textSnippet + chunk.text).slice(-64)
      } else if (type === 'reasoning-delta') {
        const len = typeof chunk.text === 'string' ? chunk.text.length : 0
        state.reasoningChars += len
        added = estimateTokens(len) // 思考内容也算在输出侧
        state.estOutputTokens += added
      } else if (type === 'usage') {
        const u = chunk.usage ?? {}
        if (typeof u.outputTokens === 'number') state.usageOutputTokens = u.outputTokens
        if (typeof u.inputTokens === 'number') state.inputTokens = u.inputTokens
        if (typeof u.cacheReadTokens === 'number') state.inputTokens += u.cacheReadTokens
        if (typeof u.cacheWriteTokens === 'number') state.inputTokens += u.cacheWriteTokens
      }
      // 首次收到输出 → 进入流式阶段
      if (state.phase === PHASES.THINK || state.phase === PHASES.TURN) {
        state.phase = PHASES.STREAM
        state.firstChunkAt = state.firstChunkAt ?? now
      }
      // 速率 EMA：瞬时速率 = added/dt*1000；≤2s 窗口才计入（防跨请求污染）。
      if (added > 0) {
        const dt = now - (state.lastChunkAt ?? now)
        if (dt > 0 && dt < 2000) {
          const inst = (added / dt) * 1000
          state.rate = state.rate === 0 ? inst : state.rate * 0.7 + inst * 0.3
        }
        state.lastChunkAt = now
      }
      break
    }
    case 'tool/call': {
      state.phase = PHASES.TOOL
      state.toolName = typeof data.name === 'string' ? data.name : state.toolName
      state.toolCount += 1
      break
    }
    case 'tool/result': {
      // 工具返回 → 回到流式/思考（模型继续）
      if (state.phase === PHASES.TOOL) state.phase = PHASES.STREAM
      state.toolName = null
      break
    }
    case 'step/end': {
      // 一步模型调用结束；若非工具中，回到思考等待下一步/回合结束。
      if (state.phase !== PHASES.TOOL) state.phase = PHASES.THINK
      break
    }
    case 'turn/end': {
      state.phase = PHASES.DONE
      state.endedAt = now
      state.endReason = typeof data?.reason?.kind === 'string' ? data.reason.kind : 'completed'
      state.step = null
      break
    }
    default:
      break
  }
  return state
}

/** 计算进度百分比（0–100）并回写 state.progress（同 turn 内单调不减的落点；
 *  done=100、error/idle=0）。回写是故意的：tool 阶段冻结、轮询多次调用
 *  （不同 now）都要读「上次已确认进度」。turn/start 换新状态归零，不跨回合。 */
export function computeProgress(state, now = Date.now()) {
  if (state.phase === PHASES.DONE) {
    state.progress = 100
    return 100
  }
  if (state.phase === PHASES.ERROR || state.phase === PHASES.IDLE) {
    state.progress = 0
    return 0
  }
  let target
  switch (state.phase) {
    case PHASES.TURN:
      target = 2
      break
    case PHASES.THINK: {
      const s = state.startedAt !== null ? Math.max(0, now - state.startedAt) / 1000 : 0
      target = Math.min(10, 5 + s * 0.5) // 思考时间越长越接近 10%（封顶）
      break
    }
    case PHASES.STREAM: {
      const out = state.usageOutputTokens ?? state.estOutputTokens
      const max = state.maxTokens
      const fill = max !== null && max > 0
        ? Math.min(1, out / max)
        : 1 - Math.exp(-out / 600) // 饱和曲线：0→1，无 maxTokens 时不卡死
      target = 10 + 80 * fill
      break
    }
    case PHASES.TOOL:
      target = state.progress // 工具阶段冻结当前进度（不跳变、不倒退）
      break
    default:
      target = 0
  }
  const result = Math.max(state.progress, target)
  state.progress = result
  return result
}

/** 派生 /state 视图（宿主序列化下发；客户端只读不解释）。 */
export function deriveView(state, now = Date.now()) {
  const progress = computeProgress(state, now)
  const outTokens = state.usageOutputTokens ?? state.estOutputTokens
  const elapsedMs = state.startedAt !== null ? Math.max(0, now - state.startedAt) : 0
  return {
    phase: state.phase,
    label: PHASE_LABELS[state.phase] ?? state.phase,
    progress: Math.round(progress * 10) / 10,
    outputTokens: outTokens,
    inputTokens: state.inputTokens,
    reasoningTokens: estimateTokens(state.reasoningChars),
    hasUsage: state.usageOutputTokens !== null,
    rateTokS: Math.round(state.rate),
    elapsedMs,
    chunkCount: state.chunkCount,
    toolName: state.toolName,
    toolCount: state.toolCount,
    turn: state.turn,
    step: state.step,
    maxTokens: state.maxTokens,
    textSnippet: state.textSnippet,
    endReason: state.endReason,
  }
}

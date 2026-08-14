// 每会话模型轨迹折叠：把阶段和工具事件压缩成可展示的有限列表。
// 不下发完整 arguments/command，只从白名单字段提取短描述，避免面板泄露敏感参数。

export const MAX_TRACE_ITEMS = 6
const DETAIL_KEYS = ['description', 'query', 'pattern', 'file_path', 'path', 'url']

export function initialTraceState() {
  return { items: [], calls: new Map(), serial: 0 }
}

function cleanText(value, max = 88) {
  if (typeof value !== 'string') return null
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length === 0) return null
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

/** 从工具参数中提取安全短描述；绝不展示完整 command 或原始 JSON。 */
export function summarizeToolArguments(raw) {
  let args = raw
  if (typeof raw === 'string') {
    try { args = JSON.parse(raw) } catch { return null }
  }
  if (args === null || typeof args !== 'object' || Array.isArray(args)) return null
  for (const key of DETAIL_KEYS) {
    const text = cleanText(args[key])
    if (text !== null) return text
  }
  return null
}

function trim(state) {
  if (state.items.length <= MAX_TRACE_ITEMS) return
  const removed = state.items.splice(0, state.items.length - MAX_TRACE_ITEMS)
  for (const item of removed) {
    if (item.callId !== null) state.calls.delete(item.callId)
  }
}

function add(state, input) {
  const item = {
    id: input.id ?? `trace:${++state.serial}`,
    kind: input.kind ?? 'phase',
    label: input.label,
    detail: input.detail ?? null,
    status: input.status ?? 'running',
    startedAt: input.startedAt,
    endedAt: input.endedAt ?? null,
    callId: input.callId ?? null,
  }
  state.items.push(item)
  if (item.callId !== null) state.calls.set(item.callId, item)
  trim(state)
  return item
}

function closePhases(state, now) {
  for (const item of state.items) {
    if (item.kind === 'phase' && item.status === 'running') {
      item.status = 'done'
      item.endedAt = now
    }
  }
}

function phaseOnce(state, id, label, detail, now) {
  const existing = state.items.find((item) => item.id === id)
  if (existing !== undefined) return existing
  closePhases(state, now)
  return add(state, { id, kind: 'phase', label, detail, status: 'running', startedAt: now })
}

export function startTraceTurn(data, now = Date.now()) {
  const state = initialTraceState()
  const turn = typeof data?.turn === 'number' ? data.turn : 0
  add(state, {
    id: `turn:${turn}`,
    kind: 'phase',
    label: '开始处理请求',
    status: 'running',
    startedAt: now,
  })
  return state
}

function resultCallId(data) {
  if (typeof data?.callId === 'string') return data.callId
  const block = data?.message?.content?.[0]
  return typeof block?.toolCallId === 'string' ? block.toolCallId : null
}

function resultIsError(data) {
  if (data?.error !== undefined) return true
  const block = data?.message?.content?.[0]
  return block?.isError === true
}

function settleCall(state, callId, isError, now) {
  if (callId === null) return
  const item = state.calls.get(callId)
  if (item === undefined) return
  item.status = isError ? 'error' : 'done'
  item.endedAt = now
  state.calls.delete(callId)
}

export function applyTraceEvent(state, event, now = Date.now()) {
  const type = event?.type
  const data = event?.data ?? {}
  const turn = typeof data.turn === 'number' ? data.turn : 0
  const step = typeof data.step === 'number' ? data.step : 0
  switch (type) {
    case 'step/start':
      phaseOnce(state, `step:${turn}:${step}`, '分析任务', `步骤 ${step + 1}`, now)
      break
    case 'assistant/chunk': {
      const chunkType = data?.chunk?.type
      if (chunkType === 'reasoning-delta' && typeof data?.chunk?.text === 'string' && data.chunk.text.length > 0) {
        phaseOnce(state, `reason:${turn}:${step}`, '推理与规划', null, now)
      } else if (chunkType === 'text-delta' && typeof data?.chunk?.text === 'string' && data.chunk.text.length > 0) {
        phaseOnce(state, `answer:${turn}:${step}`, '组织回答', null, now)
      }
      break
    }
    case 'tool/call': {
      closePhases(state, now)
      const callId = typeof data.callId === 'string' ? data.callId : `tool:${++state.serial}`
      const name = cleanText(data.name, 40) ?? 'unknown'
      add(state, {
        id: `tool:${callId}`,
        kind: 'tool',
        label: `调用 ${name}`,
        detail: summarizeToolArguments(data.arguments),
        status: 'running',
        startedAt: now,
        callId,
      })
      break
    }
    case 'tool/result':
      settleCall(state, resultCallId(data), resultIsError(data), now)
      break
    case 'tool/code-dispatch-start': {
      const callId = typeof data.subCallId === 'string' ? data.subCallId : `code:${++state.serial}`
      const name = cleanText(data.name, 40) ?? 'unknown'
      add(state, {
        id: `tool:${callId}`,
        kind: 'tool',
        label: `调用 ${name}`,
        detail: summarizeToolArguments(data.arguments),
        status: 'running',
        startedAt: now,
        callId,
      })
      break
    }
    case 'tool/code-dispatch':
      settleCall(state, typeof data.subCallId === 'string' ? data.subCallId : null, data.isError === true, now)
      break
    case 'assistant/message':
    case 'step/end':
      closePhases(state, now)
      break
    case 'turn/end':
      for (const item of state.items) {
        if (item.status === 'running') {
          item.status = 'done'
          item.endedAt = now
        }
      }
      break
    default:
      break
  }
  return state
}

export function deriveTrace(state, now = Date.now()) {
  if (state === undefined || !Array.isArray(state.items)) return []
  return state.items.map((item) => ({
    id: item.id,
    kind: item.kind,
    label: item.label,
    detail: item.detail,
    status: item.status,
    durationMs: Math.max(0, (item.endedAt ?? now) - item.startedAt),
  }))
}

/** 首次见到会话时从已有事件恢复当前 turn 的轨迹。 */
export function foldTrace(events, now = Date.now()) {
  let state = initialTraceState()
  if (!Array.isArray(events)) return state
  for (const event of events) {
    if (event?.type === 'turn/start') state = startTraceTurn(event.data, event.time ?? now)
    else applyTraceEvent(state, event, event?.time ?? now)
  }
  return state
}

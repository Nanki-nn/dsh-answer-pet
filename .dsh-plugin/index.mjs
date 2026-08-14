// dsh-answer-pet Node half：把会话事件（session/event）折叠成「回答进度」并对外服务。
// 契约：官方 bundle 插件的 Node half（完整 Cordis 插件，仓库根 package.json 的 dsh.bundle/dsh.client）。
// 事件源：ctx.on('session/event', (session, event) => ...)——官方 Session.append 对每个
// 追加事件派发（含 assistant/chunk 流式块），见 dsh-session SessionEventMap。
// 路由（webServer）：GET /answer-pet/state（轮询视图）、GET /answer-pet/events（SSE 即时通知）、
// GET /answer-pet/config（配置+修订号）。webServer 缺席时降级为无 UI（进度只进不出的插件无意义，
// 但仍不抛错——保持与宿主组合宽容）。
// SSE 只广播「阶段边沿」（turn/step/tool/done），token 级平滑更新由 client 轮询 /state
// （pollMs 默认 800ms）承担——避免 chunk 洪水打爆 EventSource。
// 多会话：按 sessionId 分桶跟踪；/state 返回最近活跃会话的视图（任一会话回答中即显示）。
import { NAMESPACE, DEFAULTS, buildSchema, validateConfig } from './src/config.mjs'
import { initialProgressState, startTurn, applyEvent, deriveView } from './src/progress.mjs'
import { foldSessionMeta } from './src/session-meta.mjs'
import { initialTraceState, startTraceTurn, applyTraceEvent, deriveTrace, foldTrace } from './src/trace.mjs'
import { STATE_PATH, EVENTS_PATH, CONFIG_PATH } from './src/routes.mjs'

export const name = 'dsh-answer-pet'
export const inject = ['settings', 'webServer']
export { STATE_PATH, EVENTS_PATH, CONFIG_PATH }

function json(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extra })
  res.end(JSON.stringify(body))
}

export function apply(ctx) {
  // ---- 配置（体验层）：settings 条件接入——缺失时回退 DEFAULTS ----
  let configRef = { ...DEFAULTS }
  let configRevision = 0
  const settings = typeof ctx.get === 'function' ? ctx.get('settings') : undefined
  const applyConfig = (next) => {
    configRef = { ...DEFAULTS, ...next }
    configRevision += 1
  }
  if (settings !== undefined && typeof settings.register === 'function') {
    try {
      const scope = settings.register(NAMESPACE, buildSchema(), { applies: 'live', validate: validateConfig })
      applyConfig(scope.get())
      scope.watch((next) => applyConfig(next))
    } catch {
      // register 失败（如重复注册）→ 保持 DEFAULTS
    }
  }

  // ---- 会话进度分桶 + 会话元数据（title/running）----
  const sessions = new Map() // sessionId → 进度状态
  const metas = new Map()    // sessionId → { title, running }
  const traces = new Map()   // sessionId → 最近阶段/工具轨迹
  let lastActiveId = null
  let lastActiveAt = 0
  const touch = (id, state, meta) => {
    sessions.set(id, state)
    metas.set(id, meta)
    lastActiveId = id
    lastActiveAt = Date.now()
  }
  const current = () => {
    // 最近活跃会话；2 分钟无事件视为回到 idle（不清理桶，会话可能续接）。
    if (lastActiveId !== null && Date.now() - lastActiveAt < 120_000) {
      return {
        id: lastActiveId,
        state: sessions.get(lastActiveId),
        meta: metas.get(lastActiveId) ?? { title: null, running: false },
        trace: traces.get(lastActiveId) ?? initialTraceState(),
      }
    }
    return null
  }

  // ---- SSE 即时通知（阶段边沿才广播）----
  const sseClients = new Set()
  const broadcastEvent = () => {
    const line = 'data: {"type":"event"}\n\n'
    for (const res of sseClients) {
      try { res.write(line) } catch { sseClients.delete(res) }
    }
  }

  // ---- 事件订阅 ----
  // 阶段边沿集合：这些事件才触发 SSE（token 平滑由轮询承担）。
  const EDGE_TYPES = new Set([
    'turn/start', 'step/start', 'tool/call', 'tool/result',
    'tool/code-dispatch-start', 'tool/code-dispatch', 'step/end', 'turn/end',
  ])
  ctx.on('session/event', (session, event) => {
    const id = typeof session?.id === 'string' ? session.id : null
    if (id === null || event === null || typeof event !== 'object') return
    // 会话元数据：首次见到折叠 seed（title/running，seed 不派发事件，只能从日志读），
    // 之后按 turn/start · turn/end · session/title 增量维护。
    let meta = metas.get(id)
    if (meta === undefined) {
      meta = foldSessionMeta(typeof session === 'object' && session !== null ? session.events : undefined)
      metas.set(id, meta)
    }
    let trace = traces.get(id)
    if (trace === undefined) {
      // session/event 在 append 后派发，seed 时只折叠当前事件之前的历史，避免首条事件重复。
      const seed = Array.isArray(session?.events)
        ? session.events.filter((item) => item !== event && (
          typeof item?.seq !== 'number' || typeof event.seq !== 'number' || item.seq < event.seq
        ))
        : []
      trace = foldTrace(seed, event.time ?? Date.now())
      traces.set(id, trace)
    }
    if (event.type === 'turn/start') {
      meta.running = true
      const now = event.time ?? Date.now()
      const fresh = startTurn(event.data, now)
      trace = startTraceTurn(event.data, now)
      traces.set(id, trace)
      touch(id, fresh, meta)
      broadcastEvent()
      return
    }
    if (event.type === 'turn/end') {
      meta.running = false
    } else if (event.type === 'session/title' && typeof event.data?.title === 'string') {
      meta.title = event.data.title
    }
    let state = sessions.get(id)
    if (state === undefined) {
      // 未跟踪会话（可能监听前已在跑）：以 idle 基线起步，仅应用可理解的事件。
      state = initialProgressState()
      touch(id, state, meta)
    }
    const before = state.phase
    const now = event.time ?? Date.now()
    applyEvent(state, event, now)
    applyTraceEvent(trace, event, now)
    if (state.phase !== before || event.type === 'assistant/chunk') {
      // chunk 也算活跃——更新时间戳（避免活跃会话被 2 分钟窗误判）
      lastActiveAt = Date.now()
    }
    if (EDGE_TYPES.has(event.type)) broadcastEvent()
  })

  // ---- 路由 ----
  const webServer = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined
  ctx.effect(() => {
    const disposers = []
    if (webServer !== undefined) {
      disposers.push(
        webServer.register({
          kind: 'exact',
          path: STATE_PATH,
          handler: async (req, res) => {
            try {
              if (req.method !== 'GET') {
                json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
                return
              }
              const cur = current()
              const running = []
              for (const [id, m] of metas) {
                if (m.running !== true) continue
                const state = sessions.get(id)
                running.push({
                  id,
                  title: m.title,
                  view: deriveView(state ?? initialProgressState()),
                  trace: deriveTrace(traces.get(id) ?? initialTraceState()),
                })
              }
              json(res, 200, {
                view: deriveView(cur !== null ? cur.state : initialProgressState()),
                trace: deriveTrace(cur !== null ? cur.trace : initialTraceState()),
                session: cur !== null ? { id: cur.id, title: cur.meta.title, running: cur.meta.running } : null,
                running,
                active: cur !== null,
                configRevision,
              }, { 'cache-control': 'no-store' })
            } catch (error) {
              json(res, 500, { error: error instanceof Error ? error.message : String(error) })
            }
          },
        }),
        webServer.register({
          kind: 'exact',
          path: CONFIG_PATH,
          handler: async (req, res) => {
            try {
              if (req.method !== 'GET') {
                json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
                return
              }
              json(res, 200, { config: configRef, revision: configRevision }, { 'cache-control': 'no-store' })
            } catch (error) {
              json(res, 500, { error: error instanceof Error ? error.message : String(error) })
            }
          },
        }),
        webServer.register({
          kind: 'exact',
          path: EVENTS_PATH,
          handler: async (req, res) => {
            if (req.method !== 'GET') {
              res.writeHead(405)
              res.end()
              return
            }
            res.writeHead(200, {
              'content-type': 'text/event-stream',
              'cache-control': 'no-cache',
              connection: 'keep-alive',
              'x-accel-buffering': 'no',
            })
            if (typeof res.flushHeaders === 'function') res.flushHeaders()
            res.write('retry: 3000\n\n')
            sseClients.add(res)
            let heartbeat = null
            if (typeof res.on === 'function') {
              res.on('close', () => {
                clearInterval(heartbeat)
                sseClients.delete(res)
              })
            }
            heartbeat = setInterval(() => {
              try { res.write(': ping\n\n') } catch { /* 断连由 close 清理 */ }
            }, 25000)
          },
        }),
      )
    }
    return () => {
      for (const dispose of disposers) dispose()
      sseClients.clear()
    }
  }, 'dsh-answer-pet: state/config/events routes + session event tracking')
}

// 会话元数据折叠纯逻辑：从会话事件日志推导 { title, running }（零宿主依赖、可单测）。
// 契约：
// - title：`session/title` 事件的 data.title（last-wins 折叠）。
// - running：turn 边沿折叠——seed 日志里最后一个 turn 边界决定初始 running；
//   增量维护由宿主按 turn/start / turn/end 翻转（本模块只负责 seed 折叠）。
export function foldSessionMeta(events) {
  let title = null
  let running = false
  if (Array.isArray(events)) {
    for (const e of events) {
      if (e === null || typeof e !== 'object') continue
      if (e.type === 'session/title' && typeof e.data?.title === 'string') {
        title = e.data.title
      } else if (e.type === 'turn/start') {
        running = true
      } else if (e.type === 'turn/end') {
        running = false
      }
    }
  }
  return { title, running }
}

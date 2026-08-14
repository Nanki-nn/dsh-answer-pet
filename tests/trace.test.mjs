import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_TRACE_ITEMS,
  initialTraceState,
  startTraceTurn,
  applyTraceEvent,
  deriveTrace,
  foldTrace,
  summarizeToolArguments,
} from '../.dsh-plugin/src/trace.mjs'

const t0 = 1_700_000_000_000
const ev = (type, data = {}, time = t0) => ({ type, seq: 0, time, data })

test('阶段轨迹按 step/reason/answer 折叠且 chunk 不重复', () => {
  const s = startTraceTurn({ turn: 1 }, t0)
  applyTraceEvent(s, ev('step/start', { turn: 1, step: 0 }, t0 + 10), t0 + 10)
  applyTraceEvent(s, ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'reasoning-delta', text: 'a' } }, t0 + 20), t0 + 20)
  applyTraceEvent(s, ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'reasoning-delta', text: 'b' } }, t0 + 30), t0 + 30)
  applyTraceEvent(s, ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'text-delta', text: 'answer' } }, t0 + 40), t0 + 40)
  const trace = deriveTrace(s, t0 + 50)
  assert.deepEqual(trace.map((item) => item.label), ['开始处理请求', '分析任务', '推理与规划', '组织回答'])
  assert.equal(trace.at(-1).status, 'running')
  assert.equal(trace.at(-2).status, 'done')
})

test('工具调用展示工具名和安全描述，结果更新状态与耗时', () => {
  const s = startTraceTurn({ turn: 1 }, t0)
  applyTraceEvent(s, ev('tool/call', {
    turn: 1,
    step: 0,
    callId: 'c1',
    name: 'grep',
    arguments: JSON.stringify({ pattern: 'SessionEvent', command: 'secret-token' }),
  }, t0 + 100), t0 + 100)
  let trace = deriveTrace(s, t0 + 600)
  assert.equal(trace.at(-1).label, '调用 grep')
  assert.equal(trace.at(-1).detail, 'SessionEvent')
  assert.equal(trace.at(-1).status, 'running')
  assert.equal(JSON.stringify(trace).includes('secret-token'), false)

  applyTraceEvent(s, ev('tool/result', { callId: 'c1', message: {} }, t0 + 1100), t0 + 1100)
  trace = deriveTrace(s, t0 + 1200)
  assert.equal(trace.at(-1).status, 'done')
  assert.equal(trace.at(-1).durationMs, 1000)
})

test('工具失败和嵌套 code dispatch 可配对', () => {
  const s = initialTraceState()
  applyTraceEvent(s, ev('tool/code-dispatch-start', {
    subCallId: 'sub1', name: 'read', arguments: { file_path: 'src/app.mjs' },
  }, t0), t0)
  applyTraceEvent(s, ev('tool/code-dispatch', { subCallId: 'sub1', isError: true }, t0 + 50), t0 + 50)
  const item = deriveTrace(s, t0 + 100).at(-1)
  assert.equal(item.label, '调用 read')
  assert.equal(item.detail, 'src/app.mjs')
  assert.equal(item.status, 'error')
})

test('参数摘要只读取白名单字段并截断', () => {
  assert.equal(summarizeToolArguments('{"command":"rm -rf /"}'), null)
  assert.equal(summarizeToolArguments({ description: '执行测试', command: 'hidden' }), '执行测试')
  assert.ok(summarizeToolArguments({ query: 'x'.repeat(200) }).endsWith('…'))
})

test('轨迹最多保留最近 MAX_TRACE_ITEMS 条', () => {
  const s = startTraceTurn({ turn: 1 }, t0)
  for (let step = 0; step < 10; step += 1) {
    applyTraceEvent(s, ev('step/start', { turn: 1, step }, t0 + step + 1), t0 + step + 1)
  }
  assert.equal(deriveTrace(s, t0 + 20).length, MAX_TRACE_ITEMS)
})

test('foldTrace 从历史事件恢复当前轨迹', () => {
  const events = [
    ev('turn/start', { turn: 2 }, t0),
    ev('step/start', { turn: 2, step: 0 }, t0 + 10),
    ev('tool/call', { turn: 2, step: 0, callId: 'c2', name: 'web_search', arguments: '{"query":"DSH"}' }, t0 + 20),
  ]
  const trace = deriveTrace(foldTrace(events, t0 + 30), t0 + 30)
  assert.equal(trace.at(-1).label, '调用 web_search')
  assert.equal(trace.at(-1).status, 'running')
})

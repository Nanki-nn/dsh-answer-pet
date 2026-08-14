// 回答进度推导逻辑单测：覆盖阶段机、token 估算/usage 权威值、速率 EMA、进度单调性。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  initialProgressState, startTurn, applyEvent, computeProgress, deriveView,
  estimateTokens, PHASES, PHASE_LABELS,
} from '../.dsh-plugin/src/progress.mjs'

const t0 = 1_000_000_000_000
const ev = (type, data = {}, time = t0) => ({ type, seq: 0, time, data })

test('初始状态是 idle，进度 0', () => {
  const s = initialProgressState()
  assert.equal(s.phase, 'idle')
  assert.equal(computeProgress(s), 0)
})

test('turn/start 重置回合态并进入 turn 阶段', () => {
  const s = startTurn({ turn: 3 }, t0)
  assert.equal(s.phase, 'turn')
  assert.equal(s.turn, 3)
  assert.equal(s.startedAt, t0)
  assert.equal(s.progress, 0)
})

test('step/start → think；think 随时间微涨但封顶 10', () => {
  let s = startTurn({ turn: 1 }, t0)
  s = applyEvent(s, ev('step/start', { turn: 1, step: 0 }), t0)
  assert.equal(s.phase, 'think')
  assert.equal(computeProgress(s, t0), 5) // 0s → 5%
  const p5 = computeProgress(s, t0 + 5_000) // 5s → 7.5
  assert.equal(p5, 7.5)
  const p60 = computeProgress(s, t0 + 60_000) // 60s → 封顶 10
  assert.equal(p60, 10)
})

test('chunk 流式：文本 delta 估算 token，进度单调填充', () => {
  let s = startTurn({ turn: 1 }, t0)
  s = applyEvent(s, ev('step/start', { turn: 1, step: 0 }), t0)
  s = applyEvent(s, ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'text-delta', index: 0, text: '你好世界Hello' } }), t0)
  assert.equal(s.phase, 'stream')
  assert.equal(s.estOutputTokens, estimateTokens('你好世界Hello'.length))
  const p = computeProgress(s, t0)
  assert.ok(p > 10 && p < 90, `stream 进度应在 (10,90)，实际 ${p}`)
  // 更多 token → 进度不倒退
  s = applyEvent(s, ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'text-delta', index: 0, text: 'x'.repeat(400) } }), t0 + 100)
  const p2 = computeProgress(s, t0 + 100)
  assert.ok(p2 >= p, '进度必须单调不减')
})

test('maxTokens 已知时按 out/max 填充；unknown 时用饱和曲线', () => {
  let s = startTurn({ turn: 1 }, t0)
  s = applyEvent(s, ev('step/start', { turn: 1, step: 0 }), t0)
  s = applyEvent(s, ev('request/header', { header: {}, config: { maxTokens: 1000 } }), t0)
  s = applyEvent(s, ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'text-delta', index: 0, text: 'x'.repeat(1000) } }), t0)
  // est = 250/1000 = 25% → 10+80*0.25 = 30
  assert.equal(computeProgress(s, t0), 30)
})

test('usage 事件提供权威 token 计数（含 cache 读/写）', () => {
  let s = startTurn({ turn: 1 }, t0)
  s = applyEvent(s, ev('assistant/chunk', {
    turn: 1, step: 0,
    chunk: { type: 'usage', usage: { inputTokens: 100, outputTokens: 500, cacheReadTokens: 40, cacheWriteTokens: 10 } },
  }), t0)
  assert.equal(s.usageOutputTokens, 500)
  assert.equal(s.inputTokens, 150)
  const view = deriveView(s, t0)
  assert.equal(view.outputTokens, 500) // 权威值优先于估算
  assert.equal(view.hasUsage, true)
})

test('tool/call → tool 冻结进度，tool/result 回到 stream', () => {
  let s = startTurn({ turn: 1 }, t0)
  s = applyEvent(s, ev('step/start', { turn: 1, step: 0 }), t0)
  s = applyEvent(s, ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'text-delta', index: 0, text: 'x'.repeat(400) } }), t0)
  const before = computeProgress(s, t0)
  s = applyEvent(s, ev('tool/call', { turn: 1, step: 0, callId: 'c1', name: 'bash', arguments: '{}' }), t0)
  assert.equal(s.phase, 'tool')
  assert.equal(s.toolName, 'bash')
  const during = computeProgress(s, t0 + 5000)
  assert.equal(during, before, 'tool 阶段冻结进度')
  s = applyEvent(s, ev('tool/result', { turn: 1, step: 0, callId: 'c1', message: {} }), t0 + 6000)
  assert.equal(s.phase, 'stream')
})

test('turn/end → done 100%；reason.kind 透传', () => {
  let s = startTurn({ turn: 1 }, t0)
  s = applyEvent(s, ev('turn/end', { turn: 1, reason: { kind: 'completed' } }), t0 + 5000)
  assert.equal(s.phase, 'done')
  assert.equal(s.endReason, 'completed')
  assert.equal(computeProgress(s), 100)
  // blocked 结束同样 100（回合结束，进度条收满）
  s = startTurn({ turn: 2 }, t0)
  s = applyEvent(s, ev('turn/end', { turn: 2, reason: { kind: 'blocked' } }), t0 + 5000)
  assert.equal(s.endReason, 'blocked')
})

test('速率 EMA：2s 窗口内的 delta 计入，跨请求间隔不计', () => {
  let s = startTurn({ turn: 1 }, t0)
  s = applyEvent(s, ev('step/start', { turn: 1, step: 0 }), t0)
  // 首个 chunk 无前序采样点，不建立速率（避免 dt=0 污染）
  s = applyEvent(s, ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'text-delta', index: 0, text: 'x'.repeat(40) } }), t0)
  assert.equal(s.rate, 0)
  // 第二个 chunk：400 字符 ≈ 100 tok，0.5s → 200 tok/s
  s = applyEvent(s, ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'text-delta', index: 0, text: 'x'.repeat(400) } }), t0 + 500)
  assert.ok(s.rate > 150 && s.rate < 250, `rate=${s.rate}`)
  // 间隔 >2s：不更新速率
  const r = s.rate
  s = applyEvent(s, ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'text-delta', index: 0, text: 'x'.repeat(400) } }), t0 + 10_000)
  assert.equal(s.rate, r)
})

test('非进度事件不改动状态（幂等）', () => {
  let s = startTurn({ turn: 1 }, t0)
  const before = JSON.stringify(s)
  s = applyEvent(s, ev('user/message', { content: 'hi' }), t0)
  s = applyEvent(s, ev('compaction/start', {}), t0)
  s = applyEvent(s, ev('todo/write', { todos: [] }), t0)
  assert.equal(JSON.stringify(s), before)
})

test('PHASE_LABELS 覆盖全部阶段', () => {
  for (const p of Object.values(PHASES)) {
    assert.ok(typeof PHASE_LABELS[p] === 'string' && PHASE_LABELS[p].length > 0, `缺 label: ${p}`)
  }
})

// 会话元数据折叠单测：title last-wins、turn 边界 running 判定、脏事件容错。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { foldSessionMeta } from '../.dsh-plugin/src/session-meta.mjs'

const ev = (type, data = {}) => ({ type, seq: 0, time: 0, data })

test('无事件 → title null、running false', () => {
  const m = foldSessionMeta([])
  assert.equal(m.title, null)
  assert.equal(m.running, false)
})

test('session/title last-wins 折叠', () => {
  const m = foldSessionMeta([
    ev('session/title', { title: '旧标题' }),
    ev('session/title', { title: '新标题' }),
  ])
  assert.equal(m.title, '新标题')
})

test('turn 边界：seed 内打开的 turn → running true', () => {
  const m = foldSessionMeta([
    ev('turn/start', { turn: 1 }),
    ev('step/start', { turn: 1, step: 0 }),
    ev('assistant/chunk', { turn: 1, step: 0, chunk: { type: 'text-delta', index: 0, text: 'x' } }),
  ])
  assert.equal(m.running, true)
})

test('turn 边界：已闭合的 turn → running false', () => {
  const m = foldSessionMeta([
    ev('turn/start', { turn: 1 }),
    ev('turn/end', { turn: 1, reason: { kind: 'completed' } }),
    ev('turn/start', { turn: 2 }),
    ev('turn/end', { turn: 2, reason: { kind: 'completed' } }),
  ])
  assert.equal(m.running, false)
})

test('脏事件容错（null / 非对象 / 缺 data）', () => {
  const m = foldSessionMeta([null, 'junk', ev('session/title', {}), ev('turn/end', undefined)])
  assert.equal(m.title, null)
  assert.equal(m.running, false)
})

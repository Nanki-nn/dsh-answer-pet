import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { DEFAULTS, BUILTIN_THEME_IDS, buildSchema, validateConfig } from '../.dsh-plugin/src/config.mjs'

const runtimeSource = readFileSync(new URL('../.dsh-plugin/client/themes/runtime.mjs', import.meta.url), 'utf8')
const whaleSource = readFileSync(new URL('../.dsh-plugin/client/themes/blue-whale.mjs', import.meta.url), 'utf8')
const catSource = readFileSync(new URL('../.dsh-plugin/client/themes/orange-cat.mjs', import.meta.url), 'utf8')
const silverCatPng = readFileSync(new URL('../assets/silver-shaded-cat-cropped.png', import.meta.url)).toString('base64')
const silverCatSource = readFileSync(new URL('../.dsh-plugin/client/themes/silver-shaded-cat.mjs', import.meta.url), 'utf8')
  .replace('__AP_SILVER_CAT_PNG_BASE64__', silverCatPng)

function runtime() {
  const context = {}
  runInNewContext(`${runtimeSource}\nglobalThis.themeApi={PET_THEME_API_VERSION,PET_PHASES,validatePetTheme,registerPetTheme,resolvePetTheme,petPhaseMeta,petThemeCss};`, context)
  return context.themeApi
}

function fixture(id = 'blue-whale') {
  const phases = {}
  for (const phase of ['idle', 'turn', 'think', 'stream', 'tool', 'done', 'error']) {
    phases[phase] = { animation: phase === 'turn' ? 'think' : phase, bubble: phase === 'stream' ? null : phase }
  }
  return {
    apiVersion: 1,
    id,
    name: id,
    aspectRatio: 1.5,
    markup: '<svg class="ap-pet-svg" viewBox="0 0 1 1"></svg>',
    css: `[data-answer-pet][data-ap-theme="${id}"]{color:red}`,
    phases,
  }
}

test('PetTheme v1 接受完整声明式主题', () => {
  const api = runtime()
  const theme = fixture()
  assert.equal(api.validatePetTheme(theme), theme)
  assert.equal(api.PET_THEME_API_VERSION, 1)
  assert.deepEqual(Array.from(api.PET_PHASES), ['idle', 'turn', 'think', 'stream', 'tool', 'done', 'error'])
})

test('PetTheme 拒绝非法 id、API 版本和缺失阶段', () => {
  const api = runtime()
  assert.throws(() => api.validatePetTheme({ ...fixture(), id: 'Bad Theme' }), /id/)
  assert.throws(() => api.validatePetTheme({ ...fixture(), apiVersion: 2 }), /apiVersion/)
  const missing = fixture()
  delete missing.phases.tool
  assert.throws(() => api.validatePetTheme(missing), /phases\.tool/)
})

test('PetTheme 拒绝危险 SVG、外部资源和未限定作用域的 CSS', () => {
  const api = runtime()
  assert.throws(() => api.validatePetTheme({ ...fixture(), markup: '<svg class="ap-pet-svg"><script>alert(1)</script></svg>' }), /危险/)
  assert.throws(() => api.validatePetTheme({ ...fixture(), markup: '<svg class="ap-pet-svg" onload="alert(1)"></svg>' }), /危险/)
  assert.throws(() => api.validatePetTheme({ ...fixture(), markup: '<svg class="ap-pet-svg"><image href="https://x/cat.png"/></svg>' }), /image/)
  assert.throws(() => api.validatePetTheme({ ...fixture(), markup: '<svg class="ap-pet-svg"><image href="data:image/png;base64,iVBORw0KGgo="/></svg>' }), /trustedRaster/)
  assert.throws(() => api.validatePetTheme({ ...fixture(), trustedRaster: true, markup: '<svg class="ap-pet-svg"><image href="data:image/svg+xml;base64,PHN2Zz4="/></svg>' }), /PNG/)
  assert.throws(() => api.validatePetTheme({ ...fixture(), css: 'body { display: none }' }), /scope/)
  assert.throws(() => api.validatePetTheme({ ...fixture(), css: '[data-answer-pet][data-ap-theme="blue-whale"]{background:url(https://x)}' }), /外部资源/)
})

test('PetTheme 只允许显式可信主题内嵌一张 PNG', () => {
  const api = runtime()
  const theme = {
    ...fixture('trusted-cat'),
    trustedRaster: true,
    markup: '<svg class="ap-pet-svg"><image href="data:image/png;base64,iVBORw0KGgo="/></svg>',
    css: '[data-answer-pet][data-ap-theme="trusted-cat"]{color:red}',
  }
  assert.equal(api.validatePetTheme(theme), theme)
  assert.throws(() => api.validatePetTheme({ ...theme, markup: `${theme.markup}<image href="data:image/png;base64,iVBORw0KGgo="/>` }), /一张 image/)
})

test('主题注册表拒绝重复，并对未知主题回退蓝鲸', () => {
  const api = runtime()
  const whale = api.registerPetTheme(fixture('blue-whale'))
  const cat = api.registerPetTheme(fixture('orange-cat'))
  assert.equal(api.resolvePetTheme('orange-cat'), cat)
  assert.equal(api.resolvePetTheme('not-installed'), whale)
  assert.equal(Object.isFrozen(cat), true)
  assert.equal(Object.isFrozen(cat.phases), true)
  assert.equal(Object.isFrozen(cat.phases.idle), true)
  assert.throws(() => api.registerPetTheme(fixture('orange-cat')), /重复注册/)
})

test('未知 phase 使用 idle 元数据，CSS 汇总全部主题', () => {
  const api = runtime()
  const whale = api.registerPetTheme(fixture('blue-whale'))
  api.registerPetTheme(fixture('orange-cat'))
  assert.equal(api.petPhaseMeta(whale, 'unknown').bubble, 'idle')
  assert.match(api.petThemeCss(), /blue-whale/)
  assert.match(api.petThemeCss(), /orange-cat/)
})

test('实际内置蓝鲸、橘猫和银渐层猫均通过契约注册', () => {
  const context = {}
  runInNewContext(`${runtimeSource}\n${whaleSource}\n${catSource}\n${silverCatSource}\nglobalThis.result={ids:Array.from(PET_THEME_REGISTRY.keys()),css:petThemeCss()};`, context)
  assert.deepEqual(Array.from(context.result.ids), ['blue-whale', 'orange-cat', 'silver-shaded-cat'])
  assert.match(context.result.css, /ap-whale-tail/)
  assert.match(context.result.css, /ap-cat-tail/)
  assert.match(context.result.css, /ap-silver-cat-art/)
})

test('配置 schema 支持猫主题并拒绝未知主题', () => {
  const schema = buildSchema()
  assert.equal(schema({}).theme, 'blue-whale')
  assert.equal(schema({ theme: 'orange-cat' }).theme, 'orange-cat')
  assert.equal(schema({ theme: 'silver-shaded-cat' }).theme, 'silver-shaded-cat')
  assert.throws(() => schema({ theme: 'unknown-pet' }), /expected/)
  assert.doesNotThrow(() => validateConfig({ theme: 'orange-cat' }))
  assert.doesNotThrow(() => validateConfig({ theme: 'silver-shaded-cat' }))
  assert.throws(() => validateConfig({ theme: 'unknown-pet' }), /未安装/)
})

test('配置默认蓝鲸并公开三个内置主题 id', () => {
  assert.equal(DEFAULTS.theme, 'blue-whale')
  assert.deepEqual(Array.from(BUILTIN_THEME_IDS), ['blue-whale', 'orange-cat', 'silver-shaded-cat'])
})

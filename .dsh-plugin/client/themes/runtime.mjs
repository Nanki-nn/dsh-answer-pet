// PetTheme v1 浏览器运行时：声明式内置主题注册、校验、回退与阶段元数据解析。
// 主题模块不得访问宿主会话事件；只接收归一化 phase/view，并通过 data 属性驱动 CSS。

const PET_THEME_API_VERSION = 1
const PET_PHASES = Object.freeze(['idle', 'turn', 'think', 'stream', 'tool', 'done', 'error'])
const PET_PHASE_SET = new Set(PET_PHASES)
const PET_THEME_ID = /^[a-z][a-z0-9-]{0,31}$/
const PET_ANIMATION_ID = /^[a-z][a-z0-9-]{0,31}$/
const PET_THEME_REGISTRY = new Map()

function assertTheme(condition, message) {
  if (!condition) throw new TypeError(`[answer-pet theme] ${message}`)
}

function validatePetTheme(theme) {
  assertTheme(theme !== null && typeof theme === 'object' && !Array.isArray(theme), 'theme 必须是对象')
  assertTheme(theme.apiVersion === PET_THEME_API_VERSION, `apiVersion 必须为 ${PET_THEME_API_VERSION}`)
  assertTheme(typeof theme.id === 'string' && PET_THEME_ID.test(theme.id), 'id 必须是 kebab-case，最长 32 字符')
  assertTheme(typeof theme.name === 'string' && theme.name.trim().length > 0, 'name 不能为空')
  assertTheme(typeof theme.aspectRatio === 'number' && Number.isFinite(theme.aspectRatio)
    && theme.aspectRatio >= .5 && theme.aspectRatio <= 3, 'aspectRatio 必须在 0.5–3 之间')
  assertTheme(typeof theme.markup === 'string' && theme.markup.includes('<svg'), 'markup 必须包含 SVG')
  assertTheme(theme.markup.includes('ap-pet-svg'), 'SVG 根节点必须包含 ap-pet-svg 类')
  assertTheme(!/<\s*(script|foreignObject|iframe|image)\b|\son[a-z]+\s*=|javascript:|https?:\/\//i.test(theme.markup),
    'markup 包含脚本、外部资源或危险元素/属性')
  assertTheme(typeof theme.css === 'string', 'css 必须是字符串')
  assertTheme(theme.css.includes(`[data-answer-pet][data-ap-theme="${theme.id}"]`), 'css 必须限定到主题 scope')
  assertTheme(!/@import\b|url\s*\(/i.test(theme.css), 'css 不得导入或引用外部资源')
  assertTheme(theme.phases !== null && typeof theme.phases === 'object', 'phases 必须是对象')
  for (const phase of PET_PHASES) {
    const item = theme.phases[phase]
    assertTheme(item !== null && typeof item === 'object', `缺少 phases.${phase}`)
    assertTheme(typeof item.animation === 'string' && PET_ANIMATION_ID.test(item.animation),
      `phases.${phase}.animation 格式无效`)
    assertTheme(item.bubble === null || typeof item.bubble === 'string',
      `phases.${phase}.bubble 必须是字符串或 null`)
  }
  return theme
}

function registerPetTheme(theme) {
  validatePetTheme(theme)
  assertTheme(!PET_THEME_REGISTRY.has(theme.id), `主题 ${theme.id} 重复注册`)
  const phases = {}
  for (const phase of PET_PHASES) phases[phase] = Object.freeze({ ...theme.phases[phase] })
  const frozen = Object.freeze({ ...theme, phases: Object.freeze(phases) })
  PET_THEME_REGISTRY.set(theme.id, frozen)
  return frozen
}

function resolvePetTheme(id, fallbackId = 'blue-whale') {
  if (typeof id === 'string' && PET_THEME_REGISTRY.has(id)) return PET_THEME_REGISTRY.get(id)
  const fallback = PET_THEME_REGISTRY.get(fallbackId)
  assertTheme(fallback !== undefined, `回退主题 ${fallbackId} 未注册`)
  return fallback
}

function petPhaseMeta(theme, phase) {
  const normalized = PET_PHASE_SET.has(phase) ? phase : 'idle'
  return theme.phases[normalized] ?? theme.phases.idle
}

function petThemeCss() {
  return Array.from(PET_THEME_REGISTRY.values(), (theme) => theme.css).join('\n')
}

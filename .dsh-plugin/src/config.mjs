// 配置系统：体验层配置 schema + 默认值（单一来源，消费端不得写第二份默认值）。
// 零宿主依赖、可单测。schemastery schema 供 settings.register 使用。
import z from 'schemastery'

export const NAMESPACE = 'answer-pet'
export const BUILTIN_THEME_IDS = Object.freeze(['blue-whale', 'orange-cat'])

/** 体验层默认值（数值已 clamp 到安全域）。 */
export const DEFAULTS = Object.freeze({
  theme: 'blue-whale', // 内置 PetTheme id
  size: 96,            // 宠物高度 px（48–200）
  corner: 'br',        // 停靠角：br 右下 / bl 左下 / tr 右上 / tl 左上
  opacity: 1,          // 常态透明度 0.2–1
  pollMs: 800,         // /state 轮询间隔（进度平滑度）
  showBar: true,       // 显示进度条
  showBubble: true,    // 显示状态气泡
})

/** schemastery schema（settings.register 用；默认值 = DEFAULTS，防双源漂移）。 */
export function buildSchema() {
  return z.object({
    theme: z.union(BUILTIN_THEME_IDS).default(DEFAULTS.theme),
    size: z.number().min(48).max(200).default(DEFAULTS.size),
    corner: z.union(['br', 'bl', 'tr', 'tl']).default(DEFAULTS.corner),
    opacity: z.number().min(0.2).max(1).default(DEFAULTS.opacity),
    pollMs: z.number().min(200).max(5000).default(DEFAULTS.pollMs),
    showBar: z.boolean().default(DEFAULTS.showBar),
    showBubble: z.boolean().default(DEFAULTS.showBubble),
  })
}

/** 跨字段校验（settings.register 的 validate 用；当前无成对约束，保留形状校验）。 */
export function validateConfig(value) {
  if (value !== null && typeof value !== 'object') throw new Error('answer-pet 配置必须是对象')
  if (typeof value?.theme === 'string' && !BUILTIN_THEME_IDS.includes(value.theme)) {
    throw new Error(`answer-pet.theme 未安装：${value.theme}`)
  }
}

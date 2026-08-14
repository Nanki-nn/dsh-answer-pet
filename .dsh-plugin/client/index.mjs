// dsh-answer-pet 浏览器 half：纯 DOM 自渲染「回答进度宠物」——DeepSeek 蓝鲸（SVG 手绘，参考用户提供的卡通鲸鱼）。
// 形态：官方 bundle client（exports {name, apply} 经 __ModuleLoader__.load 注册，client 内核
// 挂载时调用 apply(ctx)）。零平台模块依赖：CSS 内联注入，无 import/export——构建脚本只做
// 文本拼接包装（无需 esbuild）。
//
// 功能：
// - 宠物（内联 SVG 蓝鲸）：参考用户给出的圆润卡通鲸鱼——大头、米色腹纹、喷水孔、上翘尾鳍；
//   随回答阶段摆尾/喷水/眨眼，流式时快速摆尾，完成时眯眼笑。
// - 进度条：阶段权重 + token 填充（宿主推导），显示 %、输出 token、速率、耗时；流式时波纹动画；
//   顶部显示「当前运行中的对话」标题（宿主 /state 下发 session.title + running）。
// - 气泡：流式期间显示正在写的文本片段；工具阶段显示工具名。
// - 交互：拖拽移动（持久化）；点击宠物循环切换停靠角；进度条可收起（「–」按钮）。
// - 数据：轮询 GET /answer-pet/state（pollMs 默认 800ms 平滑）+ EventSource /answer-pet/events
//   （阶段边沿即时刷新，不等轮询周期）。
// - 页面感知：onboarding 激活时隐藏；dialog 打开时降为 inert（半透明不挡点击）。

const PREFIX = 'answer-pet'
const LS_POS = 'answer-pet:pos' // 拖拽位置 {x,y}
const LS_BAR = 'answer-pet:bar' // '0' 用户收起进度条
const STATE_URL = '/answer-pet/state'
const CONFIG_URL = '/answer-pet/config'
const EVENTS_URL = '/answer-pet/events'

// 与 Node half src/config.mjs DEFAULTS 保持一致（客户端默认值，服务端配置到达前兜底）。
const CFG_DEFAULTS = { size: 96, corner: 'br', opacity: 1, pollMs: 800, showBar: true, showBubble: true }
let cfg = { ...CFG_DEFAULTS }
let configRevision = 0
let barHidden = localStorage.getItem(LS_BAR) === '0'

const CSS = `
[data-${PREFIX}] { position: fixed; z-index: 2147483000; font-family: system-ui, sans-serif;
  user-select: none; touch-action: none; }
[data-${PREFIX}] .ap-stage { position: relative; width: calc(var(--ap-size, 96px) * 1.58); height: var(--ap-size, 96px);
  cursor: grab; border-radius: 14px; }
[data-${PREFIX}] .ap-stage:active { cursor: grabbing; }
[data-${PREFIX}][data-ap-dragging] .ap-stage { cursor: grabbing; }
/* ---- 蓝鲸（内联 SVG）---- */
[data-${PREFIX}] .ap-svg { display: block; width: 100%; height: 100%;
  filter: drop-shadow(0 5px 7px rgba(20,48,78,.28)); overflow: visible; }
/* 尾鳍：常态缓摆，回答时加速 */
[data-${PREFIX}] .ap-tail { transform-box: fill-box; transform-origin: 12% 58%;
  animation: ap-tail-wave 1.8s ease-in-out infinite; }
@keyframes ap-tail-wave { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(9deg); } }
[data-${PREFIX}][data-ap-phase="stream"] .ap-tail { animation-duration: .42s; }
[data-${PREFIX}][data-ap-phase="done"] .ap-tail { animation-duration: .55s; }
/* 侧鳍：工作/工具阶段轻拍 */
[data-${PREFIX}] .ap-fin { transform-box: fill-box; transform-origin: 18% 12%;
  animation: ap-fin-wave 1.7s ease-in-out infinite; }
@keyframes ap-fin-wave { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(8deg); } }
[data-${PREFIX}][data-ap-phase="tool"] .ap-fin,
[data-${PREFIX}][data-ap-phase="stream"] .ap-fin { animation-duration: .55s; }
/* 喷水：思考/输出时更活跃 */
[data-${PREFIX}] .ap-spout { transform-box: fill-box; transform-origin: 50% 100%;
  animation: ap-spout 2.2s ease-in-out infinite; }
@keyframes ap-spout { 0%,100% { transform: translateY(0) scaleY(.96); opacity: .8; } 50% { transform: translateY(-3px) scaleY(1.08); opacity: 1; } }
[data-${PREFIX}][data-ap-phase="stream"] .ap-spout,
[data-${PREFIX}][data-ap-phase="think"] .ap-spout { animation-duration: .75s; }
/* 眼睛：眨眼 + 瞳孔位移 */
[data-${PREFIX}] .ap-eye { transform-box: fill-box; transform-origin: center;
  animation: ap-blink 4.8s infinite; }
[data-${PREFIX}] .ap-pupil { transform-box: fill-box; transform-origin: center;
  transition: transform .18s ease; }
[data-${PREFIX}][data-ap-phase="think"] .ap-pupil,
[data-${PREFIX}][data-ap-phase="turn"] .ap-pupil { transform: translateY(-4px); }
[data-${PREFIX}][data-ap-phase="stream"] .ap-pupil,
[data-${PREFIX}][data-ap-phase="tool"] .ap-pupil { transform: translateX(3px) translateY(2px); }
[data-${PREFIX}][data-ap-phase="error"] .ap-pupil { transform: translateY(4px); }
[data-${PREFIX}][data-ap-phase="stream"] .ap-eye,
[data-${PREFIX}][data-ap-phase="done"] .ap-eye { animation: none; }
@keyframes ap-blink { 0%, 90%, 100% { transform: scaleY(1); } 93%, 97% { transform: scaleY(.08); } }
/* 鼠标轻点：只眨一次眼，不移动角色 */
[data-${PREFIX}][data-ap-click-blink] .ap-eye { animation: ap-click-blink .24s ease-in-out 1 !important; }
@keyframes ap-click-blink { 0%,100% { transform: scaleY(1); } 45%,65% { transform: scaleY(.06); } }
/* 完成态：眯眼笑 */
[data-${PREFIX}] .ap-eye-happy { display: none; }
[data-${PREFIX}][data-ap-phase="done"] .ap-eye { opacity: 0; }
[data-${PREFIX}][data-ap-phase="done"] .ap-eye-happy { display: block; }
[data-${PREFIX}][data-ap-click-blink] .ap-stage { animation-play-state: paused !important; }
[data-${PREFIX}][data-ap-click-blink] .ap-eye { opacity: 1 !important; }
[data-${PREFIX}][data-ap-click-blink] .ap-eye-happy { display: none !important; }
/* 流式时嘴角轻动 */
[data-${PREFIX}][data-ap-phase="stream"] .ap-mouth { transform-box: fill-box; transform-origin: 50% 50%;
  animation: ap-talk .38s ease-in-out infinite; }
@keyframes ap-talk { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(.72); } }
/* 阶段动作（整只鲸鱼） */
[data-${PREFIX}] .ap-stage.ap-anim-idle { animation: ap-bob 3.4s ease-in-out infinite; }
[data-${PREFIX}] .ap-stage.ap-anim-think { animation: ap-think 2.2s ease-in-out infinite; }
[data-${PREFIX}] .ap-stage.ap-anim-stream { animation: ap-type .9s ease-in-out infinite; }
[data-${PREFIX}] .ap-stage.ap-anim-tool { animation: ap-shake .5s linear infinite; }
[data-${PREFIX}] .ap-stage.ap-anim-done { animation: ap-jump .7s ease-in-out 2; }
[data-${PREFIX}] .ap-stage.ap-anim-error { animation: ap-wobble .6s ease-in-out 2; }
@keyframes ap-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes ap-think { 0%,100% { transform: translateY(0) rotate(0); } 30% { transform: translateY(-2px) rotate(-2deg); } 60% { transform: translateY(-1px) rotate(2deg); } }
@keyframes ap-type { 0%,100% { transform: translateY(0) scale(1); } 30% { transform: translateY(-3px) scale(1.02,.98); } 60% { transform: translateY(-1px) scale(.99,1.01); } }
@keyframes ap-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px) rotate(-2deg); } 75% { transform: translateX(3px) rotate(2deg); } }
@keyframes ap-jump { 0%,100% { transform: translateY(0); } 35% { transform: translateY(-14px) rotate(-6deg); } 70% { transform: translateY(-6px) rotate(4deg); } }
@keyframes ap-wobble { 0%,100% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-4px) rotate(-4deg); } 75% { transform: translateX(4px) rotate(4deg); } }
/* 气泡 */
[data-${PREFIX}] .ap-bubble { position: absolute; left: 50%; bottom: calc(100% + 6px);
  transform: translateX(-50%); max-width: min(240px, calc(100vw - 24px));
  background: rgba(24,28,38,.94); color: #E8EBF2; font-size: 11px; line-height: 15px;
  padding: 5px 9px; border-radius: 10px; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; pointer-events: none; box-shadow: 0 6px 16px rgba(0,0,0,.3);
  opacity: 0; visibility: hidden; transition: opacity .15s ease-out, visibility 0s linear .2s; }
[data-${PREFIX}] .ap-bubble.show { opacity: 1; visibility: visible; transition-delay: 0s; }
[data-${PREFIX}] .ap-bubble::after { content: ''; position: absolute; left: 50%; bottom: -5px;
  width: 10px; height: 10px; transform: translateX(-50%) rotate(45deg);
  background: rgba(24,28,38,.94); border-bottom-left-radius: 3px; }
/* 多会话面板：每个运行中的会话一张独立圆角卡片 */
[data-${PREFIX}] .ap-bar { position: absolute; left: 50%; bottom: calc(100% + 10px);
  transform: translateX(-50%); width: min(300px, calc(100vw - 24px)); color: #E8EBF2;
  display: flex; flex-direction: column; align-items: stretch; gap: 8px; z-index: 1; }
[data-${PREFIX}] .ap-session-list { display: flex; flex-direction: column; gap: 8px; }
[data-${PREFIX}] .ap-session-card { min-width: 230px; padding: 10px 13px; border-radius: 22px;
  background: rgba(29,31,37,.94); border: 1px solid rgba(255,255,255,.13);
  box-shadow: 0 9px 24px rgba(0,0,0,.34); display: grid; gap: 5px; }
[data-${PREFIX}] .ap-session-head { display: flex; align-items: center; gap: 7px; min-width: 0; }
[data-${PREFIX}] .ap-session-dot { width: 7px; height: 7px; flex: none; border-radius: 50%;
  background: #58C98F; box-shadow: 0 0 7px rgba(88,201,143,.8); animation: ap-pulse 1.2s ease-in-out infinite; }
@keyframes ap-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
[data-${PREFIX}] .ap-session-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; color: #F3F5F8; font-size: 12px; line-height: 16px; font-weight: 700; }
[data-${PREFIX}] .ap-session-pct { flex: none; color: #9FE8C4; font-size: 12px; font-weight: 700;
  font-variant-numeric: tabular-nums; }
[data-${PREFIX}] .ap-session-status { color: #AFB7C4; font-size: 11px; line-height: 15px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
/* 模型轨迹：最近动作与工具调用，紧凑纵向时间线 */
[data-${PREFIX}] .ap-session-trace { display: grid; gap: 3px; margin: 1px 0 2px 3px;
  padding-left: 10px; border-left: 1px solid rgba(126,147,177,.3); }
[data-${PREFIX}] .ap-session-trace:empty { display: none; }
[data-${PREFIX}] .ap-trace-item { position: relative; display: grid; grid-template-columns: minmax(0,1fr) auto;
  column-gap: 7px; min-width: 0; color: #C7CED9; font-size: 10px; line-height: 14px; }
[data-${PREFIX}] .ap-trace-item::before { content: ''; position: absolute; left: -14px; top: 4px;
  width: 6px; height: 6px; border-radius: 50%; background: #778394; box-shadow: 0 0 0 2px rgba(119,131,148,.14); }
[data-${PREFIX}] .ap-trace-item[data-status="running"]::before { background: #65A0FF;
  box-shadow: 0 0 0 2px rgba(101,160,255,.16),0 0 6px rgba(101,160,255,.65); animation: ap-pulse 1.15s ease-in-out infinite; }
[data-${PREFIX}] .ap-trace-item[data-status="done"]::before { background: #58C98F; }
[data-${PREFIX}] .ap-trace-item[data-status="error"]::before { background: #F06A72; }
[data-${PREFIX}] .ap-trace-main { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
[data-${PREFIX}] .ap-trace-detail { color: #8F9AAA; }
[data-${PREFIX}] .ap-trace-time { color: #7F8998; white-space: nowrap; font-variant-numeric: tabular-nums; }
[data-${PREFIX}] .ap-session-track { position: relative; height: 5px; border-radius: 6px;
  background: rgba(255,255,255,.11); overflow: hidden; }
[data-${PREFIX}] .ap-session-fill { position: absolute; inset: 0 auto 0 0; width: 0%; border-radius: 6px;
  background: linear-gradient(90deg,#58C98F,#2FB27A); box-shadow: 0 0 7px rgba(88,201,143,.5);
  transition: width .45s cubic-bezier(.22,1,.36,1); }
[data-${PREFIX}] .ap-session-card[data-streaming] .ap-session-fill { background: repeating-linear-gradient(90deg,
  #58C98F 0 10px,#3FBF86 10px 20px); background-size: 200% 100%; animation: ap-stripes .8s linear infinite; }
@keyframes ap-stripes { from { background-position: 0 0; } to { background-position: 40px 0; } }
/* 展开态参考图：卡片下方圆形向下按钮；折叠态：角色下方显示会话数量 */
[data-${PREFIX}] .ap-bar-hide { position: absolute; left: 50%; top: calc(100% + 5px); transform: translateX(-50%);
  width: 26px; height: 26px; border: 1px solid rgba(255,255,255,.16); border-radius: 50%;
  background: rgba(31,33,39,.95); color: #F2F4F7; font-size: 17px; line-height: 1;
  display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;
  box-shadow: 0 4px 10px rgba(0,0,0,.38); z-index: 4; }
[data-${PREFIX}] .ap-bar-hide::before { content: ''; width: 7px; height: 7px; border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor; transform: translateY(-2px) rotate(45deg); }
[data-${PREFIX}] .ap-bar-hide:hover { background: rgba(48,51,60,.98); }
[data-${PREFIX}][data-ap-collapsed] .ap-bar-hide { display: none; }
[data-${PREFIX}] .ap-collapse-count { display: none; position: absolute; left: 50%; top: calc(100% + 5px);
  transform: translateX(-50%); min-width: 26px; height: 26px; border: 1px solid rgba(255,255,255,.18);
  border-radius: 999px; padding: 0 6px; background: rgba(31,33,39,.96); color: #fff;
  font: 600 13px/1 system-ui,sans-serif; text-align: center; font-variant-numeric: tabular-nums;
  align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,.4);
  cursor: pointer; z-index: 4; box-sizing: border-box; }
[data-${PREFIX}][data-ap-collapsed] .ap-bubble { display: none !important; }
[data-${PREFIX}][data-ap-collapsed][data-ap-running] .ap-collapse-count { display: flex;
  box-shadow: 0 0 0 3px rgba(77,140,254,.12), 0 5px 14px rgba(0,0,0,.44); }
/* 页面状态 */
[data-${PREFIX}][data-ap-inert] { opacity: .25; pointer-events: none; }
[data-${PREFIX}][data-ap-hidden] { display: none; }
@media (prefers-reduced-motion: reduce) {
  [data-${PREFIX}] .ap-stage { animation: none !important; }
  [data-${PREFIX}] .ap-tail, [data-${PREFIX}] .ap-fin, [data-${PREFIX}] .ap-spout { animation: none !important; }
  [data-${PREFIX}] .ap-eye { animation: none !important; }
  [data-${PREFIX}] .ap-mouth { animation: none !important; }
  [data-${PREFIX}] .ap-bar-fill { transition: none; }
}
`

// 蓝鲸 SVG：viewBox 0 0 200 120。参考用户提供的卡通鲸鱼：圆润大头、米色腹纹、喷水孔、
// 上翘双叶尾鳍与侧鳍。所有表情状态由 CSS 按 data-ap-phase 驱动。
const WHALE_SVG = `
<svg class="ap-svg" viewBox="0 0 200 120" aria-hidden="true">
  <defs>
    <linearGradient id="apWhaleBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#63A9D0"/>
      <stop offset=".48" stop-color="#3D86B7"/>
      <stop offset="1" stop-color="#276B9D"/>
    </linearGradient>
    <linearGradient id="apWhaleFin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#448FBE"/>
      <stop offset="1" stop-color="#245F90"/>
    </linearGradient>
    <clipPath id="apBellyClip">
      <path d="M13 70 C31 78 48 79 66 77 C86 75 99 68 109 62 C113 83 122 96 140 100 C123 111 99 116 72 114 C39 113 18 100 11 82 Z"/>
    </clipPath>
  </defs>
  <!-- 尾鳍（双叶，参考图中上翘尾巴） -->
  <g class="ap-tail">
    <path d="M153 65 C154 50 149 34 147 21 C160 27 169 38 169 50 C177 40 188 35 198 34 C195 50 184 61 169 66 C163 68 158 68 153 65 Z"
      fill="url(#apWhaleFin)" stroke="#174F7C" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M168 50 C170 55 170 61 169 66" fill="none" stroke="#72B6D8" stroke-width="2" opacity=".45"/>
  </g>
  <!-- 身体：大头、圆背、小尾根 -->
  <path d="M12 62 C12 32 39 17 74 18 C105 19 117 35 130 55 C140 71 148 76 158 68 C164 63 167 57 169 51 C172 66 168 78 158 85 C151 90 143 92 135 89 C123 106 101 114 72 114 C38 114 16 99 9 79 C7 72 8 66 12 62 Z"
    fill="url(#apWhaleBody)" stroke="#174F7C" stroke-width="3.4" stroke-linejoin="round"/>
  <!-- 背部高光 -->
  <path d="M22 54 C29 31 51 23 75 24 C96 25 108 34 118 47" fill="none"
    stroke="#91C9E4" stroke-width="3.2" stroke-linecap="round" opacity=".55"/>
  <!-- 米色腹部 -->
  <path d="M13 70 C31 78 48 79 66 77 C86 75 99 68 109 62 C113 83 122 96 140 100 C123 111 99 116 72 114 C39 113 18 100 11 82 Z"
    fill="#F3E4BC" stroke="#BFA878" stroke-width="2.6"/>
  <!-- 腹纹 -->
  <g clip-path="url(#apBellyClip)" fill="none" stroke="#BCA675" stroke-width="2.2" opacity=".72">
    <path d="M25 68 Q30 91 48 112"/>
    <path d="M39 70 Q45 95 62 115"/>
    <path d="M54 72 Q61 98 78 116"/>
    <path d="M70 72 Q78 98 94 114"/>
    <path d="M86 69 Q94 93 111 109"/>
    <path d="M101 64 Q108 84 127 102"/>
  </g>
  <!-- 侧鳍 -->
  <g class="ap-fin">
    <path d="M102 74 C111 83 121 99 122 110 C109 109 97 101 92 88 C90 82 94 76 102 74 Z"
      fill="url(#apWhaleFin)" stroke="#174F7C" stroke-width="3" stroke-linejoin="round"/>
    <path d="M101 80 C108 88 113 96 116 104" fill="none" stroke="#72B6D8" stroke-width="2" opacity=".45"/>
  </g>
  <!-- 底部小鳍 -->
  <path d="M45 107 C43 116 45 120 51 119 C58 117 61 112 60 107 Z"
    fill="url(#apWhaleFin)" stroke="#174F7C" stroke-width="2.6"/>
  <!-- 喷水孔 + 水花 -->
  <g class="ap-spout" fill="none" stroke="#3D86B7" stroke-width="4" stroke-linecap="round">
    <path d="M58 22 C58 11 54 5 49 2"/>
    <path d="M58 21 C61 10 66 6 72 6"/>
  </g>
  <ellipse cx="58" cy="24" rx="5" ry="2.5" fill="#174F7C" opacity=".72"/>
  <!-- 眼睛 + 高光 -->
  <g class="ap-eye">
    <ellipse cx="69" cy="54" rx="12" ry="14" fill="#fff" stroke="#174F7C" stroke-width="3"/>
    <ellipse class="ap-pupil" cx="72" cy="57" rx="6" ry="7.5" fill="#16232D"/>
    <circle cx="70" cy="53" r="2.4" fill="#fff"/>
  </g>
  <g class="ap-eye-happy">
    <path d="M60 57 Q69 46 78 57" fill="none" stroke="#16232D" stroke-width="4" stroke-linecap="round"/>
  </g>
  <!-- 眉毛与笑嘴 -->
  <path d="M61 41 Q69 36 77 42" fill="none" stroke="#174F7C" stroke-width="3.2" stroke-linecap="round"/>
  <path class="ap-mouth" d="M58 70 Q68 77 79 68" fill="none" stroke="#174F7C" stroke-width="3.2" stroke-linecap="round"/>
</svg>`

const PHASE_META = {
  idle:   { anim: 'idle',   bubble: '我在这儿等你～' },
  turn:   { anim: 'think',  bubble: '收到！开始处理…' },
  think:  { anim: 'think',  bubble: '思考中…' },
  stream: { anim: 'stream', bubble: null }, // bubble = 文本片段
  tool:   { anim: 'tool',   bubble: null }, // bubble = 工具名
  done:   { anim: 'done',   bubble: '回答完成！' },
  error:  { anim: 'error',  bubble: '出错了…' },
}

function fmtTokens(n) {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
function fmtElapsed(ms) {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m${s % 60}s`
}
function phaseMeta(phase) {
  return PHASE_META[phase] ?? PHASE_META.idle
}

function apply() {
  // ---- DOM 骨架 ----
  let style = document.getElementById('answer-pet-css')
  if (style === null) {
    style = document.createElement('style')
    style.id = 'answer-pet-css'
    style.textContent = CSS
    document.head.appendChild(style)
  }
  const host = document.createElement('div')
  host.setAttribute('data-answer-pet', '')
  host.innerHTML = `
    <div class="ap-stage">
      ${WHALE_SVG}
      <div class="ap-bubble"></div>
      <button class="ap-collapse-count" title="展开进度条" aria-label="展开进度条">0</button>
      <button class="ap-bar-hide" title="收起会话面板" aria-label="收起会话面板"></button>
    </div>
    <div class="ap-bar"><div class="ap-session-list"></div></div>`
  document.body.appendChild(host)
  const stage = host.querySelector('.ap-stage')
  const bubble = host.querySelector('.ap-bubble')
  const bar = host.querySelector('.ap-bar')
  const sessionList = host.querySelector('.ap-session-list')
  const hideBtn = host.querySelector('.ap-bar-hide')
  const collapseCount = host.querySelector('.ap-collapse-count')

  let pollTimer = null
  let sse = null
  let posSaved = localStorage.getItem(LS_POS)

  // ---- 配置 ----
  const applyConfig = (next, revision) => {
    if (revision !== undefined) configRevision = revision
    cfg = { ...CFG_DEFAULTS, ...next }
    host.style.setProperty('--ap-size', `${cfg.size}px`)
    host.style.opacity = String(cfg.opacity)
    applyPosition()
    applyBarVisibility()
  }
  const loadConfig = () => {
    fetch(CONFIG_URL).then((r) => r.ok ? r.json() : Promise.reject()).then((j) => {
      applyConfig(j.config, j.revision)
    }).catch(() => { /* 配置端点不可用：保持默认 */ })
  }

  // ---- 位置 ----
  // 折叠/展开不改变角色几何尺寸，避免点击后跳位或缩放。
  const petWidth = () => cfg.size * 1.58
  const petHeight = () => cfg.size
  const clampX = (x) => Math.max(0, Math.min(x, window.innerWidth - petWidth() - 4))
  const clampY = (y) => Math.max(0, Math.min(y, window.innerHeight - petHeight() - 45))
  function applyPosition() {
    if (posSaved !== null) {
      try {
        const p = JSON.parse(posSaved)
        host.style.left = `${clampX(p.x)}px`
        host.style.top = `${clampY(p.y)}px`
        return
      } catch { posSaved = null }
    }
    const m = 16
    const x = cfg.corner === 'br' || cfg.corner === 'tr' ? window.innerWidth - petWidth() - m : m
    const y = cfg.corner === 'br' || cfg.corner === 'bl' ? window.innerHeight - petHeight() - m - 35 : m
    host.style.left = `${x}px`
    host.style.top = `${y}px`
  }

  // ---- 拖拽 ----
  let drag = null
  let clickBlinkTimer = null
  const onPointerDown = (e) => {
    if (e.button !== 0) return
    drag = { sx: e.clientX, sy: e.clientY, ox: host.offsetLeft, oy: host.offsetTop, moved: false, id: e.pointerId }
    stage.setPointerCapture(e.pointerId)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerup', onPointerUp)
    stage.addEventListener('pointercancel', onPointerUp)
  }
  const onPointerMove = (e) => {
    if (drag === null || e.pointerId !== drag.id) return
    const dx = e.clientX - drag.sx
    const dy = e.clientY - drag.sy
    if (!drag.moved && Math.hypot(dx, dy) < 5) return
    drag.moved = true
    host.setAttribute('data-ap-dragging', '')
    host.style.left = `${clampX(drag.ox + dx)}px`
    host.style.top = `${clampY(drag.oy + dy)}px`
  }
  const onPointerUp = (e) => {
    if (drag === null || e.pointerId !== drag.id) return
    stage.releasePointerCapture(e.pointerId)
    stage.removeEventListener('pointermove', onPointerMove)
    stage.removeEventListener('pointerup', onPointerUp)
    stage.removeEventListener('pointercancel', onPointerUp)
    const moved = drag.moved
    const id = drag.id
    drag = null
    host.removeAttribute('data-ap-dragging')
    if (moved) {
      // 拖拽完成：保存位置，解除停靠角
      posSaved = JSON.stringify({ x: host.offsetLeft, y: host.offsetTop })
      localStorage.setItem(LS_POS, posSaved)
    } else if (id !== undefined) {
      // 轻点角色只眨一次眼：不展开、不切角、不移动。
      if (clickBlinkTimer !== null) clearTimeout(clickBlinkTimer)
      host.removeAttribute('data-ap-click-blink')
      requestAnimationFrame(() => {
        host.setAttribute('data-ap-click-blink', '')
        clickBlinkTimer = setTimeout(() => {
          host.removeAttribute('data-ap-click-blink')
          clickBlinkTimer = null
        }, 280)
      })
    }
  }
  stage.addEventListener('pointerdown', onPointerDown)

  // ---- 进度条收起 ----
  function applyBarVisibility() {
    const hidden = barHidden || cfg.showBar === false
    bar.style.display = hidden ? 'none' : ''
    host.toggleAttribute('data-ap-collapsed', hidden)
  }
  hideBtn.addEventListener('pointerdown', (e) => e.stopPropagation())
  hideBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    barHidden = true
    localStorage.setItem(LS_BAR, '0')
    applyBarVisibility()
  })
  collapseCount.addEventListener('pointerdown', (e) => e.stopPropagation())
  collapseCount.addEventListener('click', (e) => {
    e.stopPropagation()
    if (cfg.showBar === false) return
    barHidden = false
    localStorage.removeItem(LS_BAR)
    applyBarVisibility()
  })

  // ---- 多会话状态卡：按 session id 复用 DOM，避免轮询时闪烁 ----
  const sessionCards = new Map()
  function statusText(view) {
    const phase = view?.phase ?? 'think'
    const parts = [view?.label ?? '正在运行']
    if (view?.outputTokens > 0) parts.push(`${fmtTokens(view.outputTokens)} tok`)
    if (view?.rateTokS > 0) parts.push(`${view.rateTokS} tok/s`)
    if (Number.isFinite(view?.elapsedMs)) parts.push(fmtElapsed(view.elapsedMs))
    if (phase === 'tool' && view?.toolName) parts.push(view.toolName)
    return parts.join(' · ')
  }
  function ensureSessionCard(id) {
    let card = sessionCards.get(id)
    if (card !== undefined) return card
    const el = document.createElement('div')
    el.className = 'ap-session-card'
    el.innerHTML = `<div class="ap-session-head"><span class="ap-session-dot"></span><span class="ap-session-title"></span><span class="ap-session-pct"></span></div><div class="ap-session-status"></div><div class="ap-session-trace"></div><div class="ap-session-track"><div class="ap-session-fill"></div></div>`
    card = {
      el,
      title: el.querySelector('.ap-session-title'),
      pct: el.querySelector('.ap-session-pct'),
      status: el.querySelector('.ap-session-status'),
      trace: el.querySelector('.ap-session-trace'),
      fill: el.querySelector('.ap-session-fill'),
    }
    sessionCards.set(id, card)
    return card
  }
  function renderTrace(container, items) {
    container.replaceChildren()
    if (!Array.isArray(items)) return
    for (const item of items.slice(-4)) {
      if (item === null || typeof item !== 'object' || typeof item.label !== 'string') continue
      const row = document.createElement('div')
      row.className = 'ap-trace-item'
      row.dataset.status = typeof item.status === 'string' ? item.status : 'running'
      const main = document.createElement('span')
      main.className = 'ap-trace-main'
      main.textContent = item.label
      if (typeof item.detail === 'string' && item.detail.length > 0) {
        const detail = document.createElement('span')
        detail.className = 'ap-trace-detail'
        detail.textContent = ` · ${item.detail}`
        main.appendChild(detail)
      }
      const time = document.createElement('span')
      time.className = 'ap-trace-time'
      time.textContent = Number.isFinite(item.durationMs) ? fmtElapsed(item.durationMs) : ''
      row.append(main, time)
      container.appendChild(row)
    }
  }
  function renderSessionCards(items) {
    const alive = new Set()
    for (const item of items) {
      const id = String(item.id ?? 'current')
      alive.add(id)
      const card = ensureSessionCard(id)
      const view = item.view ?? {}
      const progress = Math.min(100, Math.max(0, view.progress ?? 5))
      card.title.textContent = typeof item.title === 'string' && item.title.length > 0 ? item.title : '当前会话'
      card.pct.textContent = `${Math.round(progress)}%`
      card.status.textContent = statusText(view)
      renderTrace(card.trace, item.trace)
      card.fill.style.width = `${progress}%`
      card.el.toggleAttribute('data-streaming', view.phase === 'stream')
      sessionList.appendChild(card.el)
    }
    for (const [id, card] of sessionCards) {
      if (alive.has(id)) continue
      card.el.remove()
      sessionCards.delete(id)
    }
  }

  // ---- 渲染 /state ----
  function render(data) {
    const view = data?.view ?? null
    if (view === null) return
    if (data.configRevision !== configRevision) loadConfig()
    const phase = view.phase
    const meta2 = phaseMeta(phase)
    host.setAttribute('data-ap-phase', phase)
    stage.className = `ap-stage ap-anim-${meta2.anim}`
    // 气泡
    let bubbleText = meta2.bubble
    if (phase === 'stream' && cfg.showBubble && view.textSnippet) {
      bubbleText = `正在写：「${view.textSnippet}」`
    } else if (phase === 'tool' && view.toolName) {
      bubbleText = `${view.toolName} 执行中…`
    }
    if (cfg.showBubble && bubbleText !== null && bubbleText !== undefined) {
      bubble.textContent = bubbleText
      bubble.classList.add('show')
    } else {
      bubble.classList.remove('show')
    }
    // 每个运行会话一张独立卡片。新宿主会给 running[].view；旧宿主缺 view 时仍显示标题和通用状态。
    const phaseIsRunning = phase === 'turn' || phase === 'think' || phase === 'stream' || phase === 'tool'
    let runningItems = Array.isArray(data.running) ? data.running.map((item) => {
      if (item?.view !== undefined) return item
      const isCurrent = item?.id !== undefined && item.id === data.session?.id
      return {
        id: item?.id,
        title: item?.title,
        view: isCurrent ? view : { phase: 'think', label: '正在运行', progress: 5, elapsedMs: 0 },
        trace: isCurrent && Array.isArray(data.trace) ? data.trace : [],
      }
    }) : []
    if (runningItems.length === 0 && (data.session?.running === true || phaseIsRunning)) {
      runningItems = [{
        id: data.session?.id ?? 'current',
        title: data.session?.title,
        view,
        trace: Array.isArray(data.trace) ? data.trace : [],
      }]
    }
    const runningCount = runningItems.length
    renderSessionCards(runningItems)
    collapseCount.textContent = String(runningCount)
    collapseCount.title = `展开会话面板 · ${runningCount} 个运行中的会话`
    collapseCount.setAttribute('aria-label', collapseCount.title)
    host.toggleAttribute('data-ap-running', runningCount > 0)
  }
  function refresh() {
    fetch(STATE_URL).then((r) => r.ok ? r.json() : Promise.reject())
      .then(render).catch(() => { /* 轮询失败跳过（下次再试） */ })
  }

  // ---- 页面状态感知 ----
  let pageState = null
  const syncInert = () => {
    const onboarding = document.getElementById('deepseek-onboarding-title') !== null
      || document.querySelector('[aria-labelledby="deepseek-onboarding-title"]') !== null
    const dialog = document.querySelector('[role="dialog"]') !== null
    const next = onboarding ? 'hidden' : dialog ? 'inert' : null
    if (next !== pageState) {
      pageState = next
      if (next === 'hidden') { host.setAttribute('data-ap-hidden', ''); host.removeAttribute('data-ap-inert') }
      else if (next === 'inert') { host.removeAttribute('data-ap-hidden'); host.setAttribute('data-ap-inert', '') }
      else { host.removeAttribute('data-ap-hidden'); host.removeAttribute('data-ap-inert') }
    }
  }
  const dialogObserver = new MutationObserver(syncInert)
  dialogObserver.observe(document.body, { childList: true, subtree: true })
  syncInert()

  // ---- 启动 ----
  loadConfig()
  applyPosition()
  applyBarVisibility()
  refresh()
  pollTimer = setInterval(refresh, cfg.pollMs)
  const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
  document.addEventListener('visibilitychange', onVisibility)
  const onResize = () => { if (posSaved !== null) applyPosition(); }
  window.addEventListener('resize', onResize)
  try {
    sse = new EventSource(EVENTS_URL)
    sse.onmessage = () => refresh()
    // onerror 不处理：EventSource 内建自动重连；重连期间轮询兜底。
  } catch { sse = null }

  return () => {
    if (pollTimer !== null) clearInterval(pollTimer)
    if (clickBlinkTimer !== null) clearTimeout(clickBlinkTimer)
    if (sse !== null) sse.close()
    dialogObserver.disconnect()
    stage.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('resize', onResize)
    host.remove()
    style.remove()
  }
}

// 标准 bundle client 形态：exports {name, apply} 经 __ModuleLoader__.load 注册，
// 由 client 内核挂载时调用 apply(ctx)。ctx 不依赖（自渲染 + HTTP 轮询/SSE）。
module.exports = { name: 'dsh-answer-pet', apply }

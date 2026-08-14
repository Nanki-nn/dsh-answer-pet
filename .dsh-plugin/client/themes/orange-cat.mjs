// 示例主题：橘猫。用于验证核心 UI 不依赖蓝鲸 DOM 结构，亦可作为第三方主题模板。
const ORANGE_CAT_THEME = registerPetTheme({
  apiVersion: PET_THEME_API_VERSION,
  id: 'orange-cat',
  name: '橘猫',
  aspectRatio: 1.25,
  markup: `<svg class="ap-pet-svg ap-cat-svg" viewBox="0 0 150 120" aria-hidden="true">
  <defs><linearGradient id="apCatBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6A64B"/><stop offset="1" stop-color="#D97828"/></linearGradient></defs>
  <path class="ap-cat-tail" d="M119 82 C145 91 150 67 139 58 C132 52 124 58 130 65 C137 72 132 79 121 74" fill="none" stroke="#D97828" stroke-width="13" stroke-linecap="round"/>
  <path d="M36 40 L31 15 L55 31 C66 25 86 25 97 31 L120 15 L116 43 C126 55 128 79 117 96 C105 113 48 115 32 96 C20 81 22 55 36 40 Z" fill="url(#apCatBody)" stroke="#85471F" stroke-width="4" stroke-linejoin="round"/>
  <path d="M35 30 L34 21 L46 32" fill="#F6C18B"/><path d="M108 32 L117 21 L116 35" fill="#F6C18B"/>
  <path d="M54 32 L59 49 M73 29 L73 48 M92 32 L87 49" fill="none" stroke="#A75525" stroke-width="4" stroke-linecap="round"/>
  <g class="ap-cat-eyes"><ellipse cx="53" cy="63" rx="9" ry="11" fill="#FFF8E9"/><ellipse cx="95" cy="63" rx="9" ry="11" fill="#FFF8E9"/><ellipse class="ap-cat-pupil" cx="54" cy="65" rx="4" ry="6" fill="#29342F"/><ellipse class="ap-cat-pupil" cx="96" cy="65" rx="4" ry="6" fill="#29342F"/></g>
  <g class="ap-cat-happy"><path d="M44 64 Q53 55 62 64 M86 64 Q95 55 104 64" fill="none" stroke="#29342F" stroke-width="4" stroke-linecap="round"/></g>
  <path d="M70 73 L76 73 L73 78 Z" fill="#9E4F47"/><path class="ap-cat-mouth" d="M73 78 Q67 85 61 80 M73 78 Q79 85 85 80" fill="none" stroke="#6D3C2C" stroke-width="3" stroke-linecap="round"/>
  <path d="M42 78 L15 73 M43 85 L13 87 M104 78 L134 73 M104 85 L137 88" fill="none" stroke="#85471F" stroke-width="2.5" stroke-linecap="round"/>
  <path class="ap-cat-paw" d="M43 99 Q49 88 58 99" fill="#F6B567" stroke="#85471F" stroke-width="3"/><path d="M87 99 Q96 88 104 99" fill="#F6B567" stroke="#85471F" stroke-width="3"/>
</svg>`,
  css: `
[data-answer-pet][data-ap-theme="orange-cat"] .ap-pet-svg{filter:drop-shadow(0 5px 7px rgba(74,39,19,.3))}
[data-answer-pet][data-ap-theme="orange-cat"] .ap-cat-tail{transform-box:fill-box;transform-origin:8% 55%;animation:ap-cat-tail 1.35s ease-in-out infinite}
@keyframes ap-cat-tail{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(12deg)}}
[data-answer-pet][data-ap-theme="orange-cat"] .ap-cat-eyes{transform-box:fill-box;transform-origin:center;animation:ap-cat-blink 4.2s infinite}
@keyframes ap-cat-blink{0%,88%,100%{transform:scaleY(1)}91%,96%{transform:scaleY(.08)}}
[data-answer-pet][data-ap-theme="orange-cat"] .ap-cat-happy{display:none}
[data-answer-pet][data-ap-theme="orange-cat"][data-ap-phase="done"] .ap-cat-eyes{display:none}
[data-answer-pet][data-ap-theme="orange-cat"][data-ap-phase="done"] .ap-cat-happy{display:block}
[data-answer-pet][data-ap-theme="orange-cat"][data-ap-click-blink] .ap-cat-eyes{display:block;animation:ap-cat-click-blink .24s ease-in-out 1!important}
[data-answer-pet][data-ap-theme="orange-cat"][data-ap-click-blink] .ap-cat-happy{display:none!important}
@keyframes ap-cat-click-blink{0%,100%{transform:scaleY(1)}45%,65%{transform:scaleY(.06)}}
[data-answer-pet][data-ap-theme="orange-cat"][data-ap-phase="think"] .ap-cat-pupil,[data-answer-pet][data-ap-theme="orange-cat"][data-ap-phase="turn"] .ap-cat-pupil{transform:translateY(-3px)}
[data-answer-pet][data-ap-theme="orange-cat"][data-ap-phase="stream"] .ap-cat-mouth{transform-box:fill-box;transform-origin:center;animation:ap-cat-talk .36s ease-in-out infinite}
@keyframes ap-cat-talk{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.55)}}
[data-answer-pet][data-ap-theme="orange-cat"][data-ap-phase="tool"] .ap-cat-paw{transform-box:fill-box;transform-origin:80% 100%;animation:ap-cat-paw .42s ease-in-out infinite}
@keyframes ap-cat-paw{0%,100%{transform:rotate(0)}50%{transform:rotate(-15deg) translateY(-3px)}}
[data-answer-pet][data-ap-theme="orange-cat"][data-ap-phase="stream"] .ap-cat-tail{animation-duration:.45s}
@media(prefers-reduced-motion:reduce){[data-answer-pet][data-ap-theme="orange-cat"] .ap-cat-tail,[data-answer-pet][data-ap-theme="orange-cat"] .ap-cat-eyes,[data-answer-pet][data-ap-theme="orange-cat"] .ap-cat-mouth,[data-answer-pet][data-ap-theme="orange-cat"] .ap-cat-paw{animation:none!important}}
`,
  phases: {
    idle: { animation: 'idle', bubble: '喵，我在这里～' },
    turn: { animation: 'think', bubble: '收到，看看是什么…' },
    think: { animation: 'think', bubble: '认真思考中…' },
    stream: { animation: 'stream', bubble: null },
    tool: { animation: 'tool', bubble: null },
    done: { animation: 'done', bubble: '做好啦，喵！' },
    error: { animation: 'error', bubble: '好像遇到问题了…' },
  },
})

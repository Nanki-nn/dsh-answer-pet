// 默认主题：保持 0.5.x 蓝鲸 SVG、阶段动画、眨眼和气泡文案完全兼容。
const BLUE_WHALE_THEME = registerPetTheme({
  apiVersion: PET_THEME_API_VERSION,
  id: 'blue-whale',
  name: '蓝鲸',
  aspectRatio: 1.58,
  markup: `<svg class="ap-pet-svg ap-whale-svg" viewBox="0 0 200 120" aria-hidden="true">
  <defs>
    <linearGradient id="apWhaleBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#63A9D0"/><stop offset=".48" stop-color="#3D86B7"/><stop offset="1" stop-color="#276B9D"/>
    </linearGradient>
    <linearGradient id="apWhaleFin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#448FBE"/><stop offset="1" stop-color="#245F90"/>
    </linearGradient>
    <clipPath id="apBellyClip"><path d="M13 70 C31 78 48 79 66 77 C86 75 99 68 109 62 C113 83 122 96 140 100 C123 111 99 116 72 114 C39 113 18 100 11 82 Z"/></clipPath>
  </defs>
  <g class="ap-tail">
    <path d="M153 65 C154 50 149 34 147 21 C160 27 169 38 169 50 C177 40 188 35 198 34 C195 50 184 61 169 66 C163 68 158 68 153 65 Z" fill="url(#apWhaleFin)" stroke="#174F7C" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M168 50 C170 55 170 61 169 66" fill="none" stroke="#72B6D8" stroke-width="2" opacity=".45"/>
  </g>
  <path d="M12 62 C12 32 39 17 74 18 C105 19 117 35 130 55 C140 71 148 76 158 68 C164 63 167 57 169 51 C172 66 168 78 158 85 C151 90 143 92 135 89 C123 106 101 114 72 114 C38 114 16 99 9 79 C7 72 8 66 12 62 Z" fill="url(#apWhaleBody)" stroke="#174F7C" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="M22 54 C29 31 51 23 75 24 C96 25 108 34 118 47" fill="none" stroke="#91C9E4" stroke-width="3.2" stroke-linecap="round" opacity=".55"/>
  <path d="M13 70 C31 78 48 79 66 77 C86 75 99 68 109 62 C113 83 122 96 140 100 C123 111 99 116 72 114 C39 113 18 100 11 82 Z" fill="#F3E4BC" stroke="#BFA878" stroke-width="2.6"/>
  <g clip-path="url(#apBellyClip)" fill="none" stroke="#BCA675" stroke-width="2.2" opacity=".72">
    <path d="M25 68 Q30 91 48 112"/><path d="M39 70 Q45 95 62 115"/><path d="M54 72 Q61 98 78 116"/><path d="M70 72 Q78 98 94 114"/><path d="M86 69 Q94 93 111 109"/><path d="M101 64 Q108 84 127 102"/>
  </g>
  <g class="ap-fin">
    <path d="M102 74 C111 83 121 99 122 110 C109 109 97 101 92 88 C90 82 94 76 102 74 Z" fill="url(#apWhaleFin)" stroke="#174F7C" stroke-width="3" stroke-linejoin="round"/>
    <path d="M101 80 C108 88 113 96 116 104" fill="none" stroke="#72B6D8" stroke-width="2" opacity=".45"/>
  </g>
  <path d="M45 107 C43 116 45 120 51 119 C58 117 61 112 60 107 Z" fill="url(#apWhaleFin)" stroke="#174F7C" stroke-width="2.6"/>
  <g class="ap-spout" fill="none" stroke="#3D86B7" stroke-width="4" stroke-linecap="round"><path d="M58 22 C58 11 54 5 49 2"/><path d="M58 21 C61 10 66 6 72 6"/></g>
  <ellipse cx="58" cy="24" rx="5" ry="2.5" fill="#174F7C" opacity=".72"/>
  <g class="ap-eye"><ellipse cx="69" cy="54" rx="12" ry="14" fill="#fff" stroke="#174F7C" stroke-width="3"/><ellipse class="ap-pupil" cx="72" cy="57" rx="6" ry="7.5" fill="#16232D"/><circle cx="70" cy="53" r="2.4" fill="#fff"/></g>
  <g class="ap-eye-happy"><path d="M60 57 Q69 46 78 57" fill="none" stroke="#16232D" stroke-width="4" stroke-linecap="round"/></g>
  <path d="M61 41 Q69 36 77 42" fill="none" stroke="#174F7C" stroke-width="3.2" stroke-linecap="round"/><path class="ap-mouth" d="M58 70 Q68 77 79 68" fill="none" stroke="#174F7C" stroke-width="3.2" stroke-linecap="round"/>
</svg>`,
  css: `
[data-answer-pet][data-ap-theme="blue-whale"] .ap-pet-svg{filter:drop-shadow(0 5px 7px rgba(20,48,78,.28))}
[data-answer-pet][data-ap-theme="blue-whale"] .ap-tail{transform-box:fill-box;transform-origin:12% 58%;animation:ap-whale-tail 1.8s ease-in-out infinite}
@keyframes ap-whale-tail{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(9deg)}}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="stream"] .ap-tail{animation-duration:.42s}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="done"] .ap-tail{animation-duration:.55s}
[data-answer-pet][data-ap-theme="blue-whale"] .ap-fin{transform-box:fill-box;transform-origin:18% 12%;animation:ap-whale-fin 1.7s ease-in-out infinite}
@keyframes ap-whale-fin{0%,100%{transform:rotate(0)}50%{transform:rotate(8deg)}}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="tool"] .ap-fin,[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="stream"] .ap-fin{animation-duration:.55s}
[data-answer-pet][data-ap-theme="blue-whale"] .ap-spout{transform-box:fill-box;transform-origin:50% 100%;animation:ap-whale-spout 2.2s ease-in-out infinite}
@keyframes ap-whale-spout{0%,100%{transform:translateY(0) scaleY(.96);opacity:.8}50%{transform:translateY(-3px) scaleY(1.08);opacity:1}}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="stream"] .ap-spout,[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="think"] .ap-spout{animation-duration:.75s}
[data-answer-pet][data-ap-theme="blue-whale"] .ap-eye{transform-box:fill-box;transform-origin:center;animation:ap-whale-blink 4.8s infinite}
[data-answer-pet][data-ap-theme="blue-whale"] .ap-pupil{transform-box:fill-box;transform-origin:center;transition:transform .18s ease}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="think"] .ap-pupil,[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="turn"] .ap-pupil{transform:translateY(-4px)}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="stream"] .ap-pupil,[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="tool"] .ap-pupil{transform:translateX(3px) translateY(2px)}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="error"] .ap-pupil{transform:translateY(4px)}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="stream"] .ap-eye,[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="done"] .ap-eye{animation:none}
@keyframes ap-whale-blink{0%,90%,100%{transform:scaleY(1)}93%,97%{transform:scaleY(.08)}}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-click-blink] .ap-eye{animation:ap-whale-click-blink .24s ease-in-out 1!important}
@keyframes ap-whale-click-blink{0%,100%{transform:scaleY(1)}45%,65%{transform:scaleY(.06)}}
[data-answer-pet][data-ap-theme="blue-whale"] .ap-eye-happy{display:none}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="done"] .ap-eye{opacity:0}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="done"] .ap-eye-happy{display:block}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-click-blink] .ap-eye{opacity:1!important}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-click-blink] .ap-eye-happy{display:none!important}
[data-answer-pet][data-ap-theme="blue-whale"][data-ap-phase="stream"] .ap-mouth{transform-box:fill-box;transform-origin:50% 50%;animation:ap-whale-talk .38s ease-in-out infinite}
@keyframes ap-whale-talk{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.72)}}
@media(prefers-reduced-motion:reduce){[data-answer-pet][data-ap-theme="blue-whale"] .ap-tail,[data-answer-pet][data-ap-theme="blue-whale"] .ap-fin,[data-answer-pet][data-ap-theme="blue-whale"] .ap-spout,[data-answer-pet][data-ap-theme="blue-whale"] .ap-eye,[data-answer-pet][data-ap-theme="blue-whale"] .ap-mouth{animation:none!important}}
`,
  phases: {
    idle: { animation: 'idle', bubble: '我在这儿等你～' },
    turn: { animation: 'think', bubble: '收到！开始处理…' },
    think: { animation: 'think', bubble: '思考中…' },
    stream: { animation: 'stream', bubble: null },
    tool: { animation: 'tool', bubble: null },
    done: { animation: 'done', bubble: '回答完成！' },
    error: { animation: 'error', bubble: '出错了…' },
  },
})

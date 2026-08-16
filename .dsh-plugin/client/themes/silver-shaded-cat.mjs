// 高相似度银渐层猫：构建时注入去背景紧裁切 PNG，SVG 覆盖层提供明显状态动画。
const SILVER_SHADED_CAT_THEME = registerPetTheme({
  apiVersion: PET_THEME_API_VERSION,
  id: 'silver-shaded-cat',
  name: '银渐层猫',
  aspectRatio: 1201 / 1229,
  trustedRaster: true,
  markup: `<svg class="ap-pet-svg ap-silver-cat-svg" viewBox="0 0 1201 1229" aria-hidden="true">
  <defs><clipPath id="apSilverCatLeftEyeClip"><ellipse cx="378" cy="418" rx="82" ry="89"/></clipPath><clipPath id="apSilverCatRightEyeClip"><ellipse cx="695" cy="418" rx="82" ry="89"/></clipPath></defs>
  <g class="ap-silver-cat-character">
    <image class="ap-silver-cat-art" width="1201" height="1229" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,__AP_SILVER_CAT_PNG_BASE64__"/>
    <g class="ap-silver-cat-overlay">
      <g class="ap-silver-cat-moving-eyes">
        <g clip-path="url(#apSilverCatLeftEyeClip)"><g class="ap-silver-cat-left-pupil"><ellipse cx="378" cy="425" rx="58" ry="66" fill="#080B09" opacity=".95"/><ellipse cx="354" cy="390" rx="19" ry="24" fill="#FFF" opacity=".96"/><circle cx="399" cy="446" r="9" fill="#66705E" opacity=".48"/></g></g>
        <g clip-path="url(#apSilverCatRightEyeClip)"><g class="ap-silver-cat-right-pupil"><ellipse cx="695" cy="425" rx="58" ry="66" fill="#080B09" opacity=".95"/><ellipse cx="671" cy="390" rx="19" ry="24" fill="#FFF" opacity=".96"/><circle cx="716" cy="446" r="9" fill="#66705E" opacity=".48"/></g></g>
      </g>
      <g class="ap-silver-cat-blink"><ellipse cx="378" cy="418" rx="91" ry="18" fill="#4B3827" opacity=".96"/><ellipse cx="695" cy="418" rx="91" ry="18" fill="#4B3827" opacity=".96"/></g>
      <path class="ap-silver-cat-mouth" d="M528 583 Q502 617 470 588 M528 583 Q554 617 586 588" fill="#A85D55" fill-opacity=".58" stroke="#65433A" stroke-width="10" stroke-linecap="round"/>
      <path class="ap-silver-cat-paw" d="M331 1030 Q366 946 436 1010 Q450 1087 390 1112 Q323 1099 331 1030 Z" fill="#FFEBC7" stroke="#9A7048" stroke-width="10" opacity=".98"/>
      <g class="ap-silver-cat-done-sparkles" fill="#FFC13C"><path d="M87 120 C102 77 110 48 121 18 C133 54 139 82 155 120 C194 134 219 143 247 157 C208 170 184 181 155 195 C140 235 132 263 121 294 C110 256 102 228 87 195 C50 181 27 171 0 157 C37 143 59 134 87 120 Z"/><path d="M1080 215 C1092 181 1098 158 1108 134 C1118 162 1123 185 1136 215 C1166 226 1184 233 1201 243 C1176 253 1161 259 1136 271 C1124 302 1118 323 1108 347 C1098 317 1092 296 1080 271 C1051 260 1034 253 1014 243 C1043 233 1061 226 1080 215 Z"/></g>
    </g>
  </g>
</svg>`,
  css: `
[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-pet-svg{overflow:visible;filter:drop-shadow(0 7px 9px rgba(78,56,35,.3))}
[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-character{transform-box:fill-box;transform-origin:center bottom;animation:ap-silver-cat-idle 2.4s ease-in-out infinite}
@keyframes ap-silver-cat-idle{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-13px) scale(1.018,.985)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-art{transform-box:fill-box;transform-origin:center bottom}
[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-left-pupil,[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-right-pupil{transform-box:view-box;transform-origin:center;animation:ap-silver-cat-eye-roam 5.2s ease-in-out infinite}
[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-right-pupil{animation-delay:.08s}
@keyframes ap-silver-cat-eye-roam{0%,12%,100%{transform:translate(0,0)}30%,42%{transform:translate(-15px,-6px)}58%,70%{transform:translate(15px,-3px)}84%,92%{transform:translate(3px,11px)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-blink,[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-mouth,[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-paw,[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-done-sparkles{opacity:0}
[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-blink{animation:ap-silver-cat-auto-blink 4.2s infinite}
@keyframes ap-silver-cat-auto-blink{0%,84%,97%,100%{opacity:0}87%,94%{opacity:1}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-click-blink] .ap-silver-cat-blink{animation:ap-silver-cat-click-blink .34s ease-in-out 1!important}
@keyframes ap-silver-cat-click-blink{0%,100%{opacity:0}32%,76%{opacity:1}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="turn"] .ap-silver-cat-character,[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="think"] .ap-silver-cat-character{animation:ap-silver-cat-think 1.25s ease-in-out infinite}
@keyframes ap-silver-cat-think{0%,100%{transform:translate(-7px,-5px) rotate(-1.5deg)}50%{transform:translate(7px,-15px) rotate(1.5deg)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="turn"] .ap-silver-cat-left-pupil,[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="turn"] .ap-silver-cat-right-pupil,[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="think"] .ap-silver-cat-left-pupil,[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="think"] .ap-silver-cat-right-pupil{animation:ap-silver-cat-eye-think 1.25s ease-in-out infinite}
@keyframes ap-silver-cat-eye-think{0%,100%{transform:translate(-16px,-10px)}50%{transform:translate(16px,-10px)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="stream"] .ap-silver-cat-character{animation:ap-silver-cat-stream .62s ease-in-out infinite}
@keyframes ap-silver-cat-stream{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.012)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="stream"] .ap-silver-cat-left-pupil,[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="stream"] .ap-silver-cat-right-pupil{animation:ap-silver-cat-eye-focus .8s ease-in-out infinite}
@keyframes ap-silver-cat-eye-focus{0%,100%{transform:translate(0,2px)}50%{transform:translate(0,-2px)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="stream"] .ap-silver-cat-mouth{transform-box:fill-box;transform-origin:center;animation:ap-silver-cat-talk .38s ease-in-out infinite}
@keyframes ap-silver-cat-talk{0%,100%{opacity:0;transform:scaleY(.4)}50%{opacity:.98;transform:scaleY(1.15)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="tool"] .ap-silver-cat-character{animation:ap-silver-cat-tool-body .7s ease-in-out infinite}
@keyframes ap-silver-cat-tool-body{0%,100%{transform:rotate(0)}50%{transform:rotate(1.8deg) translateY(-7px)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="tool"] .ap-silver-cat-left-pupil,[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="tool"] .ap-silver-cat-right-pupil{animation:none;transform:translate(-13px,16px)}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="tool"] .ap-silver-cat-paw{transform-box:fill-box;transform-origin:90% 100%;animation:ap-silver-cat-paw .55s ease-in-out infinite}
@keyframes ap-silver-cat-paw{0%,100%{opacity:0;transform:rotate(0) translateY(0)}32%,72%{opacity:.98;transform:rotate(-13deg) translateY(-72px)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="done"] .ap-silver-cat-character{animation:ap-silver-cat-jump .8s cubic-bezier(.25,.8,.35,1.2) 2}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="done"] .ap-silver-cat-left-pupil,[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="done"] .ap-silver-cat-right-pupil{animation:none;transform:scale(1.08)}
@keyframes ap-silver-cat-jump{0%,100%{transform:translateY(0) scale(1)}45%{transform:translateY(-52px) scale(.96,1.06)}72%{transform:translateY(5px) scale(1.05,.94)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="done"] .ap-silver-cat-done-sparkles{animation:ap-silver-cat-done .65s ease-in-out infinite}
@keyframes ap-silver-cat-done{0%,100%{opacity:.3;transform:scale(.82)}50%{opacity:1;transform:scale(1.12)}}
[data-answer-pet][data-ap-theme="silver-shaded-cat"][data-ap-phase="error"] .ap-silver-cat-character{animation:ap-silver-cat-error .34s ease-in-out 3}
@keyframes ap-silver-cat-error{0%,100%{transform:translateX(0)}35%{transform:translateX(-16px) rotate(-1deg)}70%{transform:translateX(16px) rotate(1deg)}}
@media(prefers-reduced-motion:reduce){[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-character,[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-left-pupil,[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-right-pupil,[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-blink,[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-mouth,[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-paw,[data-answer-pet][data-ap-theme="silver-shaded-cat"] .ap-silver-cat-done-sparkles{animation:none!important}}
`,
  phases: {
    idle: { animation: 'idle', bubble: '我在这里呀～' },
    turn: { animation: 'think', bubble: '让我看看…' },
    think: { animation: 'think', bubble: '认真想一想…' },
    stream: { animation: 'stream', bubble: null },
    tool: { animation: 'tool', bubble: null },
    done: { animation: 'done', bubble: '完成啦！' },
    error: { animation: 'error', bubble: '好像遇到问题了…' },
  },
})

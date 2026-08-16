import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = join(ROOT, 'assets', 'screenshots')
mkdirSync(OUT, { recursive: true })

function themeMarkup(file) {
  const source = readFileSync(join(ROOT, '.dsh-plugin', 'client', 'themes', file), 'utf8')
  const match = source.match(/markup:\s*`([\s\S]*?)`,\n\s*css:/)
  if (match === null) throw new Error(`无法读取主题 markup: ${file}`)
  return match[1]
    .replace(/<svg[^>]*viewBox="([^"]+)"[^>]*>/, '<svg viewBox="$1" preserveAspectRatio="xMidYMid meet">')
    .replace('</svg>', '</svg>')
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function screenshot({ id, title, subtitle, accent, pet, petBox, phase, stats, trace }) {
  const [x, y, width, height] = petBox
  const traceRows = trace.map((row, index) => {
    const yy = 392 + index * 58
    const color = row.state === 'running' ? accent : row.state === 'error' ? '#E35D5D' : '#39A36A'
    return `<circle cx="693" cy="${yy - 5}" r="7" fill="${color}"/>
      ${index < trace.length - 1 ? `<path d="M693 ${yy + 4} V${yy + 46}" stroke="#D9DEE7" stroke-width="2"/>` : ''}
      <text x="716" y="${yy}" class="trace-title">${escapeXml(row.label)}</text>
      <text x="1080" y="${yy}" text-anchor="end" class="trace-time">${escapeXml(row.time)}</text>`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8FAFC"/><stop offset="1" stop-color="#EDF1F6"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#253044" flood-opacity=".15"/></filter>
    <style>
      text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;letter-spacing:0}
      .eyebrow{font-size:15px;font-weight:700;fill:${accent}}
      .title{font-size:37px;font-weight:750;fill:#18202D}
      .subtitle{font-size:18px;fill:#657083}
      .panel-title{font-size:22px;font-weight:700;fill:#1E2736}
      .small{font-size:14px;fill:#717B8D}
      .stat{font-size:16px;font-weight:650;fill:#263144}
      .trace-title{font-size:16px;font-weight:600;fill:#2B3546}
      .trace-time{font-size:14px;fill:#8791A1}
      .chip{font-size:14px;font-weight:700;fill:${accent}}
    </style>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <circle cx="1100" cy="90" r="150" fill="${accent}" opacity=".045"/>
  <circle cx="75" cy="735" r="190" fill="${accent}" opacity=".035"/>
  <text x="72" y="72" class="eyebrow">DSH ANSWER PET · ${escapeXml(id)}</text>
  <text x="72" y="122" class="title">${escapeXml(title)}</text>
  <text x="72" y="158" class="subtitle">${escapeXml(subtitle)}</text>
  <g filter="url(#shadow)"><rect x="64" y="204" width="500" height="518" rx="24" fill="#FFFFFF"/></g>
  <rect x="90" y="230" width="148" height="34" rx="17" fill="${accent}" opacity=".11"/><text x="164" y="252" text-anchor="middle" class="chip">${escapeXml(phase)}</text>
  ${pet.replace('<svg ', `<svg x="${x}" y="${y}" width="${width}" height="${height}" `)}
  <text x="314" y="672" text-anchor="middle" class="small">拖拽移动 · 单击眨眼 · 阶段动画</text>
  <g filter="url(#shadow)"><rect x="606" y="204" width="530" height="518" rx="24" fill="#FFFFFF"/></g>
  <circle cx="648" cy="244" r="6" fill="#3CB371"/><text x="669" y="251" class="panel-title">正在回答</text><text x="1094" y="251" text-anchor="end" class="panel-title" fill="${accent}">${escapeXml(stats.progress)}</text>
  <text x="648" y="296" class="small">${escapeXml(stats.phase)}</text>
  <text x="648" y="330" class="stat">${escapeXml(stats.tokens)}</text><text x="810" y="330" class="stat">${escapeXml(stats.rate)}</text><text x="970" y="330" class="stat">${escapeXml(stats.time)}</text>
  <path d="M648 354 H1094" stroke="#E6E9EF"/>
  <text x="648" y="385" class="small">模型执行轨迹</text>
  ${traceRows}
  <rect x="648" y="666" width="446" height="10" rx="5" fill="#E8EBF1"/><rect x="648" y="666" width="${Math.round(446 * parseInt(stats.progress) / 100)}" height="10" rx="5" fill="${accent}"/>
  <text x="72" y="772" class="small">多会话进度 · token/s · 工具轨迹 · PetTheme v1</text>
</svg>`
}

const whale = themeMarkup('blue-whale.mjs')
const orangeCat = themeMarkup('orange-cat.mjs')
const silverPng = readFileSync(join(ROOT, 'assets', 'silver-shaded-cat-cropped.png')).toString('base64')
const silverCat = `<svg viewBox="0 0 1201 1229" preserveAspectRatio="xMidYMid meet"><image width="1201" height="1229" href="data:image/png;base64,${silverPng}"/></svg>`

const common = {
  stats: { progress: '72%', phase: '组织回答', tokens: '1,284 tokens', rate: '42.6 token/s', time: '31s' },
  trace: [
    { label: '分析任务 · 步骤 1', time: '2s', state: 'done' },
    { label: '推理与规划', time: '8s', state: 'done' },
    { label: '调用工具 · read', time: '1s', state: 'done' },
    { label: '组织回答', time: '20s', state: 'running' },
  ],
}

const scenes = [
  { id: 'blue-whale', title: '蓝鲸 · 默认主题', subtitle: '喷水、摆尾、眨眼与回答完成表情', accent: '#347FAE', pet: whale, petBox: [118, 320, 382, 230], phase: '正在输出', ...common },
  { id: 'orange-cat', title: '橘猫 · 纯 SVG 主题', subtitle: '摆尾、抬爪、说话与完成表情', accent: '#D7782A', pet: orangeCat, petBox: [130, 300, 370, 296], phase: '调用工具', ...common },
  { id: 'silver-shaded-cat', title: '银渐层猫 · 动态原画', subtitle: '透明背景、动态眼睛、呼吸、说话、抬爪与跳跃', accent: '#9A744B', pet: silverCat, petBox: [168, 292, 292, 300], phase: '思考中', ...common },
]

for (const scene of scenes) {
  const svg = join(OUT, `${scene.id}.svg`)
  writeFileSync(svg, screenshot(scene))
  const target = join(OUT, `${scene.id}.png`)
  execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--hide-scrollbars', '--disable-gpu', '--no-sandbox',
    '--window-size=1200,800', `--screenshot=${target}`, `file://${svg}`,
  ], { stdio: 'ignore' })
  console.log(`[screenshots] ${target}`)
}

// dsh-answer-pet 客户端构建器：把 .dsh-plugin/client/index.mjs（自包含、零 import/export）
// 包装成官方 bundle client 产物 .dsh-plugin/client.js（__ModuleLoader__.load 契约）。
// 契约：
// - 源码无 import/export（客户端零依赖——不需要 esbuild，纯文本拼接）。
// - 源码以 `module.exports = { name, apply }` 收尾（factory 作用域内提供 module/exports）。
// - --check 模式在内存生成后与已提交产物逐字节比对，不一致非零退出（改源码后必须重建）。
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const ENTRY = join(ROOT, '.dsh-plugin', 'client', 'index.mjs')
const OUTPUT = join(ROOT, '.dsh-plugin', 'client.js')

/** 生成 client.js。@param {{ check?: boolean }} opts */
export function generate({ check = false } = {}) {
  const body = readFileSync(ENTRY, 'utf8')
  const code = `window.__ModuleLoader__.load({\n`
    + `\tid: "dsh-answer-pet",\n`
    + `\tfactory: (require) => {\n`
    + `\t\tvar module = { exports: {} };\n`
    + `\t\tvar exports = module.exports;\n`
    + body.replace(/\n$/, '')
    + `\n\t\treturn module.exports;\n`
    + `\t}\n`
    + `});\n`
  const outputPath = OUTPUT
  if (!check) {
    writeFileSync(outputPath, code)
    return { ok: true }
  }
  let committed = null
  try {
    committed = readFileSync(outputPath)
  } catch {
    return { ok: false, errors: [`${outputPath} 不存在：运行 node scripts/build-client.mjs 生成`] }
  }
  if (Buffer.compare(committed, Buffer.from(code, 'utf8')) !== 0) {
    return { ok: false, errors: ['client.js 与构建器输出不一致：运行 node scripts/build-client.mjs 重建（手改产物禁止）'] }
  }
  return { ok: true }
}

// CLI 入口（被 import 时不执行）。
if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1]).replace(/\\/g, '/')}`).href) {
  const check = process.argv.includes('--check')
  const result = generate({ check })
  if (!result.ok) {
    for (const e of result.errors ?? []) console.error(`[build-client] ${e}`)
    process.exit(1)
  }
  console.log(check ? '[build-client] client.js 新鲜（--check OK）' : '[build-client] client.js 已生成')
}

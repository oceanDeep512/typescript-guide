// 逐个跑 twoslash 块，定位会导致构建失败的块（比整站 build 快得多）
// 用法：node scripts/check-twoslash.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createTwoslasher } from 'twoslash-vue'
import ts from 'typescript'

const ROOT = process.cwd()
const twoslasher = createTwoslasher({
  compilerOptions: {
    strict: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
  },
})

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (name.endsWith('.md')) out.push(p)
  }
  return out
}

const files = walk(ROOT)
let blocks = 0
let failed = 0
const failures = []

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const lines = src.split('\n')
  let i = 0
  while (i < lines.length) {
    const m = lines[i].match(/^```(\S*)(.*)$/)
    if (m && (m[1] === 'ts' || m[1] === 'tsx') && m[2].includes('twoslash')) {
      const start = i
      const bodyStart = i + 1
      let j = bodyStart
      while (j < lines.length && !/^```\s*$/.test(lines[j])) j++
      const code = lines.slice(bodyStart, j).join('\n')
      blocks++
      try {
        twoslasher(code, m[1])
      } catch (e) {
        failed++
        failures.push({
          file: relative(ROOT, file),
          line: start + 1,
          msg: String(e.message || e).split('\n').slice(0, 4).join(' | '),
          head: code.split('\n')[0],
        })
      }
      i = j + 1
    } else {
      i++
    }
  }
}

console.log(`检查了 ${blocks} 个 twoslash 块，失败 ${failed} 个\n`)
for (const f of failures) {
  console.log(`${f.file}:${f.line}  ${f.head}`)
  console.log(`   ${f.msg}\n`)
}
process.exit(failed ? 1 : 0)

import { readFileSync } from 'node:fs'
import { createTwoslasher } from 'twoslash-vue'

const t = createTwoslasher({
  compilerOptions: { strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true },
})
for (const file of process.argv.slice(2)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  let i = 0
  console.log('==== ' + file)
  while (i < lines.length) {
    const m = lines[i].match(/^```(ts|tsx)(.*)$/)
    if (m && m[2].includes('twoslash')) {
      let j = i + 1
      while (j < lines.length && !/^```\s*$/.test(lines[j])) j++
      const code = lines.slice(i + 1, j).join('\n')
      try {
        const r = t(code, m[1])
        const qs = (r.queries || []).map((x) => x.text)
        if (qs.length) console.log('  L' + (i + 1) + ': ' + JSON.stringify(qs))
      } catch (e) {
        console.log('  L' + (i + 1) + ' FAIL ' + String(e.message).split('\n').filter(Boolean)[1])
      }
      i = j + 1
    } else i++
  }
}

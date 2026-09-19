import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def check(path: Path):
    lines = path.read_text(encoding='utf-8').split('\n')
    problems = []
    for i, line in enumerate(lines):
        if '^?' not in line:
            continue
        if not re.match(r'^\s*//[^/]*\^?', line):
            continue
        prev = lines[i - 1] if i > 0 else ''
        col = line.index('^')
        if col >= len(prev):
            problems.append((i + 1, 'caret 超出上一行长度', prev, line))
            continue
        ch = prev[col]
        if ch in ' \t':
            problems.append((i + 1, f'caret 指向空白（上一行第 {col+1} 列）', prev, line))
    return problems


total = 0
bad = 0
for md in sorted(ROOT.rglob('*.md')):
    if 'node_modules' in str(md) or str(md).startswith(str(ROOT / 'dist')):
        continue
    probs = check(md)
    total += md.read_text(encoding='utf-8').count('^?')
    if probs:
        bad += len(probs)
        print(f'\n{md.relative_to(ROOT)}')
        for ln, msg, prev, cur in probs:
            print(f'  L{ln}: {msg}')
            print(f'    prev: {prev!r}')
            print(f'    cur : {cur!r}')

print(f'\n共检查 ^? {total} 处，对齐问题 {bad} 处')
sys.exit(1 if bad else 0)

from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

patterns = (
    ('</a>\\\\n<a', '</a> <a'),
    ('</a>\\n<a', '</a> <a'),
)
replacements = 0
for old, new in patterns:
    count = text.count(old)
    replacements += count
    text = text.replace(old, new)

if replacements == 0:
    raise SystemExit('No literal link escape sequences found')

path.write_text(text, encoding='utf-8')
print(f'Removed {replacements} literal link escape sequence(s) safely.')

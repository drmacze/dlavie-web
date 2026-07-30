from pathlib import Path

INDEX = Path('index.html')
if not INDEX.exists():
    raise SystemExit('index.html not found')

html = INDEX.read_text(encoding='utf-8')

style_tag = '<link rel="stylesheet" href="maintenance-dev-hub.css" />'
if style_tag not in html:
    marker = '<link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" rel="stylesheet" />'
    if marker not in html:
        raise SystemExit('head stylesheet marker not found')
    html = html.replace(marker, marker + '\n' + style_tag, 1)

script_tag = '<script src="maintenance-dev-hub.js"></script>'
if script_tag not in html:
    marker = '<script src="portal-sso.js"></script>'
    if marker not in html:
        raise SystemExit('Portal SSO script marker not found')
    html = html.replace(marker, script_tag + '\n' + marker, 1)

old_role = "const isDev=currentUser.role==='developer'||currentUser.role==='admin';"
new_role = "const isDev=['owner','developer','admin'].includes(String(currentUser.role||'').toLowerCase());"
if old_role in html:
    html = html.replace(old_role, new_role, 1)
elif new_role not in html:
    raise SystemExit('developer role marker not found')

button_marker = '''<button class="compact-logout-btn" onclick="logout()">'''
dev_button = '''${isDev?'<button class="compact-devhub-btn" onclick="window.DLavieMaintenanceHub.open()" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2v-4h.1A1.7 1.7 0 0 0 3.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.1A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7 1.6z"/></svg><span>Dev Hub</span></button>':''}
'''
if 'window.DLavieMaintenanceHub.open()' not in html:
    if button_marker not in html:
        raise SystemExit('profile logout button marker not found')
    html = html.replace(button_marker, dev_button + button_marker, 1)

required = [
    style_tag,
    script_tag,
    new_role,
    'window.DLavieMaintenanceHub.open()',
]
missing = [item for item in required if item not in html]
if missing:
    raise SystemExit('maintenance Dev Hub patch incomplete: ' + ', '.join(missing))

INDEX.write_text(html, encoding='utf-8')
print('Maintenance Dev Hub entry point materialized.')

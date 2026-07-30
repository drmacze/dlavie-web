from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')

if '<link rel="stylesheet" href="i18n.css" />' not in text:
    text = text.replace(
        '<link rel="stylesheet" href="maintenance-dev-hub.css" />',
        '<link rel="stylesheet" href="maintenance-dev-hub.css" />\n<link rel="stylesheet" href="i18n.css" />',
        1,
    )

old_selector = '''<!-- LANGUAGE SELECTOR -->
<div class="lang-selector" id="langSelector">
<button class="lang-btn active" onclick="setLang('id')">ID</button>
<button class="lang-btn" onclick="setLang('en')">EN</button>
</div>'''
new_selector = '''<!-- LANGUAGE SELECTOR — rendered by i18n.js -->
<div class="lang-selector" id="langSelector" aria-label="Language"></div>'''
text = text.replace(old_selector, new_selector, 1)

if '<script src="i18n.js"></script>' not in text:
    text = text.replace(
        '<script src="maintenance-dev-hub.js"></script>',
        '<script src="i18n.js"></script>\n<script src="maintenance-dev-hub.js"></script>',
        1,
    )

start_marker = '// ═══════════════════════════════════════════════════════════════\n// I18N — Internationalization'
end_marker = '// ═══════════════════════════════════════════════════════════════\n// ROUTER'
start = text.find(start_marker)
end = text.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit('Could not find legacy I18N block')

bridge = '''// ═══════════════════════════════════════════════════════════════
// I18N v2 — shared runtime in i18n.js
// ═══════════════════════════════════════════════════════════════
let currentLang = window.DLavieI18n.getLocale();
function setLang(lang){
  window.DLavieI18n.setLocale(lang);
  currentLang = window.DLavieI18n.getLocale();
  applyLang();
}
function applyLang(){
  currentLang = window.DLavieI18n.getLocale();
  window.DLavieI18n.translate(document);
}
function tr(key, vars){ return window.DLavieI18n.t(key, vars); }

'''
text = text[:start] + bridge + text[end:]

text = text.replace(
    "showToast(currentLang==='en'?'Logged out successfully.':'Berhasil logout.');",
    "showToast(tr('toast_logout'));",
)

text = re.sub(
    r"if\(mode==='register'\)\{lf\.style\.display='none';rf\.style\.display='block';sw\.innerHTML=.*?;\}",
    "if(mode==='register'){lf.style.display='none';rf.style.display='block';sw.dataset.mode='register';sw.innerHTML=`${tr('auth_have_account')} <a onclick=\"switchAuthMode('login')\">${tr('auth_login_here')}</a>`;}else{lf.style.display='block';rf.style.display='none';sw.dataset.mode='login';sw.innerHTML=`${tr('auth_no_account')} <a onclick=\"switchAuthMode('register')\">${tr('auth_register_here')}</a><br><span class=\"auth-google-hint\">${tr('auth_google_hint')}</span>`;}",
    text,
    count=1,
    flags=re.S,
)

text = text.replace(
    'Daftar dengan Google\n</button>',
    '<span data-i18n="register_google">Daftar dengan Google</span>\n</button>',
    1,
)

text = text.replace(
    '<p class="updated">Last updated: July 7, 2026</p>',
    '<p class="updated" data-i18n="legal_updated">Last updated: July 7, 2026</p>',
)

text = text.replace(
    'window.currentUser=currentUser;',
    'window.currentUser=currentUser; window.DLavieI18n?.syncFromProfile(currentUser);',
)

legacy_restore = '''// Restore language preference
const savedLang=localStorage.getItem('dlavie_lang')||'id';
setLang(savedLang);
router();
applyLang();'''
modern_restore = '''// Initialize locale after the page and authenticated profile are ready.
window.DLavieI18n.init();
currentLang=window.DLavieI18n.getLocale();
router();
applyLang();'''
if legacy_restore not in text:
    raise SystemExit('Could not find legacy language bootstrap')
text = text.replace(legacy_restore, modern_restore, 1)

# Fix malformed mobile links introduced by previous monolithic patches.
text = text.replace('data-i18n="nav_news">Berita</a>\\\n<a', 'data-i18n="nav_news">Berita</a>\n<a')

path.write_text(text, encoding='utf-8')

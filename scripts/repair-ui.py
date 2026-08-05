from pathlib import Path
import re
import textwrap

root = Path('.')
index_path = root / 'index.html'
i18n_path = root / 'i18n.js'
portal_path = root / 'portal-sso.js'
maintenance_css_path = root / 'maintenance-dev-hub.css'
language_css_path = root / 'i18n.css'

index = index_path.read_text(encoding='utf-8')
i18n = i18n_path.read_text(encoding='utf-8')
portal = portal_path.read_text(encoding='utf-8')
maintenance_css = maintenance_css_path.read_text(encoding='utf-8')
language_css = language_css_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Patch anchor missing: {label}')
    return text.replace(old, new, 1)


# Improve the core contrast tokens without changing the premium dark identity.
index = replace_once(
    index,
    '--soft-text:#CCC;--sub-text:#888;--dim-text:#555;--glass-stroke:rgba(255,255,255,0.10);--glass-stroke-hi:rgba(255,255,255,0.20);--hairline:rgba(255,255,255,0.05);',
    '--soft-text:#E0E0E0;--sub-text:#A8A8A8;--dim-text:#7A7A7A;--glass-stroke:rgba(255,255,255,0.16);--glass-stroke-hi:rgba(255,255,255,0.28);--hairline:rgba(255,255,255,0.10);--accent:#8EA2FF;--accent-strong:#6B8AFF;',
    'root contrast tokens',
)
index = replace_once(
    index,
    'html{-webkit-text-size-adjust:100%}',
    'html{-webkit-text-size-adjust:100%;color-scheme:dark;scrollbar-color:#3A3A3A #080808}',
    'html color scheme',
)

# Never leave important content permanently invisible when GSAP or a CDN fails.
index = replace_once(
    index,
    '.reveal{opacity:0;transform:translateY(30px);animation:reveal-fb 0.01s 3s forwards}',
    '.reveal{opacity:1;transform:none}',
    'reveal fallback',
)
index = re.sub(
    r'\sstyle="opacity\s*:\s*0\s*;\s*transform\s*:\s*translateY\(30px\)\s*"',
    '',
    index,
)
index = replace_once(
    index,
    "if(window.gsap){\ngsap.utils.toArray('.reveal')",
    "if(window.gsap){\ngsap.set('.reveal',{opacity:0,y:30});\ngsap.utils.toArray('.reveal')",
    'GSAP reveal setup',
)

# Static, translated fallback headings prevent blank hero/FAQ pages when JS is late.
index = replace_once(
    index,
    '<h1 class="home-title" id="typingTarget"></h1><span class="typing-cursor" id="typingCursor">|</span>',
    '<h1 class="home-title" id="typingTarget" data-i18n="hero_title">DLavie Launcher.</h1>',
    'home heading fallback',
)
index = replace_once(
    index,
    '<h1 class="home-title" style="font-size:clamp(36px,6vw,80px);" id="faqTyping"></h1><span class="typing-cursor" id="faqTypingCursor">|</span>',
    '<h1 class="home-title" style="font-size:clamp(36px,6vw,80px);" id="faqTyping" data-i18n="faq_title">Pertanyaan yang Sering Diajukan</h1>',
    'FAQ heading fallback',
)

# Restore the documented confirmation-modal download flow.
index = replace_once(
    index,
    'id="btnDownloadHero" onclick="downloadLauncher(event)"',
    'id="btnDownloadHero" onclick="openDownloadModal(event)"',
    'download modal handler',
)

# Repair malformed closing SVG tags. Translation belongs on a real text span.
malformed_svg = re.compile(r'</svg\s+data-i18n="([^"]+)">\s*([^<\n]+)')


def svg_label(match):
    key = match.group(1)
    label = match.group(2).strip()
    return f'</svg><span class="ui-label" data-i18n="{key}">{label}</span>'


index, repaired_svg_count = malformed_svg.subn(svg_label, index)
if repaired_svg_count < 7:
    raise SystemExit(f'Expected at least 7 malformed SVG labels, repaired {repaired_svg_count}')

# Remove accidental backslashes rendered between adjacent links.
index = re.sub(r'</a>\\+\s*<a', '</a>\n<a', index)

# Improve accessible labels for icon-only controls.
index = replace_once(
    index,
    '<button class="menu-toggle" id="menuToggle">',
    '<button class="menu-toggle" id="menuToggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="mobileMenu">',
    'mobile menu accessibility',
)
index = index.replace(
    '<button class="modal-close" onclick="closeCreateIssueModal()">',
    '<button class="modal-close" type="button" onclick="closeCreateIssueModal()" aria-label="Close dialog">',
)

# Give feature titles a stable icon/text layout after the markup repair.
index = replace_once(
    index,
    '.feature-card h3{font-family:var(--font-display);font-size:18px;font-weight:600;margin-bottom:8px}',
    '.feature-card h3{font-family:var(--font-display);font-size:18px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:10px;color:var(--text-white)}',
    'feature title layout',
)

# Replace the non-localized, low-information issue placeholder with a real state.
index = replace_once(
    index,
    '<div id="issuesList" class="issues-list"><div style="text-align:center;padding:60px;color:var(--sub-text);">Pilih kategori atau buat issue baru.</div></div>',
    '<div id="issuesList" class="issues-list"><div class="ui-empty-state"><strong data-i18n="issues_empty_title">Belum ada issue</strong><span data-i18n="issues_empty_sub">Jadilah yang pertama melapor.</span></div></div>',
    'issues empty state',
)

hardening_css = textwrap.dedent('''
/* UI reliability and contrast hardening */
:where(a,button,input,textarea,[role="button"]):focus-visible{outline:3px solid var(--accent);outline-offset:3px}
:where(button,input,textarea){font:inherit}
:where(button,[role="button"]):disabled{opacity:.58;cursor:not-allowed;filter:saturate(.7)}
.ui-label{display:inline-flex;align-items:center;min-width:0;color:inherit}
.ui-empty-state{min-height:180px;padding:36px 24px;border:1px dashed var(--glass-stroke-hi);border-radius:16px;background:rgba(255,255,255,.025);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:7px;color:var(--sub-text)}
.ui-empty-state strong{color:var(--text-white);font:600 18px var(--font-display)}
.ui-empty-state span{max-width:440px;color:var(--soft-text);font-size:13px}
.auth-error:empty{display:none!important;padding:0;border:0;background:transparent}
.home-title:empty::before{content:'DLavie Launcher.';color:var(--text-white)}
#faqTyping:empty::before{content:'Frequently Asked Questions';color:var(--text-white)}
.btn-connect svg,.btn-secondary svg,.btn-primary svg,.menu-toggle svg,.modal-close svg,.dl-modal-close svg{color:inherit;stroke:currentColor}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}.reveal{opacity:1!important;transform:none!important}}
''').strip()
if '/* UI reliability and contrast hardening */' not in index:
    index = index.replace('</style>', hardening_css + '\n</style>', 1)

# Add missing translated fallback titles and prevent empty translations from erasing text.
i18n = replace_once(
    i18n,
    "badge_text:'DLavie — FIFA modding, made simpler',hero_sub:",
    "badge_text:'DLavie — FIFA modding, made simpler',hero_title:'DLavie Launcher.',hero_sub:",
    'English hero title',
)
i18n = replace_once(
    i18n,
    "faq_badge:'DLavie Help Center',faq_sub:",
    "faq_badge:'DLavie Help Center',faq_title:'Frequently Asked Questions',faq_sub:",
    'English FAQ title',
)
i18n = replace_once(
    i18n,
    "badge_text:'DLavie — modding FIFA yang lebih mudah',hero_sub:",
    "badge_text:'DLavie — modding FIFA yang lebih mudah',hero_title:'DLavie Launcher.',hero_sub:",
    'Indonesian hero title',
)
i18n = replace_once(
    i18n,
    "faq_badge:'Pusat Bantuan DLavie',faq_sub:",
    "faq_badge:'Pusat Bantuan DLavie',faq_title:'Pertanyaan yang Sering Diajukan',faq_sub:",
    'Indonesian FAQ title',
)
i18n = replace_once(
    i18n,
    "      if (key) el.textContent = t(key);",
    "      if (key) {\n        const value = t(key).trim();\n        if (value) el.textContent = value;\n        else if (!el.textContent.trim()) el.textContent = key;\n      }",
    'safe text translation',
)

# Dynamic Portal CSS used several nearly-black foreground colors.
portal_replacements = {
    'color:#777;font-weight:700': 'color:#A6A6A6;font-weight:700',
    'color:#aaa;font-size:13px': 'color:#D0D0D0;font-size:13px',
    'color:#666;font-size:11px': 'color:#A0A0A0;font-size:11px',
    'font-weight:800;color:#555;': 'font-weight:800;color:#9A9A9A;',
    'font-size:12px;color:#666': 'font-size:12px;color:#A8A8A8',
    'font-size:10px;color:#444': 'font-size:10px;color:#898989',
    'span{color:#777}': 'span{color:#B0B0B0}',
    'background:transparent;color:#aaa': 'background:transparent;color:#D0D0D0',
    'text-align:center;color:#555': 'text-align:center;color:#949494',
    'display:block;color:#888': 'display:block;color:#B8B8B8',
    'background:transparent;color:#777;font-size:18px': 'background:transparent;color:#B0B0B0;font-size:18px',
}
for old, new in portal_replacements.items():
    if old not in portal:
        raise SystemExit(f'Portal contrast anchor missing: {old}')
    portal = portal.replace(old, new)

# Raise contrast in the maintenance hub and language selector.
maintenance_css = maintenance_css.replace('color:#888', 'color:#A8A8A8')
maintenance_css = maintenance_css.replace('color:#777', 'color:#999')
maintenance_css = maintenance_css.replace('color:#666', 'color:#909090')
maintenance_css = maintenance_css.replace('color:#555', 'color:#808080')
maintenance_css = maintenance_css.replace('color:#aaa', 'color:#D0D0D0')
maintenance_css = maintenance_css.replace('background:#777', 'background:#999')
maintenance_css = maintenance_css.replace('color:#5e5e5e', 'color:#858585')
language_css = language_css.replace('color:#737373', 'color:#9A9A9A')

index_path.write_text(index, encoding='utf-8')
i18n_path.write_text(i18n, encoding='utf-8')
portal_path.write_text(portal, encoding='utf-8')
maintenance_css_path.write_text(maintenance_css, encoding='utf-8')
language_css_path.write_text(language_css, encoding='utf-8')

audit_script = r'''import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(path, 'utf8');
const index = read('index.html');
const i18n = read('i18n.js');
const portal = read('portal-sso.js');
const maintenanceCss = read('maintenance-dev-hub.css');
const languageCss = read('i18n.css');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(!/<\/(?:svg|span|a|button|div|h[1-6])\s+[^>]+>/i.test(index), 'Closing tags must not contain attributes.');
check(!/class="[^"]*\breveal\b[^"]*"[^>]*style="[^"]*opacity\s*:\s*0/i.test(index), 'Reveal elements must not be hidden inline.');
check(/id="typingTarget"[^>]*data-i18n="hero_title"[^>]*>\s*[^<\s][^<]*<\/h1>/.test(index), 'Home heading needs visible fallback text.');
check(/id="faqTyping"[^>]*data-i18n="faq_title"[^>]*>\s*[^<\s][^<]*<\/h1>/.test(index), 'FAQ heading needs visible fallback text.');
check(/id="btnDownloadHero"[^>]*onclick="openDownloadModal\(event\)"/.test(index), 'Hero download must open the confirmation modal.');
check(!/<\/a>\\+\s*<a/.test(index), 'Stray backslashes must not appear between links.');
check(!/color:#(?:444|555|666|777)\b/i.test(portal), 'Portal dynamic UI contains unreadably dark foreground text.');

const enBlock = i18n.match(/const EN = \{([\s\S]*?)\n  \};/)?.[1] || '';
const enKeys = new Set([...enBlock.matchAll(/(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map(match => match[1]));
const usedKeys = new Set([...index.matchAll(/data-i18n(?:-ph|-placeholder|-aria|-title)?="([^"]+)"/g)].map(match => match[1]));
const missingKeys = [...usedKeys].filter(key => !enKeys.has(key));
check(missingKeys.length === 0, `Missing English i18n keys: ${missingKeys.join(', ')}`);

const allCss = `${index}\n${maintenanceCss}\n${languageCss}`;
const declared = new Set([...allCss.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map(match => match[1]));
const used = new Set([...allCss.matchAll(/var\((--[A-Za-z0-9_-]+)/g)].map(match => match[1]));
const undefinedVars = [...used].filter(name => !declared.has(name));
check(undefinedVars.length === 0, `Undefined CSS variables: ${undefinedVars.join(', ')}`);

function luminance(hex) {
  const rgb = hex.match(/[A-Fa-f0-9]{2}/g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(foreground, background = '#000000') {
  const a = luminance(foreground.replace('#', '').length === 3 ? '#' + [...foreground.slice(1)].map(c => c + c).join('') : foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
for (const [token, minimum] of [['--soft-text', 7], ['--sub-text', 6], ['--dim-text', 4.5]]) {
  const value = index.match(new RegExp(`${token}:(#[A-Fa-f0-9]{6})`))?.[1];
  check(Boolean(value), `${token} must be a six-digit hex color.`);
  if (value) check(contrast(value) >= minimum, `${token} contrast is below ${minimum}:1.`);
}

for (const file of ['i18n.js', 'portal-sso.js', 'maintenance-dev-hub.js']) {
  try { new vm.Script(read(file), { filename: file }); }
  catch (error) { failures.push(`${file} syntax error: ${error.message}`); }
}
const inlineScripts = [...index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(code => code.trim());
inlineScripts.forEach((code, indexValue) => {
  try { new vm.Script(code, { filename: `index-inline-${indexValue + 1}.js` }); }
  catch (error) { failures.push(`Inline script ${indexValue + 1} syntax error: ${error.message}`); }
});

if (failures.length) {
  console.error('UI audit failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log(`UI audit passed: ${usedKeys.size} i18n keys, ${used.size} CSS variables, ${inlineScripts.length} inline scripts.`);
'''
scripts = root / 'scripts'
scripts.mkdir(exist_ok=True)
(scripts / 'ui-audit.mjs').write_text(textwrap.dedent(audit_script).lstrip(), encoding='utf-8')

quality_workflow = '''name: UI Quality

on:
  push:
    branches: [main]
    paths:
      - index.html
      - i18n.js
      - i18n.css
      - portal-sso.js
      - maintenance-dev-hub.js
      - maintenance-dev-hub.css
      - scripts/ui-audit.mjs
      - .github/workflows/ui-quality.yml
  pull_request:
    paths:
      - index.html
      - i18n.js
      - i18n.css
      - portal-sso.js
      - maintenance-dev-hub.js
      - maintenance-dev-hub.css
      - scripts/ui-audit.mjs
      - .github/workflows/ui-quality.yml

permissions:
  contents: read

concurrency:
  group: ui-quality-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  audit:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node scripts/ui-audit.mjs
'''
workflow_path = root / '.github' / 'workflows' / 'ui-quality.yml'
workflow_path.write_text(textwrap.dedent(quality_workflow).lstrip(), encoding='utf-8')

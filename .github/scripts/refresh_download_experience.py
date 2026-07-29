from pathlib import Path
import re

INDEX = Path("index.html")
MARKER = "<!-- DLAVIE_DOWNLOAD_V2 -->"

html = INDEX.read_text(encoding="utf-8")

if MARKER in html:
    print("Launcher download experience is already migrated.")
    raise SystemExit(0)


def replace_once(pattern: str, replacement: str, label: str, *, flags: int = re.S) -> None:
    global html
    updated, count = re.subn(pattern, replacement, html, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} block, found {count}")
    html = updated


# Replace the oversized animated CTA with a compact, product-focused button.
replace_once(
    r"/\* ═══ v326: Elegant Download Button \(solid bg\) ═══ \*/.*?(?=/\* ═══ v325: Download Popup Modal ═══ \*/)",
    """/* DLAVIE_DOWNLOAD_V2: minimal launcher download CTA */
.btn-download{display:inline-flex;align-items:center;gap:12px;min-width:230px;padding:13px 15px;border-radius:12px;background:#fff;color:#050505;border:1px solid rgba(255,255,255,.72);text-decoration:none;box-shadow:0 8px 28px rgba(0,0,0,.28);transition:transform .2s var(--ease),box-shadow .2s var(--ease),background .2s ease}
.btn-download:hover{transform:translateY(-2px);background:#f4f4f4;box-shadow:0 12px 34px rgba(0,0,0,.34)}
.btn-download:active{transform:translateY(0)}
.btn-download-icon{width:20px;height:20px;flex:0 0 auto}
.btn-download-copy{display:flex;flex:1;min-width:0;flex-direction:column;align-items:flex-start;line-height:1.2}
.btn-download-title{font-family:var(--font-display);font-size:15px;font-weight:600;letter-spacing:-.01em}
.btn-download-version{margin-top:3px;color:rgba(0,0,0,.55);font-family:var(--font-mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase}
.btn-download-arrow{width:16px;height:16px;flex:0 0 auto;color:rgba(0,0,0,.48);transition:transform .2s var(--ease)}
.btn-download:hover .btn-download-arrow{transform:translateX(2px)}
@media(max-width:640px){.btn-download{width:100%;max-width:290px;min-width:0}}
""",
    "download CSS",
)

replace_once(
    r'<a href="#" class="btn-download" id="btnDownloadHero" onclick="openDownloadModal\(event\)">.*?</a>',
    """<!-- DLAVIE_DOWNLOAD_V2 -->
<a href="https://github.com/drmacze/DLavie-Launcher-Data/releases/download/v26/DLavie26-Launcher-v325.apk" class="btn-download" id="btnDownloadHero" onclick="downloadLauncher(event)" aria-label="Download DLavie Launcher for Android">
<svg class="btn-download-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
<span class="btn-download-copy">
<span class="btn-download-title" data-i18n="btn_download">Download Launcher</span>
<span class="btn-download-version">Android · <span data-launcher-version>v8.1.0</span></span>
</span>
<svg class="btn-download-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
</a>""",
    "hero download button",
)

# Add a compact, live version indicator to the footer and fix the public product name typo.
footer_css_anchor = ".footer-copy{color:var(--dim-text);font-size:11px;font-family:var(--font-mono);letter-spacing:0.04em}\n"
if footer_css_anchor not in html:
    raise RuntimeError("Footer CSS anchor was not found")
html = html.replace(
    footer_css_anchor,
    footer_css_anchor
    + ".footer-version{display:inline-flex;align-items:center;gap:7px;margin:0 0 18px;padding:7px 10px;border:1px solid var(--hairline);border-radius:999px;color:var(--sub-text);font-family:var(--font-mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase}\n"
    + ".footer-version strong{color:var(--text-white);font-weight:600}\n"
    + ".footer-version-code{color:var(--dim-text)}\n",
    1,
)

replace_once(
    r'<footer class="footer">.*?</footer>',
    """<footer class="footer">
<div class="footer-logo">DLAVIE · FIFA MODDING LAUNCHER</div>
<div class="footer-version">Latest version <strong data-launcher-version>v8.1.0</strong><span class="footer-version-code">build <span data-launcher-code>325</span></span></div>
<div class="footer-links">
<a href="#/terms" class="footer-link" data-link>Terms</a>
<a href="#/privacy" class="footer-link" data-link>Privacy</a>
<a href="#/faq" class="footer-link" data-link>FAQ</a>
<a href="#/issues" class="footer-link" data-link>Issues</a>
</div>
<div class="footer-copy" data-i18n="footer_copy">© 2026 DLavie Company · FIFA Modding Launcher</div>
</footer>""",
    "footer",
)

# Professional public version: SemVer for users, monotonically increasing versionCode for Android.
html = re.sub(
    r"let LAUNCHER_APK_URL = '[^']+';",
    "let LAUNCHER_APK_URL = 'https://github.com/drmacze/DLavie-Launcher-Data/releases/download/v26/DLavie26-Launcher-v325.apk';",
    html,
    count=1,
)
html = re.sub(r"let LAUNCHER_VERSION = '[^']+';", "let LAUNCHER_VERSION = 'v8.1.0';", html, count=1)
html = re.sub(r"let LAUNCHER_VERSION_CODE = \d+;", "let LAUNCHER_VERSION_CODE = 325;", html, count=1)

# Download metadata now has one source of truth: the public GitHub manifest.
replace_once(
    r"// ═══════════════════════════════════════════════════════════════\n// AUTO-FETCH LATEST VERSION.*?\n\}\)\(\);\n\n// Update all version badges in DOM",
    """// ═══════════════════════════════════════════════════════════════
// AUTO-FETCH LATEST VERSION — GitHub manifest is the source of truth
// ═══════════════════════════════════════════════════════════════
const LAUNCHER_MANIFEST_SOURCES = [
  'https://cdn.jsdelivr.net/gh/drmacze/DLavie-Launcher-Data@main/manifest.json',
  'https://raw.githubusercontent.com/drmacze/DLavie-Launcher-Data/main/manifest.json'
];

async function refreshLauncherRelease(cacheBust=false){
  for(const source of LAUNCHER_MANIFEST_SOURCES){
    try{
      const separator=source.includes('?')?'&':'?';
      const url=cacheBust?`${source}${separator}_t=${Date.now()}`:source;
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok)continue;
      const manifest=await response.json();
      const launcher=manifest&&manifest.launcher;
      if(!launcher||!launcher.latest_version_code||!launcher.apk_url)continue;
      LAUNCHER_VERSION_CODE=Number(launcher.latest_version_code);
      LAUNCHER_VERSION='v'+String(launcher.latest_version_name||LAUNCHER_VERSION_CODE);
      LAUNCHER_APK_URL=launcher.apk_url;
      updateVersionBadges();
      console.log('[DLavie] Launcher release from GitHub manifest:',LAUNCHER_VERSION,LAUNCHER_APK_URL);
      return true;
    }catch(error){
      console.warn('[DLavie] Manifest source failed:',source,error.message);
    }
  }
  updateVersionBadges();
  return false;
}

refreshLauncherRelease(true);

// Update all version badges in DOM""",
    "latest release loader",
)

replace_once(
    r"function updateVersionBadges\(\)\{.*?\n\}",
    """function updateVersionBadges(){
  document.querySelectorAll('[data-launcher-version]').forEach(el=>{el.textContent=LAUNCHER_VERSION;});
  document.querySelectorAll('[data-launcher-code]').forEach(el=>{el.textContent=LAUNCHER_VERSION_CODE;});
  const heroButton=document.getElementById('btnDownloadHero');
  if(heroButton)heroButton.href=LAUNCHER_APK_URL;
  window.LAUNCHER_VERSION=LAUNCHER_VERSION;
  window.LAUNCHER_VERSION_CODE=LAUNCHER_VERSION_CODE;
  window.LAUNCHER_APK_URL=LAUNCHER_APK_URL;
}""",
    "version badge updater",
)

# A click refreshes the manifest once, then starts the APK download directly.
replace_once(
    r"// ═══════════════════════════════════════════════════════════════\n// DOWNLOAD\n// ═══════════════════════════════════════════════════════════════.*?(?=// ═══════════════════════════════════════════════════════════════\n// FAQ DATA)",
    """// ═══════════════════════════════════════════════════════════════
// DOWNLOAD — direct, manifest-backed, no Supabase release lookup
// ═══════════════════════════════════════════════════════════════
async function downloadLauncher(e){
  if(e)e.preventDefault();
  await refreshLauncherRelease(true);
  if(!LAUNCHER_APK_URL||!LAUNCHER_APK_URL.startsWith('https://')){
    window.alert('Link download launcher belum tersedia. Silakan coba lagi beberapa saat.');
    return;
  }
  const anchor=document.createElement('a');
  anchor.href=LAUNCHER_APK_URL;
  anchor.download=LAUNCHER_APK_URL.split('/').pop()||'DLavie-Launcher.apk';
  anchor.rel='noopener';
  anchor.style.display='none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(()=>anchor.remove(),1500);
}

""",
    "download function",
)

# Keep footer translation copy consistent in both supported languages.
html = html.replace("© 2026 DLavie Company · FIFA Mooding Launcher", "© 2026 DLavie Company · FIFA Modding Launcher")

INDEX.write_text(html, encoding="utf-8")
print("Updated index.html with minimal manifest-backed launcher download experience.")

# dlavie-web

> ⚠️ **README ini WAJIB dibaca oleh AI agent sebelum mengubah apa pun di repo ini.**

Website resmi DLavie Launcher — landing page, portal, FAQ, issues, terms, privacy.

- **Live URL**: https://drmacze.github.io/dlavie-web/
- **Tech**: Single HTML file (`index.html`, ~2100 lines), vanilla JS, GSAP animations
- **Deploy**: GitHub Pages via Actions workflow (`.github/workflows/deploy-pages.yml`)

---

## 🚨 CRITICAL RULES FOR AI AGENTS

### 1. Jangan pecah `index.html` jadi multiple files

Semua CSS + JS + HTML ada di **satu file** `index.html`. Ini intentional untuk GitHub Pages simplicity. JANGAN split ke `style.css` / `script.js` / dll.

### 2. Jangan pakai Supabase untuk data publik

Supabase project sudah exceed egress quota. Untuk data publik (latest version, APK URL, news), pakai **GitHub raw** dari repo `DLavie-Launcher-Data`:

```javascript
// CORRECT — fetch from GitHub
fetch('https://raw.githubusercontent.com/drmacze/DLavie-Launcher-Data/main/manifest.json')

// WRONG — Supabase dead
fetch('https://lvmucsxbmadtsgrxuwmo.supabase.co/rest/v1/app_releases')
```

### 3. i18n: 2 bahasa (ID + EN)

Dictionary di `window.I18N = { id: {...}, en: {...} }`. Setiap string yang user-facing **WAJIB** punya key di kedua bahasa. Jangan hardcode teks Indonesia di HTML tanpa key i18n.

### 4. Download button behavior

Tombol download di hero section **TIDAK LANGSUNG** download APK. Flow:
1. User klik tombol "Download Launcher"
2. Popup modal muncul (English text) dengan info version + size
3. User klik "Download APK" di modal
4. Progress bar animation (GSAP)
5. `downloadLauncher()` dipanggil → trigger `<a>` click dengan `LAUNCHER_APK_URL`

Jangan ubah flow ini. Jangan langsung download tanpa konfirmasi popup.

### 5. GSAP sudah loaded via CDN

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
```

Pakai untuk: scroll reveal, hover effects, modal animations. **JANGAN** tambah library animasi lain (anime.js, framer-motion, dll).

### 6. Lenis smooth scroll sudah loaded

```html
<script src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"></script>
```

Jangan tambah library smooth scroll lain.

### 7. Jangan ubah deploy workflow

`.github/workflows/deploy-pages.yml` pakai `actions/deploy-pages@v4` (Actions-based deployment). **JANGAN** revert ke legacy Pages build (sudah stuck berkali-kali).

---

## 📁 Struktur File

```
dlavie-web/
├── index.html                              # Semua code (HTML + CSS + JS)
├── .github/workflows/deploy-pages.yml      # Deploy ke GitHub Pages
└── README.md (this file)
```

### Section di `index.html`

| Line range | Section |
|------------|---------|
| 1-15 | `<head>` — meta tags, CDN scripts (GSAP, Lenis) |
| 16-450 | `<style>` — CSS variables, components, animations |
| 451-700 | `<body>` HTML — pages (Home, Portal, FAQ, News, Issues, About, Terms, Privacy) |
| 700-1000 | `<script>` i18n dictionary (ID + EN) |
| 1000-1850 | `<script>` App logic (router, auth, download, FAQ data, issues) |
| 1850-2100 | `<script>` Init + GSAP setup + download modal logic |

---

## 🎨 Design System

### CSS Variables (`:root`)

```css
--pure-black: #000;
--carbon: #0A0A0A;
--surface-1: #0E0E0E;
--surface-2: #141414;
--text-white: #FFF;
--soft-text: #CCC;
--sub-text: #888;
--dim-text: #555;
--glass-stroke: rgba(255,255,255,0.10);
--glass-stroke-hi: rgba(255,255,255,0.20);
--danger: #FF4444;
--amber: #FFAA00;
--success: #00D26A;
--font-display: 'Clash Display', 'Space Grotesk', sans-serif;
--font-body: 'Space Grotesk', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
--ease: cubic-bezier(0.16, 1, 0.3, 1);
```

### Color palette (premium dark)

- Background: pure black `#000`
- Surface: `#0A0A0A` / `#0E0E0E` / `#141414`
- Text: white `#FFF` → `#CCC` → `#888` → `#555`
- Accent: blue `#6B8AFF` (premium download button)
- Success: green `#00D26A` (pulsing dot)
- Danger: red `#FF4444`

### Typography

- Display: Clash Display (Google Fonts via `fontshare.com`)
- Body: Space Grotesk (Google Fonts)
- Mono: JetBrains Mono (Google Fonts)

---

## 🔄 Download Button (v326)

### HTML structure

```html
<a href="#" class="btn-download" id="btnDownloadHero" onclick="openDownloadModal(event)">
  <div class="btn-download-row">
    <svg class="btn-download-icon">...</svg>
    <span class="btn-download-label" data-i18n="btn_download">Download Launcher</span>
    <span class="btn-download-ver-badge">LATEST</span>
    <svg class="btn-download-arrow">...</svg>
  </div>
  <div class="btn-download-meta">
    <span class="btn-download-meta-dot"></span>
    <span>Latest Version</span>
    <span>·</span>
    <span data-launcher-version>v8.0.26</span>
  </div>
</a>
```

### CSS — solid white-blue gradient (BUKAN glassmorphism)

```css
.btn-download {
  background: linear-gradient(135deg, #ffffff 0%, #e8eaff 50%, #ffffff 100%);
  color: var(--pure-black);
  box-shadow: 0 4px 20px rgba(107,138,255,0.25), inset 0 1px 0 rgba(255,255,255,0.9);
}
```

### i18n keys

| Key | ID | EN |
|-----|----|----|
| `btn_download` | `Download Launcher` | `Download Launcher` |
| `btn_connect` | `Connect Portal` | `Connect Portal` |
| `stat_version` | `Versi Terbaru` | `Latest Version` |

### Popup modal (English UI)

```html
<div class="dl-modal-overlay" id="dlModalOverlay">
  <div class="dl-modal" id="dlModal">
    <button class="dl-modal-close">...</button>
    <div class="dl-modal-icon">...</div>
    <div class="dl-modal-title">Download DLavie Launcher</div>
    <div class="dl-modal-subtitle">Get the latest version of DLavie Launcher for Android...</div>
    <div class="dl-modal-info">
      <div>Version | v8.0.26</div>
      <div>Release | 8.0.26-fix-news-beranda</div>
      <div>Size | ~28 MB</div>
    </div>
    <button class="dl-modal-btn" id="dlModalConfirmBtn">
      <svg>...</svg>
      <span id="dlModalConfirmLabel">Download APK</span>
      <div class="dl-modal-btn-progress" id="dlModalProgress"></div>
    </button>
    <div class="dl-modal-foot">By downloading, you agree to our Terms and Privacy Policy...</div>
  </div>
</div>
```

### GSAP animations

```javascript
// Entrance: cascade fade-up
gsap.fromTo('#dlModal .dl-modal-icon', {scale:0.5,opacity:0,rotate:-30},
  {scale:1,opacity:1,rotate:0,duration:0.6,ease:'back.out(1.7)',delay:0.1});
gsap.fromTo('#dlModal .dl-modal-title', {y:20,opacity:0},
  {y:0,opacity:1,duration:0.5,ease:'power3.out',delay:0.15});
// ... cascade for subtitle, info, button, foot

// Close: scale down + fade out
gsap.to('#dlModal', {scale:0.94,y:16,opacity:0,duration:0.25,ease:'power2.in'});

// Button hover: magnetic mouse follow
btnDL.addEventListener('mousemove', (e) => {
  const rect = btnDL.getBoundingClientRect();
  const x = (e.clientX - rect.left - rect.width/2) / rect.width;
  const y = (e.clientY - rect.top - rect.height/2) / rect.height;
  gsap.to(btnDL, {x: x*4, y: y*3, duration: 0.6, ease: 'power2.out'});
});
btnDL.addEventListener('mouseleave', () => {
  gsap.to(btnDL, {x:0, y:0, duration: 0.6, ease: 'elastic.out(1,0.3)'});
});

// Progress bar on confirm
gsap.to(prog, {width:'30%', duration:0.6, ease:'power2.out'});
gsap.to(prog, {width:'100%', duration:0.4, ease:'power2.out'});
```

---

## 🌐 External URLs (konsisten lintas repo)

| Resource | URL |
|----------|-----|
| This website | `https://drmacze.github.io/dlavie-web/` |
| Manifest (version source) | `https://raw.githubusercontent.com/drmacze/DLavie-Launcher-Data/main/manifest.json` |
| Latest APK | `https://github.com/drmacze/DLavie-Launcher-Data/releases/download/v26/DLavie26-Launcher-v{N}.apk` |
| Dev Dashboard | `https://drmacze.github.io/DLavie-Dev-Dashboard/` |
| Launcher repo | `https://github.com/drmacze/F16-Launcher` |

---

## 🔄 Version Fetching

```javascript
// On page load (around line 730)
async function fetchLatestVersion() {
  // Try manifest.json first (GitHub raw, no auth)
  const r = await fetch(
    'https://raw.githubusercontent.com/drmacze/DLavie-Launcher-Data/main/manifest.json?t=' + Date.now()
  );
  const m = await r.json();
  LAUNCHER_VERSION_CODE = m.launcher.latest_version_code;
  LAUNCHER_VERSION = 'v' + m.launcher.latest_version_name;
  LAUNCHER_APK_URL = m.launcher.apk_url;
  updateVersionBadges();
}
```

`LAUNCHER_APK_URL` dipakai oleh `downloadLauncher()` saat user klik "Download APK" di modal.

---

## 🚀 Deploy Workflow

```yaml
# .github/workflows/deploy-pages.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - uses: actions/deploy-pages@v4
        id: deployment
```

Pages setting: **Source = GitHub Actions** (NOT legacy branch deploy).

---

## 🐛 Troubleshooting

### Website tidak update setelah push

1. Cek Actions tab di GitHub — workflow "Deploy to GitHub Pages" harus success.
2. Cek Pages setting: Settings → Pages → Source harus "GitHub Actions".
3. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R) atau incognito.
4. CDN cache (Cloudflare untuk github.io) biasanya 5-10 menit.

### Tombol download tidak trigger popup

Cek console browser untuk error. Pastikan:
- `openDownloadModal` function defined
- `dlModalOverlay` element exists
- GSAP loaded (network tab)

### i18n tidak jalan

Pastikan `setLang(savedLang)` + `applyLang()` dipanggil setelah `router()` di init. Cek dictionary key match antara `data-i18n="key"` dan `I18N[lang].key`.

---

## ❓ Pertanyaan yang sering muncul di AI agent

**Q: Boleh pecah index.html jadi beberapa file?**
A: TIDAK. Single-file intentional. CSS dan JS inline.

**Q: Boleh tambah framework (React, Vue, dll)?**
A: TIDAK. Vanilla JS + GSAP sudah cukup. Tambah framework = rebuild dari nol.

**Q: Boleh ganti Supabase dengan backend lain?**
A: TIDAK perlu. Hanya pakai Supabase untuk auth (login user). Data publik ambil dari GitHub raw.

**Q: Cara ganti warna tombol download?**
A: Edit `.btn-download` di CSS (line ~106). Saat ini solid white-blue gradient. Jangan ubah ke glassmorphism (sudah pernah dicoba, user tidak suka).

**Q: Cara tambah halaman baru?**
A: Tambah route di `router()` function + tambah `<div class="page" id="page-{name}">` di HTML + tambah nav link.

**Q: Cara ganti teks tombol download?**
A: Edit `I18N.id.btn_download` dan `I18N.en.btn_download` di dictionary. Saat ini "Download Launcher" (sama untuk ID + EN).

**Q: Popup modal text bahasa apa?**
A: **English** (user request). Jangan translate ke Indonesia.

---

## 📚 Related Repos

| Repo | Purpose |
|------|---------|
| `F16-Launcher` | Android launcher app (Kotlin) |
| `DLavie-Launcher-Data` | Data resource (manifest, news, APK, OBB) |
| `DLavie-Dev-Dashboard` | Admin dashboard |
| `DLavie-Patches` | FIFA 16 mod patches |

---

**Terakhir diperbarui**: v326 (2026-07-20)

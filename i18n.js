(() => {
  'use strict';

  const SUPPORTED = [
    ['en', 'English', 'English', '🇬🇧', 'ltr'],
    ['id', 'Indonesian', 'Bahasa Indonesia', '🇮🇩', 'ltr'],
    ['ms', 'Malay', 'Bahasa Melayu', '🇲🇾', 'ltr'],
    ['pt', 'Portuguese', 'Português', '🇧🇷', 'ltr'],
    ['es', 'Spanish', 'Español', '🇪🇸', 'ltr'],
    ['de', 'German', 'Deutsch', '🇩🇪', 'ltr'],
    ['fr', 'French', 'Français', '🇫🇷', 'ltr'],
    ['ja', 'Japanese', '日本語', '🇯🇵', 'ltr'],
    ['zh', 'Chinese', '中文', '🇨🇳', 'ltr'],
    ['ar', 'Arabic', 'العربية', '🇸🇦', 'rtl'],
  ].map(([code, name, nativeName, flag, dir]) => ({ code, name, nativeName, flag, dir }));

  const EN = {
    nav_home:'Home',nav_portal:'Portal',nav_faq:'FAQ',nav_news:'News',nav_issues:'Issues',nav_about:'About',nav_terms:'Terms',nav_privacy:'Privacy',
    badge_text:'DLavie — FIFA modding, made simpler',hero_title:'DLavie Launcher.',hero_sub:'A community launcher for FIFA 16 Mobile. Install, update, and manage your game from one place.',
    btn_download:'Download Launcher',btn_connect:'Connect Portal',stat_version:'Latest version',stat_lang:'Languages',stat_data:'GB game data',
    features_label:'Features',features_title:'Everything you need, in one launcher.',
    feat_mod_title:'FIFA 16 Mod Support',feat_mod_desc:'Install the base game data and verified patches with backup and rollback support.',
    feat_community_title:'Community Hub',feat_community_desc:'Follow members, publish posts, join discussions, and see community activity.',
    feat_portal_title:'DLavie Portal',feat_portal_desc:'Use the same DLavie account on the web and launcher through a secure connection.',
    feat_security_title:'Security & Privacy',feat_security_desc:'Protected sessions, HTTPS, server-side access policies, and verified account handoff.',
    feat_sync_title:'Cross-device Account',feat_sync_desc:'Keep your account, preferences, issues, and Portal access consistent across devices.',
    portal_title:'DLavie Portal',portal_sub:'Sign in or connect your launcher account to continue.',connect_dlavie:'Connect to DLavie',login_google:'Continue with Google',
    divider_or:'or',divider_email:'or use email',btn_logout:'Sign out',label_email:'Email',label_password:'Password',label_username:'Username',label_displayname:'Display name',
    btn_masuk:'Sign in',btn_daftar:'Create account',switch_noaccount:"Don't have an account?",switch_register:'Create one',switch_haveaccount:'Already have an account?',switch_login:'Sign in',google_hint:'You can also continue with Google.',
    faq_badge:'DLavie Help Center',faq_title:'Frequently Asked Questions',faq_sub:'Clear answers for installing, connecting, and using DLavie Launcher.',faq_search:'Search questions…',faq_cat_label:'Categories',faq_cat_all:'All',
    faq_empty_title:'Choose a category',faq_empty_sub:'Or search for a specific question.',faq_noresult_title:'No results',faq_noresult_sub:'Try another keyword or category.',
    issues_label:'Community Issues',issues_title:'Track reports from DLavie users.',issues_sub:'Public reports help everyone understand known problems and progress.',btn_buatissue:'Create issue',issues_empty_title:'No issues yet',issues_empty_sub:'Be the first to report one.',
    modal_title:'Create issue',modal_sub:'Your report will be visible to the DLavie community.',label_akun:'Account',label_kategori:'Category',label_judul:'Issue title',label_detail:'Issue details',
    ph_judul:'Short summary of the issue',ph_detail:'Describe what happened and how to reproduce it…',btn_kirim:'Submit issue',reply_toggle:'View reply',
    news_label:'News & Updates',news_title:'Latest from DLavie.',news_all:'All',news_update:'Updates',news_maintenance:'Maintenance',news_mechanics:'Mechanics',news_readmore:'Read more',news_empty:'No news available.',
    about_title:'DLavie',about_sub:'A community launcher for FIFA 16 Mobile modding, built with the community.',about_stat_version:'Version',about_stat_lang:'Languages',about_stat_data:'Data',about_stat_faq:'FAQ',
    about_h2_about:'About DLavie',about_p_about:'DLavie Launcher brings game installation, updates, community features, and account management into one Android application.',
    about_h2_mission:'Our mission',about_p_mission:'Make FIFA 16 Mobile modding easier, safer, and more structured for players everywhere.',about_h2_features:'Key features',about_h2_privacy:'Privacy & security',
    about_p_privacy:'DLavie uses HTTPS, protected sessions, and database access policies. We do not collect contacts, SMS, GPS, or browsing history.',about_h2_contact:'Contact',about_p_contact:'For support, create an issue or use DLavie Portal.',
    feat_li_mod:'FIFA 16 mod support — installation, patches, backup, and rollback',feat_li_community:'Community Hub — posts, comments, members, and badges',feat_li_portal:'DLavie Portal — one secure account across web and launcher',feat_li_security:'Security & privacy — verified sessions and access policies',feat_li_sync:'Cross-device account — consistent identity and preferences',
    footer_copy:'© 2026 DLavie Company · FIFA Modding Launcher',terms_h1:'Terms & Conditions',privacy_h1:'Privacy Policy',legal_updated:'Last updated: July 7, 2026',
    err_email_pwd:'Email and password are required.',err_min_title:'The title must be at least 5 characters.',err_min_body:'Please provide at least 10 characters of detail.',err_spam:'Use a clear, descriptive title.',err_all_fields:'Complete all required fields.',err_min_pwd:'Password must be at least 6 characters.',
    toast_login_ok:'Signed in successfully.',toast_register_ok:'Account created successfully.',toast_connect_ok:'Launcher connected successfully.',toast_issue_ok:'Issue created successfully.',toast_logout:'Signed out.',
    info_title:'Connect to DLavie',info_sub:'Complete these steps to connect securely:',info_step1:'Install DLavie Launcher',info_step1_desc:'Download the current launcher build.',info_step2:'Approve your account',info_step2_desc:'Sign in to Portal and confirm the active account.',info_step3:'Return automatically',info_step3_desc:'The verified launcher opens the same account.',info_download:'Download Launcher',info_login_manual:'Sign in manually',auth_login_manual:'or sign in manually',
    lang_label:'Language',lang_auto:'Follow browser language',lang_change:'Change language',lang_fallback:'Some long-form content may use English when a translation is not available.',
    register_google:'Create account with Google',auth_no_account:"Don't have an account?",auth_register_here:'Create one',auth_have_account:'Already have an account?',auth_login_here:'Sign in',auth_google_hint:'Or continue with Google above',
    status_loading:'Loading…',status_saving:'Saving…',status_error:'Something went wrong.',action_retry:'Try again',action_close:'Close',action_cancel:'Cancel',action_continue:'Continue'
  };

  const ID = {
    ...EN,
    nav_home:'Beranda',nav_news:'Berita',nav_issues:'Issue',nav_about:'Tentang',nav_terms:'Syarat',nav_privacy:'Privasi',
    badge_text:'DLavie — modding FIFA yang lebih mudah',hero_title:'DLavie Launcher.',hero_sub:'Launcher komunitas untuk FIFA 16 Mobile. Instal, perbarui, dan kelola game dari satu tempat.',
    btn_download:'Unduh Launcher',btn_connect:'Hubungkan Portal',stat_version:'Versi terbaru',stat_lang:'Bahasa',stat_data:'GB data game',
    features_label:'Fitur',features_title:'Semua yang dibutuhkan, dalam satu launcher.',
    feat_mod_desc:'Instal data game dan patch terverifikasi dengan dukungan backup serta rollback.',feat_community_desc:'Ikuti anggota, buat postingan, berdiskusi, dan lihat aktivitas komunitas.',feat_portal_desc:'Gunakan akun DLavie yang sama di website dan launcher melalui koneksi aman.',feat_security_desc:'Sesi terlindungi, HTTPS, kebijakan akses server, dan penghubungan akun terverifikasi.',feat_sync_title:'Akun lintas perangkat',feat_sync_desc:'Pertahankan akun, preferensi, issue, dan akses Portal di semua perangkat.',
    portal_sub:'Masuk atau hubungkan akun launcher untuk melanjutkan.',connect_dlavie:'Hubungkan ke DLavie',login_google:'Lanjutkan dengan Google',divider_or:'atau',divider_email:'atau gunakan email',btn_logout:'Keluar',label_displayname:'Nama tampilan',btn_masuk:'Masuk',btn_daftar:'Buat akun',
    switch_noaccount:'Belum punya akun?',switch_register:'Buat akun',switch_haveaccount:'Sudah punya akun?',switch_login:'Masuk',google_hint:'Anda juga dapat melanjutkan dengan Google.',
    faq_badge:'Pusat Bantuan DLavie',faq_title:'Pertanyaan yang Sering Diajukan',faq_sub:'Jawaban jelas untuk instalasi, koneksi, dan penggunaan DLavie Launcher.',faq_search:'Cari pertanyaan…',faq_cat_label:'Kategori',faq_cat_all:'Semua',faq_empty_title:'Pilih kategori',faq_empty_sub:'Atau cari pertanyaan tertentu.',faq_noresult_title:'Tidak ada hasil',faq_noresult_sub:'Coba kata kunci atau kategori lain.',
    issues_label:'Issue Komunitas',issues_title:'Pantau laporan pengguna DLavie.',issues_sub:'Laporan publik membantu semua orang memahami masalah dan progres.',btn_buatissue:'Buat issue',issues_empty_title:'Belum ada issue',issues_empty_sub:'Jadilah yang pertama melapor.',modal_title:'Buat issue',modal_sub:'Laporan Anda akan terlihat oleh komunitas DLavie.',label_akun:'Akun',label_kategori:'Kategori',label_judul:'Judul issue',label_detail:'Detail issue',ph_judul:'Ringkasan singkat masalah',ph_detail:'Jelaskan kejadian dan cara mengulanginya…',btn_kirim:'Kirim issue',reply_toggle:'Lihat balasan',
    news_title:'Kabar terbaru dari DLavie.',news_all:'Semua',news_update:'Pembaruan',news_readmore:'Baca selengkapnya',news_empty:'Belum ada berita.',
    about_sub:'Launcher komunitas FIFA 16 Mobile yang dibangun bersama komunitas.',about_stat_version:'Versi',about_stat_lang:'Bahasa',about_h2_about:'Tentang DLavie',about_p_about:'DLavie Launcher menyatukan instalasi game, pembaruan, komunitas, dan pengelolaan akun dalam satu aplikasi Android.',about_h2_mission:'Misi kami',about_p_mission:'Membuat modding FIFA 16 Mobile lebih mudah, aman, dan terstruktur untuk semua pemain.',about_h2_features:'Fitur utama',about_h2_privacy:'Privasi & keamanan',about_p_privacy:'DLavie menggunakan HTTPS, sesi terlindungi, dan kebijakan akses database. Kami tidak mengumpulkan kontak, SMS, GPS, atau riwayat browsing.',about_h2_contact:'Kontak',about_p_contact:'Untuk bantuan, buat issue atau gunakan DLavie Portal.',
    footer_copy:'© 2026 DLavie Company · FIFA Modding Launcher',terms_h1:'Syarat & Ketentuan',privacy_h1:'Kebijakan Privasi',legal_updated:'Terakhir diperbarui: 7 Juli 2026',
    err_email_pwd:'Email dan password wajib diisi.',err_min_title:'Judul minimal 5 karakter.',err_min_body:'Berikan detail minimal 10 karakter.',err_spam:'Gunakan judul yang jelas dan deskriptif.',err_all_fields:'Lengkapi semua kolom wajib.',err_min_pwd:'Password minimal 6 karakter.',
    toast_login_ok:'Berhasil masuk.',toast_register_ok:'Akun berhasil dibuat.',toast_connect_ok:'Launcher berhasil terhubung.',toast_issue_ok:'Issue berhasil dibuat.',toast_logout:'Berhasil keluar.',
    info_title:'Hubungkan ke DLavie',info_sub:'Selesaikan langkah berikut untuk terhubung dengan aman:',info_step1:'Instal DLavie Launcher',info_step1_desc:'Unduh build launcher terbaru.',info_step2:'Setujui akun Anda',info_step2_desc:'Masuk ke Portal dan konfirmasi akun aktif.',info_step3:'Kembali otomatis',info_step3_desc:'Launcher resmi membuka akun yang sama.',info_download:'Unduh Launcher',info_login_manual:'Masuk manual',auth_login_manual:'atau masuk manual',
    lang_label:'Bahasa',lang_auto:'Ikuti bahasa browser',lang_change:'Ubah bahasa',lang_fallback:'Sebagian konten panjang menggunakan bahasa Inggris bila terjemahan belum tersedia.',register_google:'Daftar dengan Google',auth_no_account:'Belum punya akun?',auth_register_here:'Buat akun',auth_have_account:'Sudah punya akun?',auth_login_here:'Masuk',auth_google_hint:'Atau lanjutkan dengan Google di atas',status_loading:'Memuat…',status_saving:'Menyimpan…',status_error:'Terjadi kesalahan.',action_retry:'Coba lagi',action_close:'Tutup',action_cancel:'Batal',action_continue:'Lanjutkan'
  };

  const OVERRIDES = {
    ms:{nav_home:'Laman Utama',nav_news:'Berita',nav_issues:'Isu',nav_about:'Tentang',nav_terms:'Terma',nav_privacy:'Privasi',btn_download:'Muat Turun Launcher',btn_connect:'Sambung Portal',portal_sub:'Log masuk atau sambungkan akaun launcher untuk meneruskan.',login_google:'Teruskan dengan Google',btn_masuk:'Log masuk',btn_daftar:'Cipta akaun',lang_label:'Bahasa',lang_auto:'Ikut bahasa pelayar',action_continue:'Teruskan'},
    pt:{nav_home:'Início',nav_news:'Notícias',nav_issues:'Problemas',nav_about:'Sobre',nav_terms:'Termos',nav_privacy:'Privacidade',btn_download:'Baixar Launcher',btn_connect:'Conectar Portal',portal_sub:'Entre ou conecte sua conta do launcher para continuar.',login_google:'Continuar com Google',btn_masuk:'Entrar',btn_daftar:'Criar conta',lang_label:'Idioma',lang_auto:'Seguir idioma do navegador',action_continue:'Continuar'},
    es:{nav_home:'Inicio',nav_news:'Noticias',nav_issues:'Problemas',nav_about:'Acerca de',nav_terms:'Términos',nav_privacy:'Privacidad',btn_download:'Descargar Launcher',btn_connect:'Conectar Portal',portal_sub:'Inicia sesión o conecta tu cuenta del launcher para continuar.',login_google:'Continuar con Google',btn_masuk:'Iniciar sesión',btn_daftar:'Crear cuenta',lang_label:'Idioma',lang_auto:'Usar idioma del navegador',action_continue:'Continuar'},
    de:{nav_home:'Start',nav_news:'Neuigkeiten',nav_issues:'Probleme',nav_about:'Über uns',nav_terms:'Bedingungen',nav_privacy:'Datenschutz',btn_download:'Launcher herunterladen',btn_connect:'Portal verbinden',portal_sub:'Melde dich an oder verbinde dein Launcher-Konto.',login_google:'Mit Google fortfahren',btn_masuk:'Anmelden',btn_daftar:'Konto erstellen',lang_label:'Sprache',lang_auto:'Browsersprache verwenden',action_continue:'Weiter'},
    fr:{nav_home:'Accueil',nav_news:'Actualités',nav_issues:'Problèmes',nav_about:'À propos',nav_terms:'Conditions',nav_privacy:'Confidentialité',btn_download:'Télécharger le launcher',btn_connect:'Connecter le portail',portal_sub:'Connectez-vous ou associez votre compte launcher.',login_google:'Continuer avec Google',btn_masuk:'Se connecter',btn_daftar:'Créer un compte',lang_label:'Langue',lang_auto:'Suivre la langue du navigateur',action_continue:'Continuer'},
    ja:{nav_home:'ホーム',nav_news:'ニュース',nav_issues:'問題',nav_about:'概要',nav_terms:'利用規約',nav_privacy:'プライバシー',btn_download:'ランチャーをダウンロード',btn_connect:'ポータルに接続',portal_sub:'ランチャーアカウントでログインまたは接続してください。',login_google:'Googleで続行',btn_masuk:'ログイン',btn_daftar:'アカウント作成',lang_label:'言語',lang_auto:'ブラウザの言語に従う',action_continue:'続行'},
    zh:{nav_home:'首页',nav_news:'新闻',nav_issues:'问题',nav_about:'关于',nav_terms:'条款',nav_privacy:'隐私',btn_download:'下载启动器',btn_connect:'连接门户',portal_sub:'登录或连接启动器账户以继续。',login_google:'使用 Google 继续',btn_masuk:'登录',btn_daftar:'创建账户',lang_label:'语言',lang_auto:'跟随浏览器语言',action_continue:'继续'},
    ar:{nav_home:'الرئيسية',nav_news:'الأخبار',nav_issues:'المشكلات',nav_about:'حول',nav_terms:'الشروط',nav_privacy:'الخصوصية',btn_download:'تنزيل المشغّل',btn_connect:'ربط البوابة',portal_sub:'سجّل الدخول أو اربط حساب المشغّل للمتابعة.',login_google:'المتابعة باستخدام Google',btn_masuk:'تسجيل الدخول',btn_daftar:'إنشاء حساب',lang_label:'اللغة',lang_auto:'اتباع لغة المتصفح',action_continue:'متابعة'}
  };

  const CATALOG = { en: EN, id: ID };
  for (const locale of SUPPORTED) {
    if (!CATALOG[locale.code]) CATALOG[locale.code] = { ...EN, ...(OVERRIDES[locale.code] || {}) };
  }

  const PREF_KEY = 'dlavie_locale_v2';
  const LEGACY_KEY = 'dlavie_lang';
  let preference = localStorage.getItem(PREF_KEY) || localStorage.getItem(LEGACY_KEY) || 'auto';
  let observer;
  let translating = false;

  const normalize = value => {
    const code = String(value || '').toLowerCase().replace('_', '-').split('-')[0];
    return SUPPORTED.some(item => item.code === code) ? code : 'en';
  };

  const browserLocale = () => {
    const candidates = Array.isArray(navigator.languages) && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const value of candidates) {
      const normalized = normalize(value);
      if (SUPPORTED.some(item => item.code === normalized)) return normalized;
    }
    return 'en';
  };

  const resolvedLocale = () => preference === 'auto' ? browserLocale() : normalize(preference);
  const meta = code => SUPPORTED.find(item => item.code === code) || SUPPORTED[0];

  function t(key, vars = {}, locale = resolvedLocale()) {
    const template = CATALOG[locale]?.[key] ?? EN[key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? `{${name}}`);
  }

  function applyAttributes(root) {
    root.querySelectorAll?.('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const value = t(key).trim();
        if (value) el.textContent = value;
        else if (!el.textContent.trim()) el.textContent = key;
      }
    });
    root.querySelectorAll?.('[data-i18n-ph], [data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph') || el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    root.querySelectorAll?.('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
    root.querySelectorAll?.('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });
  }

  function renderSelector() {
    const host = document.getElementById('langSelector');
    if (!host) return;
    const locale = resolvedLocale();
    const current = meta(locale);
    host.innerHTML = `
      <button class="lang-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
        <span aria-hidden="true">${current.flag}</span><span>${current.nativeName}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
      </button>
      <div class="lang-menu" role="listbox" hidden>
        <button type="button" role="option" data-locale="auto" aria-selected="${preference === 'auto'}"><span>🌐</span><span><strong>${t('lang_auto')}</strong><small>${current.nativeName}</small></span></button>
        ${SUPPORTED.map(item => `<button type="button" role="option" data-locale="${item.code}" aria-selected="${preference === item.code}"><span>${item.flag}</span><span><strong>${item.nativeName}</strong><small>${item.name}</small></span></button>`).join('')}
      </div>`;
    const trigger = host.querySelector('.lang-trigger');
    const menu = host.querySelector('.lang-menu');
    trigger.addEventListener('click', () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      trigger.setAttribute('aria-expanded', String(opening));
    });
    menu.querySelectorAll('[data-locale]').forEach(button => button.addEventListener('click', () => {
      setLocale(button.dataset.locale);
      menu.hidden = true;
    }));
  }

  async function syncProfile(localePreference) {
    const token = sessionStorage.getItem('dlavie_access');
    const userId = sessionStorage.getItem('dlavie_uid');
    if (!token || !userId) return;
    const preferred_locale = localePreference === 'auto' ? null : normalize(localePreference);
    try {
      await fetch(`https://lvmucsxbmadtsgrxuwmo.supabase.co/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          apikey: 'sb_publishable_aYFlbWVJMErOHwPsli33QQ_INJD9mhx',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ preferred_locale })
      });
    } catch (_) { /* Local preference remains valid offline. */ }
  }

  function setLocale(value, options = {}) {
    preference = value === 'auto' ? 'auto' : normalize(value);
    localStorage.setItem(PREF_KEY, preference);
    localStorage.removeItem(LEGACY_KEY);
    translate(document);
    renderSelector();
    if (options.sync !== false) syncProfile(preference);
    window.dispatchEvent(new CustomEvent('dlavie:languagechange', { detail: { locale: resolvedLocale(), preference } }));
  }

  function syncFromProfile(profile) {
    if (!profile || !profile.preferred_locale || localStorage.getItem(PREF_KEY)) return;
    setLocale(profile.preferred_locale, { sync: false });
  }

  function translate(root = document) {
    if (translating) return;
    translating = true;
    try {
      const locale = resolvedLocale();
      const localeMeta = meta(locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = localeMeta.dir;
      applyAttributes(root);
      const switcher = document.getElementById('authSwitch');
      if (switcher && switcher.dataset.mode !== 'register') {
        switcher.innerHTML = `${t('auth_no_account')} <a onclick="switchAuthMode('register')">${t('auth_register_here')}</a><br><span class="auth-google-hint">${t('auth_google_hint')}</span>`;
      }
    } finally {
      translating = false;
    }
  }

  function formatDate(value, options = { dateStyle: 'medium' }) {
    try { return new Intl.DateTimeFormat(resolvedLocale(), options).format(new Date(value)); }
    catch (_) { return String(value ?? ''); }
  }

  function formatNumber(value, options) {
    try { return new Intl.NumberFormat(resolvedLocale(), options).format(value); }
    catch (_) { return String(value ?? ''); }
  }

  function init() {
    translate(document);
    renderSelector();
    observer = new MutationObserver(records => {
      if (translating) return;
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) applyAttributes(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', event => {
      const host = document.getElementById('langSelector');
      if (host && !host.contains(event.target)) {
        const menu = host.querySelector('.lang-menu');
        const trigger = host.querySelector('.lang-trigger');
        if (menu) menu.hidden = true;
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  window.DLavieI18n = {
    supported: SUPPORTED,
    catalog: CATALOG,
    t,
    translate,
    setLocale,
    getLocale: resolvedLocale,
    getPreference: () => preference,
    formatDate,
    formatNumber,
    syncFromProfile,
    init
  };
})();
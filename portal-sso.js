(() => {
  'use strict';

  const SUPABASE_URL = 'https://lvmucsxbmadtsgrxuwmo.supabase.co';
  const ANON_KEY = 'sb_publishable_aYFlbWVJMErOHwPsli33QQ_INJD9mhx';
  const ENDPOINT = `${SUPABASE_URL}/functions/v1/launcher-sso`;
  const VERIFIED_CALLBACK = 'https://drmacze.github.io/launcher/auth/callback/';
  const PENDING_KEY = 'dlavie_launcher_sso_request';
  const START_KEY = 'dlavie_launcher_connect_start';
  const GOOGLE_VERIFIER = 'dlavie_google_pkce_verifier';
  const GOOGLE_STATE = 'dlavie_google_pkce_state';
  const GOOGLE_STARTED = 'dlavie_google_pkce_started';
  const REQUEST_TTL_MS = 3 * 60 * 1000;
  const START_TTL_MS = 10 * 60 * 1000;
  let authorizing = false;
  let preparing = false;

  const validBase64Url = (value, min = 32, max = 128) =>
    typeof value === 'string' && value.length >= min && value.length <= max && /^[A-Za-z0-9_-]+$/.test(value);

  function base64Url(bytes) {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function randomSecret(size = 32) {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return base64Url(bytes);
  }

  async function codeChallenge(verifier) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return base64Url(new Uint8Array(digest));
  }

  function normalizeRequestedCallback(value) {
    if (!value) return '';
    return value === VERIFIED_CALLBACK ? VERIFIED_CALLBACK : null;
  }

  function isTrustedCallbackResult(value, request) {
    if (typeof value !== 'string') return false;
    try {
      const callback = new URL(value);
      const verifiedRequested = request.callback_uri === VERIFIED_CALLBACK;
      if (verifiedRequested) {
        const expected = new URL(VERIFIED_CALLBACK);
        if (callback.protocol !== expected.protocol ||
            callback.hostname !== expected.hostname ||
            callback.port !== expected.port ||
            callback.pathname !== expected.pathname ||
            callback.username || callback.password || callback.hash) {
          return false;
        }
      } else if (callback.protocol !== 'dlavie:' ||
                 callback.hostname !== 'portal-complete' ||
                 (callback.pathname && callback.pathname !== '/') ||
                 callback.username || callback.password || callback.port || callback.hash) {
        return false;
      }

      const names = [...callback.searchParams.keys()].sort();
      if (names.length !== 2 || names[0] !== 'code' || names[1] !== 'state') return false;
      const code = callback.searchParams.get('code') || '';
      const state = callback.searchParams.get('state') || '';
      return validBase64Url(code) && validBase64Url(state) && state === request.state;
    } catch {
      return false;
    }
  }

  function toast(message) {
    if (typeof window.showToast === 'function') window.showToast(message);
    else console.info('[DLavie]', message);
  }

  function session() {
    const access = sessionStorage.getItem('dlavie_access') || '';
    const uid = sessionStorage.getItem('dlavie_uid') || '';
    const email = sessionStorage.getItem('dlavie_email') || '';
    return access && uid ? { access, uid, email } : null;
  }

  async function callBackend(action, payload = {}, accessToken = '') {
    const headers = {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken || ANON_KEY}`,
    };
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...payload }),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.details = data;
      throw error;
    }
    return data;
  }

  function ensureFlowStyles() {
    if (document.getElementById('portalConnectFlowStyles')) return;
    const style = document.createElement('style');
    style.id = 'portalConnectFlowStyles';
    style.textContent = `
      .pcf-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.9);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:center;padding:22px;font-family:'Space Grotesk',system-ui,sans-serif}
      .pcf-card{width:min(430px,100%);border-radius:26px;background:#0d0e0e;border:1px solid rgba(255,255,255,.11);box-shadow:0 30px 100px rgba(0,0,0,.68);padding:26px;color:#fff}
      .pcf-head{display:flex;gap:14px;align-items:center;margin-bottom:20px}.pcf-logo{width:48px;height:48px;border-radius:15px;background:#151616;border:1px solid rgba(255,255,255,.08);display:grid;place-items:center;font-weight:800;font-size:17px;flex:none}
      .pcf-eyebrow{font-size:10px;letter-spacing:.11em;color:#A6A6A6;font-weight:700;text-transform:uppercase;margin-bottom:4px}.pcf-title{margin:0;font-size:21px;line-height:1.2;font-weight:750}.pcf-message{margin:0 0 5px;color:#D0D0D0;font-size:13px;line-height:1.55}.pcf-detail{margin:0;color:#A0A0A0;font-size:11px;line-height:1.5}
      .pcf-steps{margin:20px 0;padding:14px;border-radius:18px;background:#090a0a;border:1px solid rgba(255,255,255,.07);display:grid;gap:12px}.pcf-step{display:flex;align-items:center;gap:10px}.pcf-step-dot{width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;font-size:10px;font-weight:800;color:#9A9A9A;flex:none}.pcf-step.active .pcf-step-dot{color:#fff;background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.28)}.pcf-step.done .pcf-step-dot{color:#35d07f;background:rgba(53,208,127,.12);border-color:rgba(53,208,127,.32)}.pcf-step-copy strong{display:block;font-size:12px;color:#A8A8A8}.pcf-step-copy span{display:block;font-size:10px;color:#898989;margin-top:2px}.pcf-step.active .pcf-step-copy strong,.pcf-step.done .pcf-step-copy strong{color:#eee}.pcf-step.active .pcf-step-copy span,.pcf-step.done .pcf-step-copy span{color:#B0B0B0}
      .pcf-busy{width:24px;height:24px;margin:6px auto 18px;border:2px solid rgba(255,255,255,.15);border-top-color:#fff;border-radius:50%;animation:pcfSpin .8s linear infinite}.pcf-success{width:30px;height:30px;margin:6px auto 18px;border-radius:50%;background:#35d07f;color:#07120c;display:grid;place-items:center;font-weight:900}.pcf-error{width:30px;height:30px;margin:6px auto 18px;border-radius:50%;background:rgba(255,82,82,.14);color:#ff7777;display:grid;place-items:center;font-weight:900}
      .pcf-actions{display:grid;gap:9px}.pcf-primary,.pcf-secondary{width:100%;height:50px;border-radius:14px;font:700 13px 'Space Grotesk',system-ui,sans-serif;cursor:pointer}.pcf-primary{border:0;background:#fff;color:#050505}.pcf-primary:disabled{opacity:.45;cursor:not-allowed}.pcf-secondary{border:1px solid rgba(255,255,255,.12);background:transparent;color:#D0D0D0}.pcf-security{margin:16px 0 0;text-align:center;color:#949494;font-size:10px;line-height:1.5}
      .pcf-notice{position:fixed;z-index:9998;left:16px;right:16px;top:max(16px,env(safe-area-inset-top));margin:auto;width:min(560px,calc(100% - 32px));padding:14px 15px;border-radius:16px;background:rgba(16,17,17,.97);border:1px solid rgba(255,255,255,.11);box-shadow:0 14px 50px rgba(0,0,0,.52);display:flex;align-items:flex-start;gap:11px;color:#fff;font-family:'Space Grotesk',system-ui,sans-serif}.pcf-notice-dot{width:8px;height:8px;border-radius:50%;background:#fff;margin-top:5px;flex:none}.pcf-notice-copy{flex:1}.pcf-notice-copy strong{display:block;font-size:12px}.pcf-notice-copy span{display:block;color:#B8B8B8;font-size:11px;line-height:1.45;margin-top:3px}.pcf-notice button{border:0;background:transparent;color:#B0B0B0;font-size:18px;line-height:1;cursor:pointer;padding:0 2px}
      @keyframes pcfSpin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(style);
  }

  function removeFlow() {
    document.getElementById('portalSsoOverlay')?.remove();
  }

  function removeNotice() {
    document.getElementById('portalConnectNotice')?.remove();
  }

  function renderSteps(activeStep, success = false) {
    const steps = [
      ['Akun Portal', 'Masuk dan pilih akun'],
      ['Verifikasi aman', 'Setujui koneksi launcher'],
      ['Launcher terhubung', 'Kembali secara otomatis'],
    ];
    return `<div class="pcf-steps">${steps.map((step, index) => {
      const number = index + 1;
      const done = success || number < activeStep;
      const active = !success && number === activeStep;
      const cls = done ? 'done' : (active ? 'active' : '');
      return `<div class="pcf-step ${cls}"><div class="pcf-step-dot">${done ? '✓' : number}</div><div class="pcf-step-copy"><strong>${step[0]}</strong><span>${step[1]}</span></div></div>`;
    }).join('')}</div>`;
  }

  function renderFlow(options) {
    ensureFlowStyles();
    removeFlow();
    const overlay = document.createElement('div');
    overlay.id = 'portalSsoOverlay';
    overlay.className = 'pcf-overlay';
    const stateIcon = options.error
      ? '<div class="pcf-error">!</div>'
      : options.success
        ? '<div class="pcf-success">✓</div>'
        : options.busy
          ? '<div class="pcf-busy"></div>'
          : '';
    overlay.innerHTML = `
      <section class="pcf-card" role="dialog" aria-modal="true" aria-labelledby="pcfTitle">
        <div class="pcf-head"><div class="pcf-logo">DL</div><div><div class="pcf-eyebrow">DLavie Secure Connect</div><h2 class="pcf-title" id="pcfTitle"></h2></div></div>
        <p class="pcf-message" id="pcfMessage"></p>
        <p class="pcf-detail" id="pcfDetail"></p>
        ${renderSteps(options.step || 1, Boolean(options.success))}
        ${stateIcon}
        <div class="pcf-actions" id="pcfActions"></div>
        <p class="pcf-security">Kode sekali pakai • password dan token tidak dikirim melalui tautan</p>
      </section>`;
    overlay.querySelector('#pcfTitle').textContent = options.title || 'Hubungkan Launcher';
    overlay.querySelector('#pcfMessage').textContent = options.message || '';
    const detail = overlay.querySelector('#pcfDetail');
    detail.textContent = options.detail || '';
    detail.hidden = !options.detail;
    const actions = overlay.querySelector('#pcfActions');
    if (options.primaryLabel && typeof options.onPrimary === 'function') {
      const primary = document.createElement('button');
      primary.type = 'button';
      primary.className = 'pcf-primary';
      primary.textContent = options.primaryLabel;
      primary.addEventListener('click', options.onPrimary);
      actions.appendChild(primary);
    }
    if (options.secondaryLabel && typeof options.onSecondary === 'function') {
      const secondary = document.createElement('button');
      secondary.type = 'button';
      secondary.className = 'pcf-secondary';
      secondary.textContent = options.secondaryLabel;
      secondary.addEventListener('click', options.onSecondary);
      actions.appendChild(secondary);
    }
    if (!actions.children.length) actions.hidden = true;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showNotice(message) {
    ensureFlowStyles();
    let notice = document.getElementById('portalConnectNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'portalConnectNotice';
      notice.className = 'pcf-notice';
      notice.innerHTML = '<div class="pcf-notice-dot"></div><div class="pcf-notice-copy"><strong>Hubungkan Launcher</strong><span></span></div><button type="button" aria-label="Batalkan">×</button>';
      notice.querySelector('button').addEventListener('click', () => {
        clearStartIntent();
        removeNotice();
      });
      document.body.appendChild(notice);
    }
    notice.querySelector('span').textContent = message;
  }

  function showConnecting(step, title, message, detail = '') {
    removeNotice();
    renderFlow({ step, title, message, detail, busy: true });
  }

  function showFlowError(title, message, retry) {
    renderFlow({
      step: 1,
      title,
      message,
      detail: 'Tidak ada akun atau token yang disimpan dari proses yang gagal.',
      error: true,
      primaryLabel: retry ? 'Coba Lagi' : '',
      onPrimary: retry,
      secondaryLabel: 'Tutup',
      onSecondary: removeFlow,
    });
  }

  function captureLauncherStartIntent() {
    const url = new URL(location.href);
    let requested = url.searchParams.get('launcher_connect') === '1';
    if (requested) url.searchParams.delete('launcher_connect');

    const rawHash = (url.hash || '#/portal').replace(/^#/, '');
    const separator = rawHash.indexOf('?');
    const route = separator >= 0 ? rawHash.slice(0, separator) : rawHash;
    const hashParams = new URLSearchParams(separator >= 0 ? rawHash.slice(separator + 1) : '');
    if (hashParams.get('from') === 'launcher') requested = true;
    hashParams.delete('from');
    const cleanHash = `#${route || '/portal'}${hashParams.toString() ? `?${hashParams}` : ''}`;
    url.hash = cleanHash;

    if (requested) {
      sessionStorage.setItem(START_KEY, JSON.stringify({ received_at: Date.now() }));
      history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    }
  }

  function startIntent() {
    try {
      const value = JSON.parse(sessionStorage.getItem(START_KEY) || 'null');
      if (!value || Date.now() - Number(value.received_at || 0) > START_TTL_MS) {
        clearStartIntent();
        return null;
      }
      return value;
    } catch {
      clearStartIntent();
      return null;
    }
  }

  function clearStartIntent() {
    sessionStorage.removeItem(START_KEY);
  }

  function renderLauncherStartGuide() {
    if (!startIntent() || pendingRequest() || authorizing || preparing) return false;
    const current = session();
    if (!current) {
      if (!location.hash.startsWith('#/portal')) location.hash = '#/portal';
      showNotice('Masuk ke akun Portal terlebih dahulu. Setelah login, proses koneksi akan dilanjutkan.');
      return false;
    }

    removeNotice();
    const account = current.email ? `Akun aktif: ${current.email}` : 'Akun Portal aktif akan digunakan.';
    renderFlow({
      step: 1,
      title: 'Hubungkan Launcher',
      message: 'Portal akan menghubungkan akun yang sedang aktif ke DLavie Launcher.',
      detail: account,
      primaryLabel: 'Lanjutkan ke Launcher',
      onPrimary: connect,
      secondaryLabel: 'Nanti Saja',
      onSecondary: () => {
        clearStartIntent();
        removeFlow();
      },
    });
    return true;
  }

  function captureLauncherRequest() {
    const url = new URL(location.href);
    if (url.searchParams.get('launcher_sso') !== '1') return;
    const callbackUri = normalizeRequestedCallback(url.searchParams.get('callback_uri') || '');
    const request = {
      capability: url.searchParams.get('cap') || '',
      code_challenge: url.searchParams.get('challenge') || '',
      state: url.searchParams.get('state') || '',
      callback_uri: callbackUri,
      received_at: Date.now(),
    };
    ['launcher_sso', 'cap', 'challenge', 'state', 'callback_uri'].forEach(key => url.searchParams.delete(key));
    history.replaceState({}, document.title, url.pathname + url.search + (url.hash || '#/portal'));
    clearStartIntent();
    removeNotice();

    if (!validBase64Url(request.capability) ||
        !validBase64Url(request.code_challenge, 43) ||
        !validBase64Url(request.state) ||
        request.callback_uri === null) {
      sessionStorage.removeItem(PENDING_KEY);
      showFlowError(
        'Permintaan tidak valid',
        'Launcher tidak mengirim permintaan yang dapat diverifikasi. Mulai kembali dari aplikasi.',
      );
      return;
    }
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(request));
  }

  function pendingRequest() {
    try {
      const request = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
      if (!request || Date.now() - Number(request.received_at || 0) > REQUEST_TTL_MS) {
        sessionStorage.removeItem(PENDING_KEY);
        return null;
      }
      if (normalizeRequestedCallback(request.callback_uri || '') === null) {
        sessionStorage.removeItem(PENDING_KEY);
        return null;
      }
      return request;
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
  }

  async function processPendingLauncherRequest() {
    const request = pendingRequest();
    if (!request || authorizing) return false;
    const current = session();
    if (!current) {
      if (!location.hash.startsWith('#/portal')) location.hash = '#/portal';
      showNotice('Login diperlukan untuk menyelesaikan verifikasi launcher. Permintaan ini berlaku selama tiga menit.');
      return false;
    }

    authorizing = true;
    showConnecting(2, 'Memverifikasi akun Portal', 'Portal sedang menyetujui akun aktif untuk launcher resmi.', current.email || '');
    try {
      const result = await callBackend('authorize', request, current.access);
      if (!isTrustedCallbackResult(result.callback_uri, request)) {
        throw new Error('invalid_callback');
      }
      sessionStorage.removeItem(PENDING_KEY);
      showConnecting(3, 'Kembali ke Launcher', 'Persetujuan berhasil. Launcher akan dibuka secara otomatis.', 'Jangan tutup halaman ini.');
      location.assign(result.callback_uri);
      return true;
    } catch (error) {
      console.error('Portal launcher authorization failed', error);
      sessionStorage.removeItem(PENDING_KEY);
      showFlowError(
        'Koneksi belum selesai',
        error.status === 401
          ? 'Sesi Portal sudah berakhir. Login kembali lalu mulai koneksi sekali lagi.'
          : 'Permintaan koneksi gagal atau sudah kedaluwarsa.',
        () => {
          sessionStorage.setItem(START_KEY, JSON.stringify({ received_at: Date.now() }));
          removeFlow();
          renderLauncherStartGuide();
        },
      );
      return false;
    } finally {
      authorizing = false;
    }
  }

  async function connect() {
    const current = session();
    if (!current) {
      sessionStorage.setItem(START_KEY, JSON.stringify({ received_at: Date.now() }));
      location.hash = '#/portal';
      removeFlow();
      showNotice('Masuk ke Portal terlebih dahulu. Setelah login, tombol lanjut akan muncul otomatis.');
      return false;
    }
    if (!/Android/i.test(navigator.userAgent || '')) {
      if (typeof window.showPortalInfo === 'function') window.showPortalInfo();
      return false;
    }
    if (preparing) return false;

    preparing = true;
    showConnecting(1, 'Menyiapkan koneksi', 'Portal sedang membuat permintaan satu kali untuk akun Anda.', current.email || '');
    try {
      const result = await callBackend('prepare', {}, current.access);
      const capability = result.capability || '';
      if (!validBase64Url(capability)) throw new Error('invalid_capability');
      showConnecting(2, 'Membuka Launcher', 'Permintaan siap. Izinkan browser membuka DLavie Launcher.', 'Proses akan dilanjutkan secara otomatis.');
      const fallback = encodeURIComponent(`${location.origin}${location.pathname}#/portal`);
      location.href = `intent://connect?cap=${encodeURIComponent(capability)}#Intent;scheme=dlavie;package=com.drmacze.f16launcher;S.browser_fallback_url=${fallback};end`;
      return true;
    } catch (error) {
      console.error('Portal launcher prepare failed', error);
      showFlowError(
        'Koneksi belum dapat dimulai',
        error.status === 401
          ? 'Sesi Portal sudah berakhir. Login kembali untuk melanjutkan.'
          : 'Portal belum dapat membuat permintaan koneksi. Periksa internet lalu coba lagi.',
        connect,
      );
      return false;
    } finally {
      preparing = false;
    }
  }

  async function loginWithGoogle() {
    try {
      const verifier = randomSecret(64);
      const challenge = await codeChallenge(verifier);
      const state = randomSecret(32);
      sessionStorage.setItem(GOOGLE_VERIFIER, verifier);
      sessionStorage.setItem(GOOGLE_STATE, state);
      sessionStorage.setItem(GOOGLE_STARTED, String(Date.now()));
      const redirectTo = `${location.origin}${location.pathname}`;
      const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
      url.searchParams.set('provider', 'google');
      url.searchParams.set('redirect_to', redirectTo);
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
      url.searchParams.set('state', state);
      url.searchParams.set('prompt', 'select_account');
      location.assign(url.toString());
      return true;
    } catch (error) {
      console.error('Google PKCE initialization failed', error);
      toast('Login Google tidak dapat dimulai. Periksa browser dan coba lagi.');
      return false;
    }
  }

  async function handleOAuthCallback() {
    const url = new URL(location.href);
    const code = url.searchParams.get('code');
    const oauthError = url.searchParams.get('error');
    if (!code && !oauthError) return false;

    const verifier = sessionStorage.getItem(GOOGLE_VERIFIER) || '';
    const expectedState = sessionStorage.getItem(GOOGLE_STATE) || '';
    const startedAt = Number(sessionStorage.getItem(GOOGLE_STARTED) || '0');
    const returnedState = url.searchParams.get('state') || '';
    [GOOGLE_VERIFIER, GOOGLE_STATE, GOOGLE_STARTED].forEach(key => sessionStorage.removeItem(key));
    ['code', 'error', 'error_description', 'state'].forEach(key => url.searchParams.delete(key));
    history.replaceState({}, document.title, url.pathname + url.search + (url.hash || ''));

    if (oauthError) {
      toast('Login Google dibatalkan atau ditolak oleh provider.');
      return true;
    }
    if (!verifier || !startedAt || Date.now() - startedAt > 10 * 60 * 1000 ||
        (returnedState && expectedState && returnedState !== expectedState)) {
      toast('Sesi Google tidak cocok atau sudah kedaluwarsa. Mulai login kembali.');
      return true;
    }

    showConnecting(1, 'Memverifikasi login Google', 'Portal sedang menukar kode login dan memeriksa identitas akun.', '');
    try {
      const tokenResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      const authSession = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !authSession.access_token || !authSession.refresh_token) {
        throw new Error(authSession.error_description || authSession.msg || 'pkce_exchange_failed');
      }

      const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${authSession.access_token}`, Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      const user = await userResponse.json().catch(() => ({}));
      if (!userResponse.ok || !user.id || (authSession.user?.id && authSession.user.id !== user.id)) {
        throw new Error('session_verification_failed');
      }

      sessionStorage.setItem('dlavie_access', authSession.access_token);
      sessionStorage.setItem('dlavie_refresh', authSession.refresh_token);
      sessionStorage.setItem('dlavie_uid', user.id);
      sessionStorage.setItem('dlavie_email', user.email || '');
      sessionStorage.setItem('dlavie_oauth_completed', '1');
      removeFlow();
      location.reload();
      return true;
    } catch (error) {
      console.error('Google OAuth callback failed', error);
      removeFlow();
      ['dlavie_access', 'dlavie_refresh', 'dlavie_uid', 'dlavie_email'].forEach(key => sessionStorage.removeItem(key));
      toast('Login Google gagal diverifikasi. Coba lagi atau gunakan email dan password.');
      return true;
    }
  }

  captureLauncherStartIntent();
  captureLauncherRequest();
  window.DLaviePortalSso = {
    connect,
    loginWithGoogle,
    handleOAuthCallback,
    processPendingLauncherRequest,
    renderLauncherStartGuide,
  };

  window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('dlavie_oauth_completed') === '1') {
      sessionStorage.removeItem('dlavie_oauth_completed');
      location.hash = '#/portal';
      toast('Login Google berhasil.');
    }

    const tick = () => {
      if (pendingRequest()) {
        processPendingLauncherRequest();
        return true;
      }
      if (startIntent()) {
        renderLauncherStartGuide();
        return true;
      }
      removeNotice();
      return false;
    };

    tick();
    const timer = window.setInterval(() => {
      if (!tick()) window.clearInterval(timer);
    }, 700);
  });
})();

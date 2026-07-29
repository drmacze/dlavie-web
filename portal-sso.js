(() => {
  'use strict';

  const SUPABASE_URL = 'https://lvmucsxbmadtsgrxuwmo.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Imx2bXVjc3hibWFkdHNncnh1d21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODUyODksImV4cCI6MjA5ODU2MTI4OX0.y-1sE6uYTn4Wbter6g6NozY6uojzD5x9YVeYif-5nJs';
  const ENDPOINT = `${SUPABASE_URL}/functions/v1/launcher-sso`;
  const PENDING_KEY = 'dlavie_launcher_sso_request';
  const GOOGLE_VERIFIER = 'dlavie_google_pkce_verifier';
  const GOOGLE_STATE = 'dlavie_google_pkce_state';
  const GOOGLE_STARTED = 'dlavie_google_pkce_started';
  const REQUEST_TTL_MS = 3 * 60 * 1000;
  let authorizing = false;

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

  function toast(message) {
    if (typeof window.showToast === 'function') window.showToast(message);
    else console.info('[DLavie]', message);
  }

  function session() {
    const access = sessionStorage.getItem('dlavie_access') || '';
    const uid = sessionStorage.getItem('dlavie_uid') || '';
    return access && uid ? { access, uid } : null;
  }

  async function callBackend(action, payload = {}, accessToken = '') {
    const headers = {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    headers.Authorization = `Bearer ${accessToken || ANON_KEY}`;
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

  function showConnecting(message) {
    let overlay = document.getElementById('portalSsoOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'portalSsoOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:center;padding:24px';
      overlay.innerHTML = `
        <div style="width:min(420px,100%);padding:32px;border-radius:28px;background:#0d0f0e;border:1px solid rgba(255,255,255,.12);text-align:center;box-shadow:0 30px 100px rgba(0,0,0,.65)">
          <div style="width:68px;height:68px;margin:0 auto 20px;border-radius:22px;background:#171918;display:grid;place-items:center;font:800 23px 'Space Grotesk',sans-serif">DL</div>
          <h2 style="font:700 24px 'Clash Display','Space Grotesk',sans-serif;margin:0 0 10px">Secure Connect</h2>
          <p id="portalSsoMessage" style="margin:0;color:#aaa;font:400 14px/1.6 'Space Grotesk',sans-serif"></p>
          <div style="width:28px;height:28px;margin:24px auto 0;border:2px solid rgba(255,255,255,.18);border-top-color:#fff;border-radius:50%;animation:portalSsoSpin .8s linear infinite"></div>
          <style>@keyframes portalSsoSpin{to{transform:rotate(360deg)}}</style>
        </div>`;
      document.body.appendChild(overlay);
    }
    const text = document.getElementById('portalSsoMessage');
    if (text) text.textContent = message;
  }

  function hideConnecting() {
    document.getElementById('portalSsoOverlay')?.remove();
  }

  function captureLauncherRequest() {
    const url = new URL(location.href);
    if (url.searchParams.get('launcher_sso') !== '1') return;
    const request = {
      capability: url.searchParams.get('cap') || '',
      code_challenge: url.searchParams.get('challenge') || '',
      state: url.searchParams.get('state') || '',
      received_at: Date.now(),
    };
    ['launcher_sso', 'cap', 'challenge', 'state'].forEach(key => url.searchParams.delete(key));
    history.replaceState({}, document.title, url.pathname + url.search + (url.hash || '#/portal'));

    if (!validBase64Url(request.capability) ||
        !validBase64Url(request.code_challenge, 43) ||
        !validBase64Url(request.state)) {
      sessionStorage.removeItem(PENDING_KEY);
      toast('Permintaan launcher tidak valid. Mulai Connect kembali dari Portal.');
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
      if (location.hash !== '#/portal') location.hash = '#/portal';
      return false;
    }

    authorizing = true;
    showConnecting('Mengotorisasi akun Portal yang aktif untuk launcher resmi…');
    try {
      const result = await callBackend('authorize', request, current.access);
      if (!result.callback_uri || !result.callback_uri.startsWith('dlavie://portal-complete?')) {
        throw new Error('invalid_callback');
      }
      sessionStorage.removeItem(PENDING_KEY);
      showConnecting('Otorisasi berhasil. Kembali ke launcher…');
      location.href = result.callback_uri;
      return true;
    } catch (error) {
      console.error('Portal launcher authorization failed', error);
      sessionStorage.removeItem(PENDING_KEY);
      hideConnecting();
      toast(error.status === 401
        ? 'Sesi Portal berakhir. Login kembali lalu tekan Connect.'
        : 'Koneksi launcher gagal atau kedaluwarsa. Silakan coba lagi.');
      return false;
    } finally {
      authorizing = false;
    }
  }

  async function connect() {
    const current = session();
    if (!current) {
      location.hash = '#/portal';
      toast('Login ke Portal terlebih dahulu untuk menghubungkan akun yang sama.');
      return false;
    }
    if (!/Android/i.test(navigator.userAgent || '')) {
      if (typeof window.showPortalInfo === 'function') window.showPortalInfo();
      return false;
    }

    showConnecting('Membuat capability satu kali untuk akun Portal Anda…');
    try {
      const result = await callBackend('prepare', {}, current.access);
      const capability = result.capability || '';
      if (!validBase64Url(capability)) throw new Error('invalid_capability');
      hideConnecting();
      const fallback = encodeURIComponent(`${location.origin}${location.pathname}#/portal`);
      location.href = `intent://connect?cap=${encodeURIComponent(capability)}#Intent;scheme=dlavie;package=com.drmacze.f16launcher;S.browser_fallback_url=${fallback};end`;
      return true;
    } catch (error) {
      console.error('Portal launcher prepare failed', error);
      hideConnecting();
      toast(error.status === 401
        ? 'Sesi Portal berakhir. Login kembali.'
        : 'Secure Connect belum dapat dimulai. Coba beberapa saat lagi.');
      return false;
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

    showConnecting('Menukar kode Google dan memverifikasi sesi…');
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
      hideConnecting();
      location.reload();
      return true;
    } catch (error) {
      console.error('Google OAuth callback failed', error);
      hideConnecting();
      ['dlavie_access', 'dlavie_refresh', 'dlavie_uid', 'dlavie_email'].forEach(key => sessionStorage.removeItem(key));
      toast('Login Google gagal diverifikasi. Coba lagi atau gunakan email dan password.');
      return true;
    }
  }

  captureLauncherRequest();
  window.DLaviePortalSso = { connect, loginWithGoogle, handleOAuthCallback, processPendingLauncherRequest };

  window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('dlavie_oauth_completed') === '1') {
      sessionStorage.removeItem('dlavie_oauth_completed');
      location.hash = '#/portal';
      toast('Login Google berhasil.');
    }
    processPendingLauncherRequest();
    const timer = window.setInterval(() => {
      if (!pendingRequest()) {
        window.clearInterval(timer);
        return;
      }
      processPendingLauncherRequest();
    }, 500);
  });
})();

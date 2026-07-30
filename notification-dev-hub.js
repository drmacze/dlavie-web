(() => {
  'use strict';

  const SUPABASE_URL = 'https://lvmucsxbmadtsgrxuwmo.supabase.co';
  const ANON_KEY = 'sb_publishable_aYFlbWVJMErOHwPsli33QQ_INJD9mhx';
  const ENDPOINT = `${SUPABASE_URL}/functions/v1/notification-control`;
  const PRIVILEGED_ROLES = new Set(['owner', 'developer', 'admin']);
  const CATEGORIES = {
    general: { label: 'General', accent: '#00e5ff' },
    update: { label: 'Update', accent: '#00e676' },
    maintenance: { label: 'Maintenance', accent: '#ffab00' },
    community: { label: 'Community', accent: '#b388ff' },
  };

  let state = {
    stats: null,
    campaigns: [],
    estimate: null,
    loading: true,
    sending: false,
    error: '',
    result: null,
  };
  let estimateTimer = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[ch]);
  }

  function accessToken() {
    return sessionStorage.getItem('dlavie_access') || '';
  }

  function canManage() {
    return Boolean(window.currentUser && PRIVILEGED_ROLES.has(String(window.currentUser.role || '').toLowerCase()));
  }

  async function call(action, payload = {}) {
    const token = accessToken();
    if (!token) throw Object.assign(new Error('Sesi tidak ditemukan. Silakan login ulang.'), { status: 401 });
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ action, ...payload }),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || data.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.code = data.error;
      error.details = data.details;
      throw error;
    }
    return data;
  }

  function formatDate(value) {
    if (!value) return 'Belum dikirim';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Tanggal tidak tersedia';
    return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function formatTarget(target, isTest) {
    if (isTest || target?.type === 'self') return 'Perangkat saya';
    if (target?.type === 'role') return `Role ${target.role || '-'}`;
    if (target?.type === 'user') return 'Satu akun';
    return 'Semua pengguna';
  }

  function statusLabel(status) {
    return ({ sent: 'Terkirim', partial: 'Sebagian', failed: 'Gagal', sending: 'Mengirim', draft: 'Draft' })[status] || status || 'Tidak diketahui';
  }

  function selectedTarget() {
    const type = document.getElementById('nhTargetType')?.value || 'self';
    if (type === 'role') return { type, role: document.getElementById('nhTargetRole')?.value || 'user' };
    if (type === 'user') return { type, user_id: (document.getElementById('nhTargetUser')?.value || '').trim() };
    return { type };
  }

  function selectedAction() {
    const type = document.getElementById('nhActionType')?.value || 'open_app';
    return type === 'open_url'
      ? { type, url: (document.getElementById('nhActionUrl')?.value || '').trim() }
      : { type };
  }

  function formPayload() {
    return {
      title: (document.getElementById('nhTitle')?.value || '').trim(),
      body: (document.getElementById('nhBody')?.value || '').trim(),
      category: document.getElementById('nhCategory')?.value || 'general',
      target: selectedTarget(),
      action_config: selectedAction(),
    };
  }

  function validateForm(payload) {
    if (payload.title.length < 3) return 'Judul minimal 3 karakter.';
    if (payload.body.length < 3) return 'Pesan minimal 3 karakter.';
    if (payload.action_config.type === 'open_url') {
      try {
        const url = new URL(payload.action_config.url);
        const allowed = url.protocol === 'https:' && (
          url.hostname === 'drmacze.github.io' ||
          (url.hostname === 'github.com' && url.pathname.startsWith('/drmacze/'))
        );
        if (!allowed) return 'URL hanya boleh menuju situs resmi DLavie atau repository drmacze.';
      } catch {
        return 'URL tindakan tidak valid.';
      }
    }
    if (payload.target.type === 'user' && !/^[0-9a-f-]{36}$/i.test(payload.target.user_id || '')) {
      return 'User ID target tidak valid.';
    }
    return '';
  }

  function renderShell() {
    let overlay = document.getElementById('notificationDevHub');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'notificationDevHub';
    overlay.className = 'mh-overlay nh-overlay';
    overlay.innerHTML = `
      <section class="mh-panel nh-panel" role="dialog" aria-modal="true" aria-labelledby="nhTitleHeading">
        <header class="mh-header">
          <div>
            <div class="mh-eyebrow">DLavie Dev Hub</div>
            <h2 id="nhTitleHeading">Developer Hub</h2>
          </div>
          <button class="mh-icon-button" type="button" data-nh-close aria-label="Tutup">×</button>
        </header>
        <nav class="mh-tabs" aria-label="Developer Hub modules">
          <button type="button" data-nh-maintenance>Maintenance</button>
          <button type="button" class="active">Notifications</button>
        </nav>
        <div id="nhContent" class="mh-content nh-content">
          <div class="mh-loading"><span></span><p>Memuat Notification Center…</p></div>
        </div>
      </section>`;
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-nh-close]')) close();
      if (event.target.closest('[data-nh-maintenance]')) {
        close();
        setTimeout(() => window.DLavieMaintenanceHub?.open(), 190);
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.getElementById('notificationDevHub')) close();
    }, { once: true });
    document.body.appendChild(overlay);
    document.body.classList.add('mh-lock');
    requestAnimationFrame(() => overlay.classList.add('open'));
    return overlay;
  }

  function render() {
    const content = document.getElementById('nhContent');
    if (!content) return;
    if (state.loading) {
      content.innerHTML = '<div class="mh-loading"><span></span><p>Memuat Notification Center…</p></div>';
      return;
    }
    const stats = state.stats || { active_devices: 0, active_users: 0, own_devices: 0, firebase_configured: false };
    const estimate = state.estimate;
    const targetType = document.getElementById('nhTargetType')?.value || 'self';

    content.innerHTML = `
      <section class="nh-status-grid" aria-label="Status push notification">
        <div class="nh-stat"><span>Perangkat aktif</span><strong>${Number(stats.active_devices || 0)}</strong></div>
        <div class="nh-stat"><span>Pengguna terjangkau</span><strong>${Number(stats.active_users || 0)}</strong></div>
        <div class="nh-stat"><span>Perangkat saya</span><strong>${Number(stats.own_devices || 0)}</strong></div>
        <div class="nh-stat ${stats.firebase_configured ? 'ready' : 'danger'}"><span>Firebase</span><strong>${stats.firebase_configured ? 'Ready' : 'Belum siap'}</strong></div>
      </section>

      ${!stats.firebase_configured ? `
        <div class="nh-alert danger"><strong>Firebase sender belum siap</strong><span>Service account belum terdeteksi pada Edge Function. Form tetap dapat dilihat, tetapi pengiriman dinonaktifkan.</span></div>` : ''}
      ${state.error ? `<div class="nh-alert danger"><strong>Pengiriman gagal</strong><span>${escapeHtml(state.error)}</span></div>` : ''}
      ${state.result ? renderResult(state.result) : ''}

      <div class="nh-layout">
        <form id="nhForm" class="nh-form" novalidate>
          <div class="nh-section-heading"><div><span>Composer</span><strong>Buat notifikasi</strong></div><small>Pesan langsung melalui Firebase Cloud Messaging</small></div>

          <div class="mh-grid">
            <div class="mh-field">
              <label for="nhTargetType">Target</label>
              <select id="nhTargetType">
                <option value="self" ${targetType === 'self' ? 'selected' : ''}>Test — perangkat saya</option>
                <option value="all" ${targetType === 'all' ? 'selected' : ''}>Broadcast — semua pengguna</option>
                <option value="role" ${targetType === 'role' ? 'selected' : ''}>Broadcast — berdasarkan role</option>
                <option value="user" ${targetType === 'user' ? 'selected' : ''}>Satu akun berdasarkan User ID</option>
              </select>
            </div>
            <div class="mh-field">
              <label for="nhCategory">Kategori</label>
              <select id="nhCategory">
                ${Object.entries(CATEGORIES).map(([key, item]) => `<option value="${key}">${item.label}</option>`).join('')}
              </select>
            </div>
          </div>

          <div id="nhConditionalTarget"></div>

          <div class="mh-field">
            <label for="nhTitle">Judul</label>
            <input id="nhTitle" maxlength="80" autocomplete="off" placeholder="Contoh: Update launcher tersedia">
            <span class="mh-hint"><span id="nhTitleCount">0</span>/80</span>
          </div>
          <div class="mh-field">
            <label for="nhBody">Pesan</label>
            <textarea id="nhBody" maxlength="280" rows="4" placeholder="Tuliskan pesan singkat, jelas, dan dapat ditindaklanjuti."></textarea>
            <span class="mh-hint"><span id="nhBodyCount">0</span>/280</span>
          </div>

          <div class="mh-grid">
            <div class="mh-field">
              <label for="nhActionType">Saat notifikasi diketuk</label>
              <select id="nhActionType" disabled>
                <option value="open_app">Buka launcher</option>
              </select>
            </div>
            <div class="nh-action-note">Tautan eksternal dinonaktifkan sampai launcher mendukung validasi URL saat notifikasi diketuk.</div>
          </div>

          <div class="nh-estimate">
            <span>Estimasi penerima</span>
            <strong id="nhEstimate">${estimate ? `${Number(estimate.devices || 0)} perangkat · ${Number(estimate.users || 0)} pengguna` : 'Menghitung…'}</strong>
          </div>
          <div id="nhFormError" class="mh-error" role="alert"></div>
          <div class="nh-send-actions">
            <button type="button" class="mh-secondary" data-nh-reset>Reset</button>
            <button type="submit" class="mh-primary" ${state.sending || !stats.firebase_configured ? 'disabled' : ''}>
              ${state.sending ? 'Mengirim…' : 'Tinjau & Kirim'}
            </button>
          </div>
        </form>

        <aside class="nh-preview-column">
          <div class="nh-section-heading"><div><span>Preview</span><strong>Tampilan Android</strong></div></div>
          <div id="nhPreview" class="nh-preview-card">
            <div class="nh-preview-icon">D</div>
            <div><small>DLavie · sekarang</small><strong>Judul notifikasi</strong><p>Isi pesan akan terlihat di sini.</p></div>
          </div>
          <div class="nh-safety-note"><strong>Pengiriman aman</strong><span>Target awal selalu perangkat Anda. Broadcast memerlukan konfirmasi dengan mengetik KIRIM.</span></div>
        </aside>
      </div>

      <section class="nh-history-section">
        <div class="nh-section-heading"><div><span>Delivery log</span><strong>Riwayat pengiriman</strong></div><button type="button" data-nh-refresh>Refresh</button></div>
        <div class="nh-history-list">
          ${state.campaigns.length ? state.campaigns.map(renderCampaign).join('') : '<div class="mh-history-empty">Belum ada pengiriman melalui Notification Center.</div>'}
        </div>
      </section>

      <div id="nhConfirm" class="nh-confirm-overlay" aria-hidden="true"></div>`;

    bindForm();
    renderConditionalTarget();
    updateActionVisibility();
    updatePreview();
    scheduleEstimate();
  }

  function renderResult(result) {
    const success = Number(result.delivered_count || 0) > 0;
    return `<div class="nh-alert ${success ? 'success' : 'danger'}">
      <strong>${result.is_test ? 'Test selesai' : 'Broadcast selesai'}</strong>
      <span>${Number(result.delivered_count || 0)} berhasil · ${Number(result.failed_count || 0)} gagal · ${Number(result.invalidated_count || 0)} token dinonaktifkan</span>
    </div>`;
  }

  function renderCampaign(campaign) {
    const accent = CATEGORIES[campaign.category]?.accent || CATEGORIES.general.accent;
    return `<article class="nh-history-item">
      <span class="nh-history-accent" style="--nh-accent:${accent}"></span>
      <div class="nh-history-main">
        <div><strong>${escapeHtml(campaign.title)}</strong><span class="nh-status ${escapeHtml(campaign.status)}">${escapeHtml(statusLabel(campaign.status))}</span></div>
        <p>${escapeHtml(campaign.body)}</p>
        <small>${escapeHtml(formatTarget(campaign.target, campaign.is_test))} · ${escapeHtml(formatDate(campaign.sent_at || campaign.created_at))}</small>
      </div>
      <div class="nh-delivery-count"><strong>${Number(campaign.delivered_count || 0)}</strong><span>dari ${Number(campaign.audience_count || 0)}</span></div>
    </article>`;
  }

  function bindForm() {
    const form = document.getElementById('nhForm');
    if (!form) return;
    form.addEventListener('submit', reviewSend);
    form.querySelector('[data-nh-reset]')?.addEventListener('click', resetForm);
    document.querySelector('[data-nh-refresh]')?.addEventListener('click', () => loadData());

    ['nhTargetType', 'nhTargetRole', 'nhTargetUser'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        if (id === 'nhTargetType') renderConditionalTarget();
        scheduleEstimate();
      });
      document.getElementById(id)?.addEventListener('input', scheduleEstimate);
    });
    document.getElementById('nhActionType')?.addEventListener('change', updateActionVisibility);
    ['nhTitle', 'nhBody', 'nhCategory'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updatePreview);
      document.getElementById(id)?.addEventListener('change', updatePreview);
    });
    document.getElementById('nhTitle')?.addEventListener('input', event => {
      document.getElementById('nhTitleCount').textContent = String(event.target.value.length);
    });
    document.getElementById('nhBody')?.addEventListener('input', event => {
      document.getElementById('nhBodyCount').textContent = String(event.target.value.length);
    });
  }

  function renderConditionalTarget() {
    const container = document.getElementById('nhConditionalTarget');
    const type = document.getElementById('nhTargetType')?.value || 'self';
    if (!container) return;
    if (type === 'role') {
      container.innerHTML = `<div class="mh-field"><label for="nhTargetRole">Role pengguna</label><select id="nhTargetRole">
        <option value="user">User</option><option value="verified_player">Verified player</option><option value="moderator">Moderator</option><option value="admin">Admin</option><option value="developer">Developer</option><option value="owner">Owner</option>
      </select></div>`;
      document.getElementById('nhTargetRole')?.addEventListener('change', scheduleEstimate);
    } else if (type === 'user') {
      container.innerHTML = '<div class="mh-field"><label for="nhTargetUser">User ID</label><input id="nhTargetUser" maxlength="36" placeholder="UUID akun tujuan"></div>';
      document.getElementById('nhTargetUser')?.addEventListener('input', scheduleEstimate);
    } else {
      container.innerHTML = '';
    }
    scheduleEstimate();
  }

  function updateActionVisibility() {
    const type = document.getElementById('nhActionType')?.value || 'open_app';
    document.getElementById('nhActionUrlWrap')?.classList.toggle('nh-hidden', type !== 'open_url');
  }

  function updatePreview() {
    const title = document.getElementById('nhTitle')?.value.trim() || 'Judul notifikasi';
    const body = document.getElementById('nhBody')?.value.trim() || 'Isi pesan akan terlihat di sini.';
    const category = document.getElementById('nhCategory')?.value || 'general';
    const accent = CATEGORIES[category]?.accent || CATEGORIES.general.accent;
    const preview = document.getElementById('nhPreview');
    if (!preview) return;
    preview.style.setProperty('--nh-accent', accent);
    preview.querySelector('strong').textContent = title;
    preview.querySelector('p').textContent = body;
  }

  function scheduleEstimate() {
    clearTimeout(estimateTimer);
    const target = selectedTarget();
    const node = document.getElementById('nhEstimate');
    if (target.type === 'user' && !/^[0-9a-f-]{36}$/i.test(target.user_id || '')) {
      if (node) node.textContent = 'Masukkan User ID yang valid';
      return;
    }
    if (node) node.textContent = 'Menghitung…';
    estimateTimer = setTimeout(async () => {
      try {
        const result = await call('estimate', { target });
        state.estimate = result;
        if (node) node.textContent = `${Number(result.devices || 0)} perangkat · ${Number(result.users || 0)} pengguna`;
      } catch (error) {
        if (node) node.textContent = error.message || 'Estimasi gagal';
      }
    }, 280);
  }

  function reviewSend(event) {
    event.preventDefault();
    const payload = formPayload();
    const validation = validateForm(payload);
    const errorNode = document.getElementById('nhFormError');
    errorNode.textContent = validation;
    if (validation) return;
    const estimate = state.estimate || { devices: 0, users: 0 };
    if (Number(estimate.devices || 0) < 1) {
      errorNode.textContent = 'Tidak ada perangkat aktif pada target ini.';
      return;
    }
    showConfirmation(payload, estimate);
  }

  function showConfirmation(payload, estimate) {
    const overlay = document.getElementById('nhConfirm');
    if (!overlay) return;
    const isTest = payload.target.type === 'self';
    overlay.innerHTML = `
      <div class="nh-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="nhConfirmTitle">
        <div class="nh-confirm-icon">${isTest ? 'T' : '!'}</div>
        <h3 id="nhConfirmTitle">${isTest ? 'Kirim test ke perangkat Anda?' : 'Konfirmasi broadcast'}</h3>
        <p>Notifikasi akan dikirim ke <strong>${Number(estimate.devices || 0)} perangkat</strong> milik <strong>${Number(estimate.users || 0)} pengguna</strong>.</p>
        <div class="nh-confirm-preview"><strong>${escapeHtml(payload.title)}</strong><span>${escapeHtml(payload.body)}</span></div>
        ${isTest ? '' : `<label for="nhConfirmText">Ketik <strong>KIRIM</strong> untuk mencegah broadcast tidak sengaja.</label><input id="nhConfirmText" autocomplete="off" placeholder="KIRIM">`}
        <div id="nhConfirmError" class="mh-error"></div>
        <div class="nh-confirm-actions">
          <button type="button" class="mh-secondary" data-nh-cancel>Batal</button>
          <button type="button" class="mh-primary" data-nh-send ${isTest ? '' : 'disabled'}>${isTest ? 'Kirim Test' : 'Kirim Broadcast'}</button>
        </div>
      </div>`;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.querySelector('[data-nh-cancel]')?.addEventListener('click', hideConfirmation);
    const sendButton = overlay.querySelector('[data-nh-send]');
    document.getElementById('nhConfirmText')?.addEventListener('input', event => {
      sendButton.disabled = event.target.value.trim().toUpperCase() !== 'KIRIM';
    });
    sendButton?.addEventListener('click', () => send(payload, sendButton));
  }

  function hideConfirmation() {
    const overlay = document.getElementById('nhConfirm');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => { overlay.innerHTML = ''; }, 160);
  }

  async function send(payload, button) {
    if (state.sending) return;
    state.sending = true;
    button.disabled = true;
    button.textContent = 'Mengirim…';
    document.getElementById('nhConfirmError').textContent = '';
    try {
      const requestId = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(16)}-4000-8000-${Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12)}`;
      const result = await call('send', {
        ...payload,
        request_id: requestId,
      });
      state.result = result;
      state.error = '';
      hideConfirmation();
      await loadData(false);
      if (typeof window.showToast === 'function') {
        window.showToast(`${Number(result.delivered_count || 0)} notifikasi berhasil dikirim.`);
      }
    } catch (error) {
      document.getElementById('nhConfirmError').textContent = error.message || 'Pengiriman gagal.';
    } finally {
      state.sending = false;
      if (document.body.contains(button)) {
        button.disabled = false;
        button.textContent = payload.target.type === 'self' ? 'Kirim Test' : 'Kirim Broadcast';
      }
    }
  }

  function resetForm() {
    const form = document.getElementById('nhForm');
    form?.reset();
    state.estimate = null;
    state.error = '';
    state.result = null;
    renderConditionalTarget();
    updateActionVisibility();
    updatePreview();
    document.getElementById('nhTitleCount').textContent = '0';
    document.getElementById('nhBodyCount').textContent = '0';
  }

  async function loadData(showLoading = true) {
    if (showLoading) {
      state.loading = true;
      render();
    }
    try {
      const [stats, history] = await Promise.all([
        call('stats'),
        call('history'),
      ]);
      state.stats = stats;
      state.campaigns = Array.isArray(history.campaigns) ? history.campaigns : [];
      state.error = '';
    } catch (error) {
      state.error = error.status === 401
        ? 'Sesi berakhir. Silakan login ulang.'
        : error.status === 403
          ? 'Akun ini tidak memiliki akses Notification Center.'
          : error.message || 'Notification Center tidak dapat dimuat.';
    } finally {
      state.loading = false;
      render();
    }
  }

  async function open() {
    if (!canManage()) {
      if (typeof window.showToast === 'function') window.showToast('Notification Center hanya tersedia untuk owner, developer, dan admin.');
      return;
    }
    renderShell();
    await loadData();
  }

  function close() {
    const overlay = document.getElementById('notificationDevHub');
    if (!overlay) return;
    clearTimeout(estimateTimer);
    overlay.classList.remove('open');
    document.body.classList.remove('mh-lock');
    setTimeout(() => overlay.remove(), 180);
  }

  window.DLavieNotificationHub = { open, close };
})();

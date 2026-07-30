(() => {
  'use strict';

  const SUPABASE_URL = 'https://lvmucsxbmadtsgrxuwmo.supabase.co';
  const ANON_KEY = 'sb_publishable_aYFlbWVJMErOHwPsli33QQ_INJD9mhx';
  const ENDPOINT = `${SUPABASE_URL}/functions/v1/maintenance-control`;
  const PRIVILEGED_ROLES = new Set(['owner', 'developer', 'admin']);

  let state = null;
  let saving = false;
  let notificationScriptPromise = null;

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

  function ensureNotificationStyles() {
    if (document.querySelector('link[data-dlavie-notification-hub]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'notification-dev-hub.css';
    link.dataset.dlavieNotificationHub = 'true';
    document.head.appendChild(link);
  }

  function ensureNotificationScript() {
    if (window.DLavieNotificationHub) return Promise.resolve();
    if (notificationScriptPromise) return notificationScriptPromise;
    notificationScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-dlavie-notification-hub]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'notification-dev-hub.js';
      script.async = true;
      script.dataset.dlavieNotificationHub = 'true';
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error('Notification Center gagal dimuat.')), { once: true });
      document.body.appendChild(script);
    }).catch(error => {
      notificationScriptPromise = null;
      throw error;
    });
    return notificationScriptPromise;
  }

  async function openNotifications() {
    if (!canManage()) return;
    ensureNotificationStyles();
    try {
      await ensureNotificationScript();
      close();
      setTimeout(() => window.DLavieNotificationHub?.open(), 190);
    } catch {
      if (typeof window.showToast === 'function') window.showToast('Notification Center gagal dimuat. Coba refresh halaman.');
    }
  }

  async function call(action, payload = {}, authenticated = false) {
    const token = authenticated ? accessToken() : '';
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token || ANON_KEY}`,
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
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.details = data;
      throw error;
    }
    return data;
  }

  function scopeLabel(scope) {
    if (scope === 'full') return 'Full maintenance';
    if (scope === 'partial') return 'Limited services';
    return 'Operational';
  }

  function localInputDate(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }

  function renderShell() {
    ensureNotificationStyles();
    let overlay = document.getElementById('maintenanceDevHub');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'maintenanceDevHub';
    overlay.className = 'mh-overlay';
    overlay.innerHTML = `
      <section class="mh-panel" role="dialog" aria-modal="true" aria-labelledby="mhTitle">
        <header class="mh-header">
          <div>
            <div class="mh-eyebrow">DLavie Dev Hub</div>
            <h2 id="mhTitle">Developer Hub</h2>
          </div>
          <button class="mh-icon-button" type="button" data-mh-close aria-label="Tutup">×</button>
        </header>
        <nav class="mh-tabs" aria-label="Developer Hub modules">
          <button type="button" class="active">Maintenance</button>
          <button type="button" data-mh-notifications>Notifications</button>
        </nav>
        <div id="mhContent" class="mh-content">
          <div class="mh-loading"><span></span><p>Memuat status layanan…</p></div>
        </div>
      </section>`;
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-mh-close]')) close();
      if (event.target.closest('[data-mh-notifications]')) openNotifications();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.getElementById('maintenanceDevHub')) close();
    }, { once: true });
    document.body.appendChild(overlay);
    document.body.classList.add('mh-lock');
    requestAnimationFrame(() => overlay.classList.add('open'));
    return overlay;
  }

  function renderForm() {
    const content = document.getElementById('mhContent');
    if (!content || !state) return;
    const config = state.config || {};
    const enabled = config.enabled === true;
    const scope = enabled ? String(config.scope || 'full') : 'none';
    const updated = state.updated_at ? new Date(state.updated_at).toLocaleString('id-ID', {
      dateStyle: 'medium', timeStyle: 'short'
    }) : 'Belum tersedia';

    content.innerHTML = `
      <div class="mh-status-row">
        <div class="mh-status-copy">
          <span class="mh-status-dot ${enabled ? 'active' : ''}"></span>
          <div><strong>${enabled ? 'Maintenance aktif' : 'Layanan normal'}</strong><span>${escapeHtml(scopeLabel(scope))}</span></div>
        </div>
        <span class="mh-revision">rev ${Number(config.revision || 0)}</span>
      </div>

      <div class="mh-mode-group" aria-label="Mode maintenance">
        <button type="button" class="mh-mode ${scope === 'none' ? 'selected' : ''}" data-scope="none"><strong>Off</strong><span>Semua layanan tersedia</span></button>
        <button type="button" class="mh-mode ${scope === 'partial' ? 'selected' : ''}" data-scope="partial"><strong>Partial</strong><span>Launcher tetap dapat dibuka</span></button>
        <button type="button" class="mh-mode ${scope === 'full' ? 'selected' : ''}" data-scope="full"><strong>Full</strong><span>Blokir akses pengguna</span></button>
      </div>

      <form id="mhForm" class="mh-form">
        <input type="hidden" id="mhScope" value="${escapeHtml(scope)}">
        <div class="mh-field">
          <label for="mhStatusLabel">Status label</label>
          <input id="mhStatusLabel" maxlength="40" value="${escapeHtml(config.status_label || 'Pemeliharaan terjadwal')}" placeholder="Pemeliharaan terjadwal">
        </div>
        <div class="mh-field">
          <label for="mhMessageTitle">Judul utama</label>
          <input id="mhMessageTitle" maxlength="80" value="${escapeHtml(config.title || 'Kami sedang meningkatkan layanan')}" placeholder="Kami sedang meningkatkan layanan">
        </div>
        <div class="mh-field">
          <label for="mhMessage">Pesan pengguna</label>
          <textarea id="mhMessage" maxlength="280" rows="4" placeholder="Jelaskan dampak secara singkat dan jelas.">${escapeHtml(config.message || '')}</textarea>
          <span class="mh-hint"><span id="mhCount">${String(config.message || '').length}</span>/280</span>
        </div>
        <div class="mh-grid">
          <div class="mh-field">
            <label for="mhEndAt">Estimasi selesai</label>
            <input id="mhEndAt" type="datetime-local" value="${escapeHtml(localInputDate(config.estimated_end_at))}">
          </div>
          <label class="mh-toggle-row">
            <span><strong>Izinkan main offline</strong><small>Tampil hanya jika mode maintenance aktif</small></span>
            <input id="mhOffline" type="checkbox" ${config.allow_offline_play ? 'checked' : ''}>
            <i></i>
          </label>
        </div>
        <div class="mh-meta">Terakhir diperbarui ${escapeHtml(updated)}</div>
        <div id="mhError" class="mh-error" role="alert"></div>
        <div class="mh-actions">
          <button type="button" class="mh-secondary" data-mh-close>Batal</button>
          <button type="submit" class="mh-primary">Simpan perubahan</button>
        </div>
      </form>
      <div class="mh-history-section">
        <button type="button" class="mh-history-toggle" id="mhHistoryToggle">Riwayat perubahan <span>›</span></button>
        <div id="mhHistory" class="mh-history"></div>
      </div>`;

    content.querySelectorAll('[data-scope]').forEach(button => {
      button.addEventListener('click', () => {
        const selected = button.dataset.scope || 'none';
        document.getElementById('mhScope').value = selected;
        content.querySelectorAll('[data-scope]').forEach(item => item.classList.toggle('selected', item === button));
      });
    });
    document.getElementById('mhMessage').addEventListener('input', event => {
      document.getElementById('mhCount').textContent = String(event.target.value.length);
    });
    document.getElementById('mhForm').addEventListener('submit', save);
    document.getElementById('mhHistoryToggle').addEventListener('click', loadHistory);
  }

  async function loadHistory() {
    const container = document.getElementById('mhHistory');
    const toggle = document.getElementById('mhHistoryToggle');
    if (!container || !toggle) return;
    if (container.classList.contains('shown')) {
      container.classList.remove('shown');
      toggle.classList.remove('expanded');
      return;
    }
    container.className = 'mh-history shown';
    toggle.classList.add('expanded');
    container.innerHTML = '<div class="mh-history-empty">Memuat riwayat…</div>';
    try {
      const result = await call('history', {}, true);
      const entries = Array.isArray(result.entries) ? result.entries : [];
      if (!entries.length) {
        container.innerHTML = '<div class="mh-history-empty">Belum ada perubahan melalui Dev Hub.</div>';
        return;
      }
      container.innerHTML = entries.map(entry => {
        const next = entry.new_value || {};
        const when = new Date(entry.changed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
        return `<div class="mh-history-item"><span class="mh-status-dot ${next.enabled ? 'active' : ''}"></span><div><strong>${escapeHtml(scopeLabel(next.scope || 'none'))}</strong><span>${escapeHtml(when)} · rev ${Number(next.revision || 0)}</span></div></div>`;
      }).join('');
    } catch {
      container.innerHTML = '<div class="mh-history-empty">Riwayat tidak dapat dimuat.</div>';
    }
  }

  async function save(event) {
    event.preventDefault();
    if (saving || !state) return;
    const scope = document.getElementById('mhScope').value;
    const enabled = scope !== 'none';
    if (scope === 'full' && !window.confirm('Aktifkan full maintenance? Pengguna non-staff tidak dapat masuk ke launcher.')) return;

    const errorNode = document.getElementById('mhError');
    const button = event.currentTarget.querySelector('.mh-primary');
    errorNode.textContent = '';
    saving = true;
    button.disabled = true;
    button.textContent = 'Menyimpan…';

    const endInput = document.getElementById('mhEndAt').value;
    const config = {
      enabled,
      scope,
      status_label: document.getElementById('mhStatusLabel').value,
      title: document.getElementById('mhMessageTitle').value,
      message: document.getElementById('mhMessage').value,
      allow_offline_play: document.getElementById('mhOffline').checked,
      estimated_end_at: endInput ? new Date(endInput).toISOString() : null,
      support_url: 'https://drmacze.github.io/dlavie-web/#/issues',
    };

    try {
      const result = await call('update', {
        config,
        expected_updated_at: state.updated_at || null,
      }, true);
      state = { config: result.config, updated_at: result.updated_at };
      renderForm();
      if (typeof window.showToast === 'function') {
        window.showToast(enabled ? 'Maintenance berhasil diperbarui.' : 'Maintenance dinonaktifkan.');
      }
    } catch (error) {
      if (error.status === 409) {
        errorNode.textContent = 'Konfigurasi berubah dari perangkat lain. Tutup panel lalu buka kembali.';
      } else if (error.status === 403) {
        errorNode.textContent = 'Akses Dev Hub tidak tersedia untuk akun ini.';
      } else {
        errorNode.textContent = 'Perubahan gagal disimpan. Periksa input dan coba lagi.';
      }
      button.disabled = false;
      button.textContent = 'Simpan perubahan';
    } finally {
      saving = false;
    }
  }

  async function open() {
    if (!canManage()) {
      if (typeof window.showToast === 'function') window.showToast('Dev Hub hanya tersedia untuk owner, developer, dan admin.');
      return;
    }
    renderShell();
    try {
      state = await call('get');
      renderForm();
    } catch {
      const content = document.getElementById('mhContent');
      if (content) content.innerHTML = '<div class="mh-fatal"><strong>Status tidak dapat dimuat</strong><p>Periksa koneksi lalu buka Dev Hub kembali.</p></div>';
    }
  }

  function close() {
    const overlay = document.getElementById('maintenanceDevHub');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.classList.remove('mh-lock');
    setTimeout(() => overlay.remove(), 180);
  }

  window.DLavieMaintenanceHub = { open, close, openNotifications };
})();

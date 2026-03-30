// ═══════════════════════════════════════════════════════════
// UI — dark mode, sidebar, toast, modals, dropdowns
// ═══════════════════════════════════════════════════════════

// Apply saved theme immediately to prevent flash
(function () {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
})();

document.addEventListener('DOMContentLoaded', syncDarkModeToggles);

function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.querySelectorAll('.dark-mode-setting-toggle').forEach(cb => { cb.checked = isDark; });
}

function syncDarkModeToggles() {
  const isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.dark-mode-setting-toggle').forEach(cb => { cb.checked = isDark; });
}

async function submitChangePassword() {
  const current = document.getElementById('cp-current').value.trim();
  const newPw    = document.getElementById('cp-new').value.trim();
  const confirm  = document.getElementById('cp-confirm').value.trim();
  if (!current || !newPw || !confirm) { showToast('Please fill in all fields', 'warning'); return; }
  if (newPw.length < 6) { showToast('New password must be at least 6 characters', 'warning'); return; }
  if (newPw !== confirm) { showToast('New passwords do not match', 'warning'); return; }
  try {
    const res  = await apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify({ current_password: current, new_password: newPw }) });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to update password', 'error'); return; }
    showToast('Password updated successfully', 'success');
    closeModal('modal-change-password');
    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value = '';
    document.getElementById('cp-confirm').value = '';
  } catch (err) {
    showToast('Server error. Please try again.', 'error');
  }
}

function toggleSidebar(pageId) {
  const page = document.getElementById(pageId);
  if (!page) return;
  const sidebar   = page.querySelector('.sidebar');
  const expandBtn = page.querySelector('.sidebar-expand-btn');
  if (!sidebar) return;
  if (window.innerWidth <= 768) {
    const isOpen = sidebar.classList.toggle('mobile-open');
    if (expandBtn) expandBtn.style.display = isOpen ? 'none' : 'flex';
  } else {
    sidebar.classList.toggle('collapsed');
    if (expandBtn) expandBtn.style.display = 'none';
  }
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const colors = { success: '#00a63e', error: '#e7000b', info: '#3b82f6', warning: '#e17100' };
  const icons  = { success: '✓', error: '✗', info: 'ℹ', warning: '⚠' };
  toast.style.background = colors[type] || '#00a63e';
  toast.style.color = '#fff';
  toast.innerHTML = (icons[type] || '✓') + ' ' + msg;
  toast.style.display = 'flex';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function openModal(id)        { const el = document.getElementById(id); if (el) el.classList.add('active'); }
function closeModal(id)       { const el = document.getElementById(id); if (el) el.classList.remove('active'); }
function closeModalOverlay(id){ closeModal(id); }
function closeAllModals()     { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); }

function toggleDropdown(id) {
  const menu = document.getElementById(id);
  if (!menu) return;
  const wasActive = menu.classList.contains('active');
  closeAllDropdowns();
  if (!wasActive) menu.classList.add('active');
}
function closeDropdown(id)    { const el = document.getElementById(id); if (el) el.classList.remove('active'); }
function closeAllDropdowns()  { document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active')); }

function togglePw(id) {
  const inp = document.getElementById(id);
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

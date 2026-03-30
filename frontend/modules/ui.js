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

  const btn = document.querySelector('#modal-change-password .btn-primary');
  setBtnLoading(btn, 'Updating…');
  try {
    const res  = await apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify({ current_password: current, new_password: newPw }) });
    if (!res) { resetBtn(btn, 'Update Password'); return; }
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to update password', 'error'); resetBtn(btn, 'Update Password'); return; }
    showToast('Password updated successfully', 'success');
    closeModal('modal-change-password');
    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value = '';
    document.getElementById('cp-confirm').value = '';
  } catch (err) {
    showToast('Server error. Please try again.', 'error');
  }
  resetBtn(btn, 'Update Password');
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
    let backdrop = page.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      backdrop.onclick = function() { toggleSidebar(pageId); };
      page.querySelector('.app-layout').insertBefore(backdrop, sidebar.nextSibling);
    }
    backdrop.classList.toggle('active', isOpen);
  } else {
    sidebar.classList.toggle('collapsed');
    if (expandBtn) expandBtn.style.display = 'none';
  }
}

// ── Toast Stack System ──
function _getToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

function showToast(msg, type = 'success') {
  const container = _getToastContainer();
  const colors = { success: '#00a63e', error: '#e7000b', info: '#3b82f6', warning: '#e17100' };
  const icons  = { success: '✓', error: '✗', info: 'ℹ', warning: '⚠' };

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.style.background = colors[type] || '#00a63e';
  toast.textContent = (icons[type] || '✓') + ' ' + msg;
  container.appendChild(toast);

  const dismiss = () => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };
  setTimeout(dismiss, 3500);

  // Keep old single toast hidden so nothing breaks
  const legacy = document.getElementById('toast');
  if (legacy) legacy.style.display = 'none';
}

// ── Modals with ARIA & Focus Trap ──
var _focusTrapStack = [];

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');

  const titleEl = el.querySelector('.modal-header h3, .modal-header h2, .event-modal-title');
  if (titleEl) {
    if (!titleEl.id) titleEl.id = id + '-title';
    el.setAttribute('aria-labelledby', titleEl.id);
  }

  _trapFocus(el);
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active');
  _releaseFocus();
}

function closeModalOverlay(id) { closeModal(id); }
function closeAllModals() { document.querySelectorAll('.modal-overlay.active').forEach(m => { m.classList.remove('active'); }); _focusTrapStack = []; }

function _trapFocus(modal) {
  const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  const handler = function(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  _focusTrapStack.push({ modal, handler, prevFocus: document.activeElement });
  modal.addEventListener('keydown', handler);
  first.focus();
}

function _releaseFocus() {
  const entry = _focusTrapStack.pop();
  if (!entry) return;
  entry.modal.removeEventListener('keydown', entry.handler);
  if (entry.prevFocus && entry.prevFocus.focus) entry.prevFocus.focus();
}

// ── Dropdown ──
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

function toggleLogoutBtn(cardEl) {
  const footer = cardEl.closest('.sidebar-footer');
  if (!footer) return;
  const menu = footer.querySelector('.sidebar-user-menu');
  if (!menu) return;
  const show = !menu.classList.contains('visible');
  document.querySelectorAll('.sidebar-user-menu.visible').forEach(function(m) { m.classList.remove('visible'); });
  document.querySelectorAll('.user-card-toggle.expanded').forEach(function(c) { c.classList.remove('expanded'); });
  if (show) {
    menu.classList.add('visible');
    cardEl.classList.add('expanded');
  }
}

// ── Button Loading State Helpers ──
function setBtnLoading(btn, text) {
  if (!btn) return;
  btn._origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = text || 'Saving…';
}
function resetBtn(btn, text) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = text || btn._origText || 'Save';
}

// ── Content Loading Helpers ──
function showContentLoading(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '<div class="content-loading"><div class="spinner"></div>Loading…</div>';
}

// ── Confirmation Dialog ──
function showConfirmDialog(title, message, onConfirm) {
  var modalId = 'modal-confirm-action';
  var modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = '<div class="modal" onclick="event.stopPropagation()" style="max-width:400px;">' +
      '<div class="confirm-modal-body">' +
      '<h3 id="confirm-action-title"></h3>' +
      '<p id="confirm-action-msg"></p>' +
      '</div>' +
      '<div class="modal-footer" style="justify-content:center;">' +
      '<button class="btn btn-outline" id="confirm-action-cancel">Cancel</button>' +
      '<button class="btn btn-danger" id="confirm-action-ok">Confirm</button>' +
      '</div></div>';
    modal.onclick = function() { closeModal(modalId); };
    document.body.appendChild(modal);
  }
  document.getElementById('confirm-action-title').textContent = title;
  document.getElementById('confirm-action-msg').textContent = message;
  var okBtn = document.getElementById('confirm-action-ok');
  var cancelBtn = document.getElementById('confirm-action-cancel');
  var newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  newOk.onclick = function() { closeModal(modalId); onConfirm(); };
  cancelBtn.onclick = function() { closeModal(modalId); };
  openModal(modalId);
}

// ── Profile Picture Upload ──
function openPicUpload() {
  cancelPicUpload();
  openModal('modal-change-pic');
}

function cancelPicUpload() {
  const input = document.getElementById('pic-file-input');
  const preview = document.getElementById('pic-upload-preview');
  const img = document.getElementById('pic-preview-img');
  const saveBtn = document.getElementById('pic-save-btn');
  if (input) input.value = '';
  if (preview) preview.classList.remove('hidden');
  if (img) { img.classList.remove('active'); img.src = ''; }
  if (saveBtn) saveBtn.disabled = true;
  closeModal('modal-change-pic');
}

function handlePicSelect(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'warning'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'warning'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('pic-upload-preview');
    var img = document.getElementById('pic-preview-img');
    var saveBtn = document.getElementById('pic-save-btn');
    if (preview) preview.classList.add('hidden');
    if (img) { img.src = e.target.result; img.classList.add('active'); }
    if (saveBtn) saveBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

function saveProfilePic() {
  var img = document.getElementById('pic-preview-img');
  if (!img || !img.src) return;
  var dataUrl = img.src;
  document.querySelectorAll('.big-avatar').forEach(function(el) {
    el.innerHTML = '';
    el.style.backgroundImage = 'url(' + dataUrl + ')';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  });
  document.querySelectorAll('.avatar').forEach(function(el) {
    el.innerHTML = '';
    el.style.backgroundImage = 'url(' + dataUrl + ')';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  });
  var studentAvatarIcon = document.querySelector('.student-avatar-row > div:first-child');
  if (studentAvatarIcon) {
    studentAvatarIcon.innerHTML = '';
    studentAvatarIcon.style.backgroundImage = 'url(' + dataUrl + ')';
    studentAvatarIcon.style.backgroundSize = 'cover';
    studentAvatarIcon.style.backgroundPosition = 'center';
  }
  showToast('Profile picture updated!', 'success');
  cancelPicUpload();
}

document.addEventListener('DOMContentLoaded', function() {
  var area = document.getElementById('pic-upload-area');
  var input = document.getElementById('pic-file-input');
  if (area && input) {
    area.addEventListener('click', function(e) {
      if (e.target.closest('.pic-preview-img')) return;
      input.click();
    });
    input.addEventListener('change', function() {
      if (input.files && input.files[0]) handlePicSelect(input.files[0]);
    });
    area.addEventListener('dragover', function(e) { e.preventDefault(); });
    area.addEventListener('drop', function(e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handlePicSelect(e.dataTransfer.files[0]);
    });
  }
});

window.addEventListener('resize', function() {
  if (window.innerWidth > 768) {
    document.querySelectorAll('.sidebar.mobile-open').forEach(function(s) {
      s.classList.remove('mobile-open');
    });
    document.querySelectorAll('.sidebar-backdrop.active').forEach(function(b) {
      b.classList.remove('active');
    });
    document.querySelectorAll('.sidebar-expand-btn').forEach(function(btn) {
      btn.style.display = 'none';
    });
  }
});

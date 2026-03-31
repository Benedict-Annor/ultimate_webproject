// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS — load, render, mark read
// ═══════════════════════════════════════════════════════════

async function loadNotifications() {
  try {
    const res = await apiFetch('/notifications');
    if (!res) return;
    const data        = await res.json();
    notificationsData = Array.isArray(data) ? data : (data.data || []);
    const unread      = notificationsData.filter(n => !n.is_read).length;

    document.querySelectorAll('.nav-badge').forEach(badge => {
      const parent = badge.closest('a, button');
      if (parent && parent.textContent.includes('Notification')) {
        badge.textContent     = unread > 0 ? unread : '';
        badge.style.display   = unread > 0 ? '' : 'none';
      }
    });
    ['notif-count-badge', 'snotif-count-badge'].forEach(id => {
      const badge = document.getElementById(id);
      if (badge) { badge.textContent = unread > 0 ? `${unread} new` : ''; badge.style.display = unread > 0 ? '' : 'none'; }
    });
    renderNotifications();
  } catch (err) {
    console.error('loadNotifications error:', err);
    showToast('Failed to load notifications. Please try again.', 'error');
  }
}

function renderNotifications() {
  ['notif-list', 'snotif-list'].forEach(id => {
    const list = document.getElementById(id);
    if (list) renderNotifInto(list);
  });
}

function notifTypeIcon(type) {
  return type === 'schedule_change'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
}

function notifIconColor(type) {
  return type === 'schedule_change' ? 'green' : 'blue';
}

function renderNotifInto(list) {
  if (!notificationsData.length) {
    list.innerHTML = '<p style="padding:20px;color:var(--text-muted);text-align:center;">No notifications yet.</p>';
    return;
  }
  list.innerHTML = notificationsData.map((n, i) => `
    <div class="notif-item${n.is_read ? '' : ' unread'}">
      <div class="notif-clickable" onclick="openNotifDetail(${i})">
        <div class="notif-icon ${notifIconColor(n.type)}">${notifTypeIcon(n.type)}</div>
        <div class="notif-body">
          <h4>${escapeHtml(n.title || 'Notification')}</h4>
          <p>${escapeHtml(n.message || '')}</p>
        </div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>
        ${n.is_read ? '' : '<div class="notif-dot"></div>'}
      </div>
      <button class="notif-delete-btn" onclick="deleteNotification('${n.id}')" title="Delete notification">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>`).join('');
}

var _activeNotifId = null;

function openNotifDetail(index) {
  var n = notificationsData[index];
  if (!n) return;
  _activeNotifId = n.id;
  var icon = document.getElementById('notif-modal-icon');
  var title = document.getElementById('notif-modal-title');
  var msg = document.getElementById('notif-modal-message');
  var time = document.getElementById('notif-modal-time');
  var readBtn = document.getElementById('notif-modal-read-btn');
  if (icon) { icon.className = 'notif-icon ' + notifIconColor(n.type); icon.innerHTML = notifTypeIcon(n.type); }
  if (title) title.textContent = n.title || 'Notification';
  if (msg) msg.textContent = n.message || '';
  if (time) time.textContent = n.created_at ? new Date(n.created_at).toLocaleString() : '';
  if (readBtn) readBtn.style.display = n.is_read ? 'none' : '';
  openModal('modal-notif-detail');
}

async function markReadFromModal() {
  if (!_activeNotifId) return;
  var readBtn = document.getElementById('notif-modal-read-btn');
  setBtnLoading(readBtn, 'Marking…');
  await markAsRead(_activeNotifId);
  resetBtn(readBtn, 'Mark as Read');
  if (readBtn) readBtn.style.display = 'none';
  showToast('Notification marked as read', 'success');
}

async function markAsRead(id) {
  const res = await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
  if (res) await loadNotifications();
}

async function markAllRead() {
  const btns = document.querySelectorAll('[onclick="markAllRead()"]');
  btns.forEach(b => setBtnLoading(b, 'Marking…'));
  const res = await apiFetch('/notifications/read-all', { method: 'PUT' });
  if (res) await loadNotifications();
  btns.forEach(b => resetBtn(b, 'Mark All Read'));
}

async function deleteNotification(id) {
  const res = await apiFetch('/notifications/' + id, { method: 'DELETE' });
  if (res) {
    await loadNotifications();
    showToast('Notification deleted', 'success');
  }
}

async function deleteFromModal() {
  if (!_activeNotifId) return;
  var btn = document.getElementById('notif-modal-delete-btn');
  setBtnLoading(btn, 'Deleting…');
  const res = await apiFetch('/notifications/' + _activeNotifId, { method: 'DELETE' });
  resetBtn(btn, 'Delete');
  if (res) {
    closeModal('modal-notif-detail');
    await loadNotifications();
    showToast('Notification deleted', 'success');
  }
}

async function clearAllNotifications() {
  if (!notificationsData.length) {
    showToast('No notifications to clear', 'info');
    return;
  }
  showConfirmDialog(
    'Clear All Notifications',
    'Are you sure you want to delete all your notifications? This cannot be undone.',
    async function() {
      var btns = document.querySelectorAll('[onclick="clearAllNotifications()"]');
      btns.forEach(function(b) { setBtnLoading(b, 'Clearing…'); });
      var res = await apiFetch('/notifications', { method: 'DELETE' });
      if (res) {
        await loadNotifications();
        showToast('All notifications cleared', 'success');
      }
      btns.forEach(function(b) { resetBtn(b, 'Clear all'); });
    }
  );
}

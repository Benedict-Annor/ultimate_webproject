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
      const parent = badge.closest('a');
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
  }
}

function renderNotifications() {
  ['notif-list', 'snotif-list'].forEach(id => {
    const list = document.getElementById(id);
    if (list) renderNotifInto(list);
  });
}

function renderNotifInto(list) {
  if (!notificationsData.length) {
    list.innerHTML = '<p style="padding:20px;color:var(--text-muted);text-align:center;">No notifications yet.</p>';
    return;
  }
  const typeIcon = (type) => type === 'schedule_change'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

  const iconColor = (type) => type === 'schedule_change' ? 'green' : 'blue';
  list.innerHTML = notificationsData.map(n => `
    <div class="notif-item${n.is_read ? '' : ' unread'}">
      <div class="notif-icon ${iconColor(n.type)}">${typeIcon(n.type)}</div>
      <div class="notif-body">
        <h4>${escapeHtml(n.title || 'Notification')}</h4>
        <p>${escapeHtml(n.message || '')}</p>
      </div>
      <div class="notif-time">${timeAgo(n.created_at)}</div>
      ${n.is_read ? '' : `<div class="notif-unread-wrap"><span class="notif-new-badge" onclick="markAsRead('${n.id}')" title="Mark as read">New</span><div class="notif-dot"></div></div>`}
    </div>`).join('');
}

async function markAsRead(id) {
  const res = await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
  if (res) await loadNotifications();
}

async function markAllRead() {
  const res = await apiFetch('/notifications/read-all', { method: 'PUT' });
  if (res) await loadNotifications();
}

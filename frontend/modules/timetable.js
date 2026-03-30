// ═══════════════════════════════════════════════════════════
// TIMETABLE — load, render (week + day), tab switching, event modal
// ═══════════════════════════════════════════════════════════

async function loadTimetable() {
  try {
    const res = await apiFetch('/timetable');
    if (!res) return;
    const data    = await res.json();
    timetableData = Array.isArray(data) ? data : (data.data || []);
    renderTimetable('tt-week-view', true);
    renderTimetable('stt-week-view', false);
    const ttDayDiv  = document.getElementById('tt-day-view');
    const sttDayDiv = document.getElementById('stt-day-view');
    if (ttDayDiv  && ttDayDiv.style.display  !== 'none') renderDayView('tt-day-view', true);
    if (sttDayDiv && sttDayDiv.style.display !== 'none') renderDayView('stt-day-view', false);
  } catch (err) {
    console.error('loadTimetable error:', err);
    showToast('Failed to load timetable. Please try again.', 'error');
  }
}

function renderTimetable(containerId, isLecturer) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const entries = timetableData;
  if (!entries.length) { container.innerHTML = '<p style="padding:20px;color:var(--text-muted)">No classes scheduled.</p>'; return; }

  const timeSet = new Set();
  entries.forEach(e => { if (e.start_time) timeSet.add(e.start_time.substring(0, 5)); });
  const times  = Array.from(timeSet).sort();
  const colors = ['green', 'blue', 'amber', 'red', 'teal', 'purple'];

  let html = `<div style="overflow-x:auto;"><table class="tt-grid"><thead><tr>
    <th>Time</th>
    ${DAY_NAMES.map(d => `<th>${d}</th>`).join('')}
  </tr></thead><tbody>`;

  times.forEach(time => {
    html += '<tr><td class="tt-time">' + time + '</td>';
    DAY_NAMES.forEach(day => {
      const match = entries.find(e => {
        const entryDay  = e.day || DAY_NAMES[(e.day_of_week || 1) - 1];
        const entryTime = e.start_time ? e.start_time.substring(0, 5) : '';
        return entryDay === day && entryTime === time;
      });
      if (match) {
        const course      = match.offering?.course;
        const colorClass  = colors[Math.abs((course?.code || '').charCodeAt(0) || 0) % colors.length];
        const cancelled   = match.status === 'cancelled';
        const groupBadge  = match.group_number === 1 ? '<span class="tt-group-badge">G1</span>'
                          : match.group_number === 2 ? '<span class="tt-group-badge grp2">G2</span>'
                          : '<span class="tt-group-badge both">Both</span>';
        const cancelBadge = cancelled ? '<span class="tt-cancelled-badge">Cancelled</span>' : '';
        html += `<td class="tt-cell" style="padding:8px;vertical-align:top;">
          <div class="tt-event ${colorClass}${cancelled ? ' cancelled' : ''}" onclick="openEventModal('${match.id}')">
            <strong>${escapeHtml(course?.title || 'Unknown')}</strong>
            <span>${escapeHtml(course?.code || '')}</span>
            <span>${escapeHtml(match.room?.name || '')}</span>
            <span>${match.start_time ? match.start_time.substring(0,5) : ''} – ${match.end_time ? match.end_time.substring(0,5) : ''}</span>
            <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">${groupBadge}${cancelBadge}</div>
          </div></td>`;
      } else {
        html += '<td class="tt-cell" style="padding:8px;vertical-align:top;"></td>';
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function setTTView(view, prefix) {
  const weekDiv = document.getElementById(prefix + 'tt-week-view');
  const dayDiv  = document.getElementById(prefix + 'tt-day-view');
  const weekBtn = document.getElementById(prefix + 'tt-btn-week');
  const dayBtn  = document.getElementById(prefix + 'tt-btn-day');
  if (!weekDiv || !dayDiv) return;
  if (view === 'week') {
    weekDiv.style.display = ''; dayDiv.style.display = 'none';
    if (weekBtn) { weekBtn.classList.add('active');    dayBtn  && dayBtn.classList.remove('active'); }
  } else {
    weekDiv.style.display = 'none'; dayDiv.style.display = '';
    if (dayBtn)  { dayBtn.classList.add('active');     weekBtn && weekBtn.classList.remove('active'); }
    renderDayView(prefix + 'tt-day-view', prefix === '');
  }
  if (prefix === '') localStorage.setItem('ttView', view);
}

function renderDayView(containerId, isLecturer) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const entries = timetableData;
  if (!entries.length) { container.innerHTML = '<p style="padding:20px;color:var(--text-muted)">No classes scheduled.</p>'; return; }

  const byDay = {};
  DAY_NAMES.forEach(d => { byDay[d] = []; });
  entries.forEach(e => { const d = e.day || DAY_NAMES[(e.day_of_week || 1) - 1]; if (d) (byDay[d] = byDay[d] || []).push(e); });

  container.innerHTML = DAY_NAMES.map(day => {
    const dayEntries = byDay[day] || [];
    if (!dayEntries.length) return '';
    const cards = dayEntries.map(e => {
      const course     = e.offering?.course;
      const cancelled  = e.status === 'cancelled';
      const groupBadge = e.group_number === 1 ? '<span class="tt-group-badge">G1</span>'
                       : e.group_number === 2 ? '<span class="tt-group-badge grp2">G2</span>'
                       : '<span class="tt-group-badge both">Both</span>';
      const cancelBadge = cancelled ? '<span class="tt-cancelled-badge">Cancelled</span>' : '';
      return `<div class="day-entry${cancelled ? ' cancelled' : ''}" onclick="openEventModal('${e.id}')">
        <div class="day-entry-time">${e.start_time ? e.start_time.substring(0,5) : ''} – ${e.end_time ? e.end_time.substring(0,5) : ''}</div>
        <div class="day-entry-info">
          <div class="day-entry-course">${escapeHtml(course?.title || 'Unknown')}</div>
          <div class="day-entry-code">${escapeHtml(course?.code || '')}</div>
          <div class="day-entry-meta">${escapeHtml(e.room?.name || '')}${e.lecturer ? ' · ' + escapeHtml(e.lecturer.full_name) : ''}</div>
        </div>
        <div class="day-entry-badges">${groupBadge}${cancelBadge}</div>
      </div>`;
    }).join('');
    return `<div class="day-section"><div class="day-header">${day}</div>${cards}</div>`;
  }).join('');
}

function switchTTTab(tab) {
  ['schedule', 'clashes'].forEach(t => {
    const panel = document.getElementById(`tt-panel-${t}`);
    const btn   = document.getElementById(`tt-tab-btn-${t}`);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (btn)   btn.classList.toggle('active', t === tab);
  });
  const actSched  = document.getElementById('tt-header-actions-schedule');
  const actClash  = document.getElementById('tt-header-actions-clashes');
  if (actSched) actSched.style.display = tab === 'schedule' ? '' : 'none';
  if (actClash) actClash.style.display = tab === 'clashes'  ? '' : 'none';
  localStorage.setItem('ttTab', tab);
  if (tab === 'clashes') loadClashes();
}

function showTimetableClashes() {
  switchPage('page-timetable');
  setTimeout(() => switchTTTab('clashes'), 50);
}

function openEventModal(id) {
  const entry = timetableData.find(e => String(e.id) === String(id));
  if (!entry) return;

  const course    = entry.offering?.course;
  const day       = entry.day || DAY_NAMES[(entry.day_of_week || 1) - 1] || '';
  const startTime = entry.start_time ? entry.start_time.substring(0, 5) : '';
  const endTime   = entry.end_time   ? entry.end_time.substring(0, 5) : '';
  const cancelled = entry.status === 'cancelled';
  const colors    = ['green', 'blue', 'amber', 'red', 'teal', 'purple'];
  const colorClass = colors[Math.abs((course?.code || '').charCodeAt(0) || 0) % colors.length];
  const bannerGradients = {
    green:'linear-gradient(135deg,#00a63e,#22c55e)', blue:'linear-gradient(135deg,#2b7fff,#60a5fa)',
    amber:'linear-gradient(135deg,#e17100,#f59e0b)', red:'linear-gradient(135deg,#e7000b,#f87171)',
    teal:'linear-gradient(135deg,#0891b2,#22d3ee)',  purple:'linear-gradient(135deg,#7c3aed,#a78bfa)',
  };
  const groupText = entry.group_number === 1 ? 'Group 1' : entry.group_number === 2 ? 'Group 2' : 'All Groups';

  const banner = document.getElementById('event-modal-banner');
  if (banner) banner.style.background = bannerGradients[colorClass] || bannerGradients.green;
  const dayEl = document.getElementById('event-modal-day');   if (dayEl) dayEl.textContent = day.toUpperCase();
  const titleEl = document.getElementById('event-modal-title'); if (titleEl) titleEl.textContent = course?.title || 'Unknown';
  const metaEl = document.getElementById('event-modal-meta');  if (metaEl) metaEl.textContent = `${startTime} – ${endTime}  ·  ${entry.room?.name || 'N/A'}`;

  document.getElementById('event-modal-body').innerHTML = [
    cancelled ? `<div class="clash-badge" style="margin-bottom:12px;">Cancelled</div>` : '',
    ['Code', course?.code || ''],
    ['Lecturer', entry.lecturer?.full_name || 'N/A'],
    ['Group', groupText],
  ].filter(Boolean).map(item =>
    Array.isArray(item)
      ? `<div class="detail-row"><span class="detail-label">${item[0]}</span><span class="detail-val">${escapeHtml(String(item[1]))}</span></div>`
      : item
  ).join('');

  const editBtn = document.getElementById('modal-edit-btn');
  if (editBtn) {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isOwner = isLecturerUser() && String(entry.lecturer?.id) === String(currentUser.id);
    if (isOwner) {
      editBtn.style.display = '';
      editBtn.onclick = () => { localStorage.setItem('editItemId', id); closeModal('modal-event'); switchPage('page-edit-schedule'); loadEditForm(id); };
    } else {
      editBtn.style.display = 'none';
    }
  }
  openModal('modal-event');
}

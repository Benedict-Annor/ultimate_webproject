// ═══════════════════════════════════════════════════════════
// DASHBOARD — stats, today's schedule, activity feed
// ═══════════════════════════════════════════════════════════

function renderTodayScheduleItems(entries, role) {
  const empty = '<p style="padding:12px 0;color:var(--text-muted);font-size:13px;">No classes scheduled for today.</p>';
  if (!entries.length) return empty;
  const sorted = [...entries].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  if (role === 'student') {
    return sorted.map((e, i) => {
      const course    = e.offering?.course;
      const from      = e.start_time ? e.start_time.substring(0, 5) : '';
      const to        = e.end_time   ? e.end_time.substring(0, 5)   : '';
      const cancelled = e.status === 'cancelled';
      const col       = SLOT_COLORS[i % SLOT_COLORS.length];
      return `<div class="today-schedule-slot" style="background:${SLOT_BG[col]};border-left:4px solid ${SLOT_BORDER[col]};${cancelled ? 'opacity:0.5;' : ''}" onclick="openEventModal('${e.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="font-size:14px;color:var(--text);">${escapeHtml(course?.title || 'Unknown')}${cancelled ? ' <span style="font-size:11px;color:var(--red);">(Cancelled)</span>' : ''}</strong>
          <span class="schedule-time-badge">${escapeHtml(from)} – ${escapeHtml(to)}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);display:flex;flex-direction:column;gap:3px;">
          <span>&#128100; ${escapeHtml(e.lecturer?.full_name || '—')}</span>
          <span>&#128205; ${escapeHtml(e.room?.name || '—')}</span>
        </div>
      </div>`;
    }).join('');
  }

  return sorted.map((e, i) => {
    const course    = e.offering?.course;
    const from      = e.start_time ? e.start_time.substring(0, 5) : '';
    const to        = e.end_time   ? e.end_time.substring(0, 5)   : '';
    const cancelled = e.status === 'cancelled';
    const dot       = SCHEDULE_DOT_COLORS[i % SCHEDULE_DOT_COLORS.length];
    return `<div class="schedule-item schedule-item--clickable"${cancelled ? ' style="opacity:0.5;"' : ''} onclick="openEventModal('${e.id}')">
      <div class="schedule-dot ${dot}"></div>
      <div class="schedule-info">
        <h4>${escapeHtml(course?.title || 'Unknown')}${cancelled ? ' <span style="font-size:11px;color:var(--red);font-weight:500;">(Cancelled)</span>' : ''}</h4>
        <div class="schedule-meta">
          <span>${escapeHtml(from)} – ${escapeHtml(to)}</span>
          <span>${escapeHtml(e.lecturer?.full_name || '—')}</span>
          <span>${escapeHtml(e.room?.name || '—')}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function updateDashboard() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return;

  const today            = new Date().getDay(); // 0=Sun…6=Sat
  const todayDayOfWeek   = today === 0 || today === 6 ? -1 : today;

  const activityHtml = (data) => data.slice(0, 5).map(n => {
    const initials = (n.title || 'N').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    return `<div class="activity-item">
      <div class="activity-avatar">${escapeHtml(initials)}</div>
      <div><div style="font-weight:500">${escapeHtml(n.title || '')}</div><div style="font-size:12px;color:var(--text-muted)">${escapeHtml(n.message || '')} · ${timeAgo(n.created_at)}</div></div>
    </div>`;
  }).join('') || '<p style="padding:12px;color:var(--text-muted);font-size:13px;">No recent activity.</p>';

  if (user.role === 'lecturer') {
    const myEntries    = timetableData.filter(e => String(e.lecturer?.id) === String(user.id));
    const todayEntries = myEntries.filter(e => (e.day_of_week || (DAY_NAMES.indexOf(e.day) + 1)) === todayDayOfWeek);
    const statClasses  = document.getElementById('stat-classes');
    const statToday    = document.getElementById('stat-today');
    if (statClasses) statClasses.textContent = myEntries.length;
    if (statToday)   statToday.textContent   = todayEntries.length;
    const activityEl   = document.getElementById('dash-activity');
    if (activityEl) activityEl.innerHTML = activityHtml(notificationsData);
    const scheduleEl   = document.getElementById('dash-today-schedule');
    const subtitleEl   = document.getElementById('dash-today-subtitle');
    if (scheduleEl) scheduleEl.innerHTML = renderTodayScheduleItems(todayEntries, 'lecturer');
    if (subtitleEl) subtitleEl.textContent = todayEntries.length === 0
      ? 'No classes scheduled today'
      : `You have ${todayEntries.length} class${todayEntries.length !== 1 ? 'es' : ''} today`;
  }

  if (user.role === 'student') {
    const todayEntries  = timetableData.filter(e => (e.day_of_week || (DAY_NAMES.indexOf(e.day) + 1)) === todayDayOfWeek);
    const sstatClasses  = document.getElementById('sstat-classes');
    const sstatToday    = document.getElementById('sstat-today');
    if (sstatClasses) sstatClasses.textContent = timetableData.length;
    if (sstatToday)   sstatToday.textContent   = todayEntries.length;
    const sactivityEl   = document.getElementById('sdash-activity');
    if (sactivityEl) sactivityEl.innerHTML = activityHtml(notificationsData);
    const sscheduleEl   = document.getElementById('sdash-today-schedule');
    const ssubtitleEl   = document.getElementById('sdash-today-subtitle');
    if (sscheduleEl) sscheduleEl.innerHTML = renderTodayScheduleItems(todayEntries, 'student');
    if (ssubtitleEl) ssubtitleEl.textContent = todayEntries.length === 0
      ? 'No classes scheduled today'
      : `${todayEntries.length} class${todayEntries.length !== 1 ? 'es' : ''} scheduled today`;
  }
}

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

function showActiveCourses() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return;
  const isLecturer = user.role === 'lecturer';
  const entries = isLecturer
    ? timetableData.filter(e => String(e.lecturer?.id) === String(user.id))
    : timetableData;

  const courseMap = new Map();
  entries.forEach(e => {
    const course = e.offering?.course;
    if (!course) return;
    const key = course.id || course.code || course.title;
    if (!courseMap.has(key)) {
      courseMap.set(key, {
        code: course.code || '',
        title: course.title || 'Untitled',
        credit_hours: course.credit_hours || '—',
        level: course.level || '—',
        lecturers: new Map(),
        classes: []
      });
    }
    const rec = courseMap.get(key);
    const lec = e.lecturer;
    if (lec && lec.full_name) {
      rec.lecturers.set(lec.id || lec.full_name, lec.full_name);
    }
    rec.classes.push({
      day: e.day || DAY_NAMES[(e.day_of_week || 1) - 1] || '—',
      start: e.start_time ? e.start_time.substring(0, 5) : '—',
      end: e.end_time ? e.end_time.substring(0, 5) : '—',
      room: e.room?.name || '—',
      status: e.status || 'active'
    });
  });

  const body = document.getElementById('active-courses-body');
  const subtitle = document.getElementById('active-courses-subtitle');
  if (!body) return;

  if (subtitle) subtitle.textContent = isLecturer ? 'Courses you are teaching this semester' : 'Enrolled courses this semester';

  const emptyMsg = isLecturer
    ? 'You are not teaching any courses this semester.'
    : 'You are not enrolled in any courses this semester.';

  if (courseMap.size === 0) {
    body.innerHTML = '<div class="active-courses-empty">' +
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-lighter)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>' +
      '<p style="font-weight:600;color:var(--text);margin:8px 0 4px;">No Active Courses</p>' +
      '<p style="font-size:13px;color:var(--text-muted);">' + escapeHtml(emptyMsg) + '</p>' +
      '</div>';
    openModal('modal-active-courses');
    return;
  }

  const colors = ['blue', 'green', 'amber', 'teal', 'purple', 'red'];
  const svgPerson = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const svgCredit = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
  const svgLevel = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>';
  const svgClock = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  const svgPin = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  let html = '<div class="active-courses-count">' + courseMap.size + ' course' + (courseMap.size !== 1 ? 's' : '') + ' this semester</div>';
  html += '<div class="active-courses-list">';
  let i = 0;
  courseMap.forEach(c => {
    const col = colors[i % colors.length];
    const lecNames = Array.from(c.lecturers.values());

    html += '<div class="active-course-item">' +
      '<div class="active-course-color" style="background:var(--' + col + ');"></div>' +
      '<div class="active-course-info">' +
        '<div class="active-course-title">' + escapeHtml(c.title) + '</div>' +
        (c.code ? '<div class="active-course-code">' + escapeHtml(c.code) + '</div>' : '') +
        '<div class="active-course-meta">';

    if (!isLecturer) {
      html += '<span class="active-course-tag">' + svgPerson +
        (lecNames.length ? escapeHtml(lecNames.join(', ')) : '<em>Not assigned</em>') + '</span>';
    }

    html += '<span class="active-course-tag">' + svgCredit +
        escapeHtml(c.credit_hours) + ' credit hr' + (c.credit_hours !== 1 ? 's' : '') + '</span>' +
      '<span class="active-course-tag">' + svgLevel + 'Level ' + escapeHtml(c.level) + '</span>' +
      '</div>';

    if (isLecturer && c.classes.length) {
      const sorted = [...c.classes].sort((a, b) => {
        const dayOrder = DAY_NAMES.indexOf(a.day) - DAY_NAMES.indexOf(b.day);
        return dayOrder !== 0 ? dayOrder : a.start.localeCompare(b.start);
      });
      html += '<div class="active-course-classes">';
      sorted.forEach(cls => {
        const cancelled = cls.status === 'cancelled';
        html += '<div class="active-course-class' + (cancelled ? ' cancelled' : '') + '">' +
          '<span class="active-course-class-day">' + escapeHtml(cls.day.substring(0, 3)) + '</span>' +
          '<span class="active-course-class-detail">' + svgClock + ' ' + escapeHtml(cls.start) + ' – ' + escapeHtml(cls.end) + '</span>' +
          '<span class="active-course-class-detail">' + svgPin + ' ' + escapeHtml(cls.room) + '</span>' +
          (cancelled ? '<span class="active-course-class-badge cancelled">Cancelled</span>' : '') +
        '</div>';
      });
      html += '</div>';
    }

    html += '</div></div>';
    i++;
  });
  html += '</div>';

  body.innerHTML = html;
  openModal('modal-active-courses');
}

function viewTimetableForRole() {
  const user = JSON.parse(localStorage.getItem('user'));
  switchPage(user?.role === 'student' ? 'page-student-timetable' : 'page-timetable');
}

function updateDashboard() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return;

  const now              = new Date();
  const today            = now.getDay(); // 0=Sun…6=Sat
  const todayDayOfWeek   = today === 0 || today === 6 ? -1 : today;
  const dateStr          = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.querySelectorAll('.dashboard-date').forEach(el => {
    el.textContent = `Here's what's happening with your schedule today — ${dateStr}`;
  });

  const activityHtml = (data) => data.slice(0, 5).map(n => {
    const initials = (n.title || 'N').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    return `<div class="activity-item">
      <div class="activity-avatar">${escapeHtml(initials)}</div>
      <div><div style="font-weight:500">${escapeHtml(n.title || '')}</div><div style="font-size:12px;color:var(--text-muted)">${escapeHtml(n.message || '')} · ${timeAgo(n.created_at)}</div></div>
    </div>`;
  }).join('') || '<p style="padding:12px;color:var(--text-muted);font-size:13px;">No recent activity.</p>';

  if (user.role === 'lecturer') {
    const myEntries      = timetableData.filter(e => String(e.lecturer?.id) === String(user.id));
    const todayEntries   = myEntries.filter(e => (e.day_of_week || (DAY_NAMES.indexOf(e.day) + 1)) === todayDayOfWeek);
    const distinctCourses = new Set(myEntries.map(e => e.offering?.course?.title).filter(Boolean)).size;
    const statClasses    = document.getElementById('stat-classes');
    const statToday      = document.getElementById('stat-today');
    const statActive     = document.getElementById('stat-active-courses');
    if (statClasses) statClasses.textContent = myEntries.length;
    if (statToday)   statToday.textContent   = todayEntries.length;
    if (statActive)  statActive.textContent  = distinctCourses;
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
    const todayEntries    = timetableData.filter(e => (e.day_of_week || (DAY_NAMES.indexOf(e.day) + 1)) === todayDayOfWeek);
    const sDistinctCourses = new Set(timetableData.map(e => e.offering?.course?.title).filter(Boolean)).size;
    const sstatClasses    = document.getElementById('sstat-classes');
    const sstatToday      = document.getElementById('sstat-today');
    const sstatActive     = document.getElementById('sstat-active-courses');
    if (sstatClasses) sstatClasses.textContent = timetableData.length;
    if (sstatToday)   sstatToday.textContent   = todayEntries.length;
    if (sstatActive)  sstatActive.textContent  = sDistinctCourses;
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

// ═══════════════════════════════════════════════════════════
// CLASHES — load, render, view, resolve
// ═══════════════════════════════════════════════════════════

async function loadClashes() {
  try {
    const res = await apiFetch('/clashes/detected');
    if (!res) return;
    const data  = await res.json();
    clashesData = Array.isArray(data) ? data : (data.data || []);
    renderClashTable(clashesData);
  } catch (err) {
    console.error('loadClashes error:', err);
    showToast('Failed to load clash reports. Please try again.', 'error');
  }
}

function renderClashTable(clashes) {
  const tbody = document.querySelector('#tt-panel-clashes .clash-table tbody');
  if (!tbody) return;

  const total    = clashes.length;
  const pending  = clashes.filter(c => c.status !== 'resolved').length;
  const resolved = clashes.filter(c => c.status === 'resolved').length;

  const elTotal    = document.getElementById('clash-stat-total');
  const elPending  = document.getElementById('clash-stat-pending');
  const elResolved = document.getElementById('clash-stat-resolved');
  if (elTotal)    elTotal.textContent    = total;
  if (elPending)  elPending.textContent  = pending;
  if (elResolved) elResolved.textContent = resolved;

  const badge = document.getElementById('tt-clash-count');
  if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? '' : 'none'; }

  const tabs = document.querySelectorAll('#tt-panel-clashes .filter-tab');
  if (tabs[0]) tabs[0].textContent = `All (${total})`;
  if (tabs[1]) tabs[1].textContent = `Pending (${pending})`;
  if (tabs[2]) tabs[2].textContent = `Resolved (${resolved})`;

  if (!clashes.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No clashes found. Your schedule is conflict-free!</td></tr>';
    return;
  }

  tbody.innerHTML = clashes.map(c => {
    const isPending  = c.status !== 'resolved';
    const course1    = c.course_1_title || c.entry_a?.offering?.course?.title || c.course_1_code || 'Course 1';
    const course2    = c.course_2_title || c.entry_b?.offering?.course?.title || c.course_2_code || 'Course 2';
    const lec1       = c.entry_a?.lecturer?.full_name || '';
    const lec2       = c.entry_b?.lecturer?.full_name || '';
    const room1      = c.entry_a?.room?.name || '';
    const room2      = c.entry_b?.room?.name || '';
    const resolvedOn = c.resolved_at ? new Date(c.resolved_at).toLocaleDateString() : '—';
    return `<tr onclick="viewClash('${escapeHtml(c.detected_key || c.id)}')">
      <td>
        <div class="clash-courses">Schedule Clash</div>
        <div class="clash-courses">${escapeHtml(course1)}<span>vs</span>${escapeHtml(course2)}</div>
      </td>
      <td>
        <div style="font-size:13px;">${escapeHtml(lec1)}</div>
        ${lec2 && lec2 !== lec1 ? `<div style="font-size:13px;">${escapeHtml(lec2)}</div>` : ''}
      </td>
      <td>
        <div style="font-size:13px;">${escapeHtml(room1)}</div>
        ${room2 && room2 !== room1 ? `<div style="font-size:13px;">${escapeHtml(room2)}</div>` : ''}
      </td>
      <td><div style="font-size:13px;">${escapeHtml(resolvedOn)}</div></td>
      <td><span class="tag ${isPending ? 'pending' : 'resolved'}">${isPending ? 'Pending' : 'Resolved'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();viewClash('${escapeHtml(c.detected_key || c.id)}')">View</button>
          ${isPending ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();resolveClash('${escapeHtml(c.detected_key || c.id)}')">Resolve</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function viewClash(key) {
  const c = clashesData.find(x => (x.detected_key || x.id) == key);
  if (!c) return;
  activeClashKey = key;

  const course1    = c.course_1_title || c.entry_a?.offering?.course?.title || c.course_1_code || 'Course 1';
  const course2    = c.course_2_title || c.entry_b?.offering?.course?.title || c.course_2_code || 'Course 2';
  const dayName    = DAY_NAMES[(c.day_of_week || 1) - 1] || '';
  const timeRange  = c.time_range || `${c.entry_a?.start_time || ''} – ${c.entry_a?.end_time || ''}`;
  const isPending  = c.status !== 'resolved';

  document.getElementById('view-clash-title').textContent = 'Clash Details';
  const resolveBtn = document.getElementById('view-clash-resolve-btn');
  if (resolveBtn) resolveBtn.style.display = isPending ? 'inline-flex' : 'none';

  const statusBadge = isPending
    ? '<div class="clash-badge">&#9888; Pending</div>'
    : '<div class="resolved-badge">&#10003; Resolved</div>';

  document.getElementById('view-clash-body').innerHTML = statusBadge + [
    ['Clash Type',   'Schedule Conflict'],
    ['Course 1',     course1],
    ['Course 2',     course2],
    ['Day',          dayName],
    ['Time',         timeRange],
    ['Entry A',      `${c.entry_a?.room?.name || 'N/A'} · ${c.entry_a?.lecturer?.full_name || 'N/A'}`],
    ['Entry B',      `${c.entry_b?.room?.name || 'N/A'} · ${c.entry_b?.lecturer?.full_name || 'N/A'}`],
    c.resolution_note ? ['Resolution Note', c.resolution_note] : null,
  ].filter(Boolean).map(([l, v]) =>
    `<div class="detail-row"><span class="detail-label">${l}</span><span class="detail-val">${escapeHtml(String(v))}</span></div>`
  ).join('');
  openModal('modal-view-clash');
}

function resolveClash(key) {
  activeClashKey = key;
  const c = clashesData.find(x => (x.detected_key || x.id) == key);
  if (!c) return;
  const course1   = c.course_1_title || c.entry_a?.offering?.course?.title || c.course_1_code || 'Course 1';
  const course2   = c.course_2_title || c.entry_b?.offering?.course?.title || c.course_2_code || 'Course 2';
  const dayName   = DAY_NAMES[(c.day_of_week || 1) - 1] || '';
  const timeRange = c.time_range || '';
  document.getElementById('resolve-clash-desc').textContent = `Resolve: "${course1} vs ${course2}" on ${dayName} at ${timeRange}?`;
  document.getElementById('resolve-note').value = '';
  openModal('modal-resolve-clash');
}

function resolveFromView() {
  closeModal('modal-view-clash');
  resolveClash(activeClashKey);
}

async function confirmResolve() {
  const c = clashesData.find(x => (x.detected_key || x.id) == activeClashKey);
  if (!c) return;
  const resolution_note = document.getElementById('resolve-note').value.trim() || 'Clash resolved.';
  const btn = document.querySelector('#modal-resolve-clash .btn-primary');
  setBtnLoading(btn, 'Resolving…');
  try {
    let res;
    if (c.has_report && c.id) {
      res = await apiFetch(`/clashes/${c.id}/resolve`, { method: 'PUT', body: JSON.stringify({ resolution_note }) });
    } else {
      res = await apiFetch('/clashes/resolve-detected', {
        method: 'POST',
        body: JSON.stringify({ course_1_code: c.course_1_code, course_2_code: c.course_2_code, day_of_week: c.day_of_week, time_range: c.time_range, resolution_note })
      });
    }
    if (!res) { resetBtn(btn, 'Resolve'); return; }
    if (!res.ok) { const err = await res.json().catch(() => ({})); showToast(err.message || 'Failed to resolve clash', 'error'); resetBtn(btn, 'Resolve'); return; }
    closeModal('modal-resolve-clash');
    showToast('Clash marked as resolved!', 'success');
    await loadClashes();
  } catch (err) {
    console.error('confirmResolve error:', err);
    showToast('Error resolving clash', 'error');
  }
  resetBtn(btn, 'Resolve');
}

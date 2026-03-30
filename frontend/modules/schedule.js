// ═══════════════════════════════════════════════════════════
// SCHEDULE EDITOR — add / edit / cancel / restore classes
// ═══════════════════════════════════════════════════════════

function initEditSchedulePage() {
  const editItemId = localStorage.getItem('editItemId');
  if (editItemId) { _showEditFormWrap(); if (editItemId !== 'new') loadEditForm(editItemId); }
  else { showClassPicker(); }
}

function showClassPicker() {
  localStorage.removeItem('editItemId');
  const picker   = document.getElementById('edit-class-picker');
  const formWrap = document.getElementById('edit-form-wrap');
  if (picker)   { picker.style.display = ''; renderClassPicker(); }
  if (formWrap)   formWrap.style.display = 'none';
}

function _showEditFormWrap() {
  const picker   = document.getElementById('edit-class-picker');
  const formWrap = document.getElementById('edit-form-wrap');
  const changeBtn = document.getElementById('edit-change-class-btn');
  if (picker)    picker.style.display    = 'none';
  if (formWrap)  formWrap.style.display  = '';
  if (changeBtn) changeBtn.style.display = '';
}

function renderClassPicker() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const myClasses   = timetableData.filter(e => String(e.lecturer?.id) === String(currentUser.id));
  const list        = document.getElementById('edit-class-list');
  if (!list) return;
  if (!myClasses.length) { list.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No classes are assigned to you.</p>'; return; }
  list.innerHTML = myClasses.map((e, i) => {
    const col      = SLOT_COLORS[i % SLOT_COLORS.length];
    const course   = e.offering?.course;
    const day      = e.day || DAY_NAMES[(e.day_of_week || 1) - 1] || '';
    const from     = e.start_time ? e.start_time.substring(0, 5) : '';
    const to       = e.end_time   ? e.end_time.substring(0, 5)   : '';
    const cancelled = e.status === 'cancelled';
    return `<div class="edit-class-card${cancelled ? ' cancelled' : ''}"
      style="border-left-color:${SLOT_BORDER[col]};background:${SLOT_BG[col]};"
      onclick="selectClassToEdit('${e.id}')">
      <div class="edit-class-card-code" style="color:${SLOT_BORDER[col]};">${course?.code || '—'}</div>
      <div class="edit-class-card-title">${course?.title || 'Unknown Course'}</div>
      <div class="edit-class-card-meta">${day} · ${from}–${to} · ${e.room?.name || ''}</div>
      ${cancelled ? '<span class="edit-class-card-badge">Cancelled</span>' : ''}
    </div>`;
  }).join('');
}

function selectClassToEdit(id) {
  localStorage.setItem('editItemId', id);
  _showEditFormWrap();
  loadEditForm(id);
}

function loadEditForm(id) {
  if (!isLecturerUser()) { showToast('Access denied', 'error'); switchPage('page-timetable'); return; }
  const entryId = id || localStorage.getItem('editItemId');
  if (!entryId) return;
  const item = timetableData.find(t => String(t.id) === String(entryId));
  if (!item) return;

  const course      = item.offering?.course;
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwner     = String(item.lecturer?.id) === String(currentUser.id);
  if (!isOwner) { showToast('You can only edit your own schedule', 'warning'); switchPage('page-timetable'); return; }
  const cancelled   = item.status === 'cancelled';

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('edit-header-code', course?.code || '');
  setEl('edit-header-title', course?.title || 'Unknown Course');
  const headerMeta = document.getElementById('edit-header-meta-text');
  if (headerMeta) {
    const day = item.day || DAY_NAMES[(item.day_of_week || 1) - 1] || '';
    headerMeta.textContent = `${day}  ${item.start_time ? item.start_time.substring(0,5) : ''}–${item.end_time ? item.end_time.substring(0,5) : ''}  ·  ${item.room?.name || ''}`;
  }
  const headerStatus = document.getElementById('edit-header-status');
  if (headerStatus) { headerStatus.textContent = cancelled ? 'Cancelled' : 'Active'; headerStatus.className = 'status-badge ' + (cancelled ? 'clash-badge' : 'resolved-badge'); }

  const ownershipWarning = document.getElementById('edit-ownership-warning');
  if (ownershipWarning) ownershipWarning.style.display = isOwner ? 'none' : '';

  const offeringRow = document.getElementById('edit-offering-row');
  const courseRow   = document.getElementById('edit-course-row');
  if (offeringRow) offeringRow.style.display = 'none';
  if (courseRow)   courseRow.style.display   = '';

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('edit-course', course?.title || '');
  setVal('edit-lecturer', item.lecturer?.full_name || '');
  setVal('edit-day', item.day || DAY_NAMES[(item.day_of_week || 1) - 1] || 'Monday');
  setVal('edit-from', item.start_time ? item.start_time.substring(0,5) : '');
  setVal('edit-to',   item.end_time   ? item.end_time.substring(0,5)   : '');
  setVal('edit-group', item.group_number != null ? String(item.group_number) : '');

  populateRoomsDropdown(item.room?.id);

  ['edit-room-id','edit-group','edit-day','edit-from','edit-to'].forEach(elId => { const el = document.getElementById(elId); if (el) el.disabled = !isOwner; });
  ['edit-update-btn','edit-cancel-btn'].forEach(elId => { const el = document.getElementById(elId); if (el) el.style.display = isOwner ? 'inline-flex' : 'none'; });

  const restoreBtn = document.getElementById('edit-restore-btn');
  if (restoreBtn) restoreBtn.style.display = (isOwner && cancelled) ? 'inline-flex' : 'none';
  const clashError = document.getElementById('edit-clash-error');
  if (clashError) clashError.style.display = 'none';

  localStorage.setItem('editItemId', entryId);
}

async function saveEdit() {
  if (!isLecturerUser()) return;
  const id = localStorage.getItem('editItemId');
  if (!id) return;

  if (id !== 'new') {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const item = timetableData.find(t => String(t.id) === String(id));
    if (item && String(item.lecturer?.id) !== String(currentUser.id)) {
      showToast('You can only modify your own schedule', 'error');
      return;
    }
  }

  const day       = document.getElementById('edit-day')?.value;
  const from      = document.getElementById('edit-from')?.value?.trim();
  const to        = document.getElementById('edit-to')?.value?.trim();
  const roomId    = document.getElementById('edit-room-id')?.value;
  const groupRaw  = document.getElementById('edit-group')?.value;
  const groupNumber = groupRaw ? parseInt(groupRaw) : null;
  const clashError  = document.getElementById('edit-clash-error');
  if (clashError) clashError.style.display = 'none';

  if (!from || !to) {
    if (clashError) { clashError.textContent = 'Start time and end time are required.'; clashError.style.display = 'block'; }
    return;
  }
  if (to <= from) {
    if (clashError) { clashError.textContent = 'End time must be after start time.'; clashError.style.display = 'block'; }
    return;
  }

  const btn = document.getElementById('edit-update-btn');
  setBtnLoading(btn, 'Saving…');

  try {
    const dayOfWeek = DAY_NAMES.indexOf(day) + 1 || 1;
    let res;

    if (id === 'new') {
      const offeringId = document.getElementById('edit-offering')?.value;
      if (!offeringId) { if (clashError) { clashError.textContent = 'Please select a course.'; clashError.style.display = 'block'; } resetBtn(btn, 'Save Changes'); return; }
      if (!roomId)     { if (clashError) { clashError.textContent = 'Please select a room.';   clashError.style.display = 'block'; } resetBtn(btn, 'Save Changes'); return; }
      res = await apiFetch('/timetable', { method: 'POST', body: JSON.stringify({ offering_id: offeringId, room_id: roomId, day_of_week: dayOfWeek, start_time: from, end_time: to, group_number: groupNumber }) });
    } else {
      const patch = { day_of_week: dayOfWeek, start_time: from, end_time: to };
      if (roomId) patch.room_id = roomId;
      if (groupRaw !== undefined) patch.group_number = groupNumber;
      res = await apiFetch(`/timetable/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    }

    if (!res) { resetBtn(btn, 'Save Changes'); return; }
    const data = await res.json();
    if (!res.ok) {
      const msg = data.conflicts ? data.conflicts.map(c => c.message).join(' | ') : (data.error || 'Failed to save schedule');
      if (clashError) { clashError.textContent = msg; clashError.style.display = 'block'; }
      resetBtn(btn, 'Save Changes');
      return;
    }
    showToast(id === 'new' ? 'Class added successfully!' : 'Schedule updated successfully!', 'success');
    await loadTimetable();
    resetBtn(btn, 'Save Changes');
    setTimeout(() => { switchPage('page-timetable'); }, 800);
  } catch (err) {
    console.error('saveEdit error:', err);
    if (clashError) { clashError.textContent = 'Network error. Please try again.'; clashError.style.display = 'block'; }
    resetBtn(btn, 'Save Changes');
  }
}

function updateSchedule() { saveEdit(); }

async function cancelClass() {
  if (!isLecturerUser()) return;
  const id = localStorage.getItem('editItemId');
  if (!id) return;
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const item = timetableData.find(t => String(t.id) === String(id));
  if (item && String(item.lecturer?.id) !== String(currentUser.id)) { showToast('You can only cancel your own classes', 'error'); return; }

  showConfirmDialog(
    'Cancel Class',
    'Are you sure you want to cancel this class? All enrolled students will be notified.',
    async function() {
      const btn = document.getElementById('edit-cancel-btn');
      setBtnLoading(btn, 'Cancelling…');
      try {
        const res = await apiFetch(`/timetable/${id}/cancel`, { method: 'PUT' });
        if (!res) { resetBtn(btn, 'Cancel Class'); return; }
        if (!res.ok) { const err = await res.json().catch(() => ({})); showToast(err.message || 'Failed to cancel class', 'error'); resetBtn(btn, 'Cancel Class'); return; }
        showToast('Class cancelled', 'success');
        await loadTimetable();
        loadEditForm(id);
      } catch (err) { console.error('cancelClass error:', err); showToast('Error cancelling class', 'error'); }
      resetBtn(btn, 'Cancel Class');
    }
  );
}

async function restoreClass() {
  if (!isLecturerUser()) return;
  const id = localStorage.getItem('editItemId');
  if (!id) return;
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const item = timetableData.find(t => String(t.id) === String(id));
  if (item && String(item.lecturer?.id) !== String(currentUser.id)) { showToast('You can only restore your own classes', 'error'); return; }

  showConfirmDialog(
    'Restore Class',
    'Are you sure you want to restore this cancelled class?',
    async function() {
      const btn = document.getElementById('edit-restore-btn');
      setBtnLoading(btn, 'Restoring…');
      try {
        const res = await apiFetch(`/timetable/${id}/restore`, { method: 'PUT' });
        if (!res) { resetBtn(btn, 'Restore Class'); return; }
        if (!res.ok) { const err = await res.json().catch(() => ({})); showToast(err.message || 'Failed to restore class', 'error'); resetBtn(btn, 'Restore Class'); return; }
        showToast('Class restored', 'success');
        await loadTimetable();
        loadEditForm(id);
      } catch (err) { console.error('restoreClass error:', err); showToast('Error restoring class', 'error'); }
      resetBtn(btn, 'Restore Class');
    }
  );
}

async function populateRoomsDropdown(selectedRoomId) {
  const sel = document.getElementById('edit-room-id');
  if (!sel) return;
  try {
    const res   = await apiFetch('/rooms');
    if (!res) return;
    const rooms = await res.json();
    sel.innerHTML = '<option value="">Select room…</option>' +
      rooms.map(r => `<option value="${r.id}"${r.id === selectedRoomId ? ' selected' : ''}>${escapeHtml(r.name)} — ${escapeHtml(r.building)}</option>`).join('');
  } catch (err) {
    console.error('populateRoomsDropdown:', err);
    showToast('Failed to load rooms', 'error');
  }
}

async function populateOfferingsDropdown(selectedOfferingId) {
  const sel = document.getElementById('edit-offering');
  if (!sel) return;
  try {
    const res = await apiFetch('/offerings?my_courses=true');
    if (!res) return;
    const offerings = await res.json();
    if (!offerings.length) {
      sel.innerHTML = '<option value="">No courses assigned to you</option>';
      const clashError = document.getElementById('edit-clash-error');
      if (clashError) {
        clashError.textContent = 'You have no courses assigned. You can only add schedules for courses you teach.';
        clashError.style.display = 'block';
      }
      return;
    }
    sel.innerHTML = '<option value="">Select course…</option>' +
      offerings.map(o => {
        const c = o.course;
        return `<option value="${o.id}"${o.id === selectedOfferingId ? ' selected' : ''}>${escapeHtml(c?.code || '')} — ${escapeHtml(c?.title || '')}</option>`;
      }).join('');
  } catch (err) {
    console.error('populateOfferingsDropdown:', err);
    showToast('Failed to load courses', 'error');
  }
}

async function openAddForm() {
  if (!isLecturerUser()) { showToast('Only lecturers can add schedules', 'warning'); return; }
  localStorage.setItem('editItemId', 'new');
  switchPage('page-edit-schedule');
  const changeBtn = document.getElementById('edit-change-class-btn');
  if (changeBtn) changeBtn.style.display = 'none';
  const offeringRow = document.getElementById('edit-offering-row');
  const courseRow   = document.getElementById('edit-course-row');
  if (offeringRow) offeringRow.style.display = '';
  if (courseRow)   courseRow.style.display   = 'none';
  ['edit-from','edit-to'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const dayEl   = document.getElementById('edit-day');   if (dayEl)   dayEl.value   = 'Monday';
  const groupEl = document.getElementById('edit-group'); if (groupEl) groupEl.value = '';
  const restoreBtn = document.getElementById('edit-restore-btn');
  const cancelBtn  = document.getElementById('edit-cancel-btn');
  if (restoreBtn) restoreBtn.style.display = 'none';
  if (cancelBtn)  cancelBtn.style.display  = 'none';
  const clashError = document.getElementById('edit-clash-error');
  if (clashError) clashError.style.display = 'none';
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const lecturerEl = document.getElementById('edit-lecturer');
  if (lecturerEl) lecturerEl.value = user.full_name || '';
  await Promise.all([populateRoomsDropdown(), populateOfferingsDropdown()]);
}

function openDeleteModal()  { document.getElementById('delete-modal').style.display = 'flex'; }
function closeDeleteModal() { document.getElementById('delete-modal').style.display = 'none'; }
function confirmDelete()    { closeDeleteModal(); showToast('Schedule deletion not supported in this version', 'info'); }
function showEditSuccess()  { closeAllModals(); showToast('Schedule updated successfully!', 'success'); }

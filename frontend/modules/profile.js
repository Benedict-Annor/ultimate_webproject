// ═══════════════════════════════════════════════════════════
// PROFILE — load, update, clash success feedback
// ═══════════════════════════════════════════════════════════

async function loadProfile() {
  try {
    const res = await apiFetch('/auth/me');
    if (!res) return;
    const user = await res.json();
    const set  = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('prof-fullname',             user.full_name);
    set('prof-email',                user.email);
    set('prof-staff-id',             user.staff_id || 'N/A');
    set('sprofile-fullname',         user.full_name);
    set('sprofile-email',            user.email);
    set('sprofile-student-id',       user.student_id || 'N/A');
    set('sprofile-department',       user.departments?.name || '—');
    const enrollDate = user.created_at
      ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    set('sprofile-enrollment-date',  enrollDate);
  } catch (err) {
    console.error('loadProfile error:', err);
  }
}

async function updateProfile() {
  const fullName = (document.getElementById('prof-fullname') || document.getElementById('sprofile-fullname'))?.value?.trim();
  if (!fullName)             { showToast('Full name is required', 'error'); return; }
  if (fullName.length > 100) { showToast('Full name must be 100 characters or fewer', 'warning'); return; }
  try {
    const res  = await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify({ full_name: fullName }) });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to update', 'error'); return; }
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    stored.full_name = data.full_name;
    localStorage.setItem('user', JSON.stringify(stored));
    loadUserUI();
    showToast('Profile updated successfully!', 'success');
  } catch (err) {
    console.error('updateProfile error:', err);
    showToast('Error updating profile', 'error');
  }
}

function saveProfile() { updateProfile(); }

function showClashSuccess() {
  const t = document.getElementById('clash-success-toast');
  if (t) { t.style.display = 'flex'; setTimeout(() => { t.style.display = 'none'; }, 3500); }
  showToast('Clash report submitted! The lecturer has been notified.', 'success');
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION — page routing, role toggle
// ═══════════════════════════════════════════════════════════

function goTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const t = document.getElementById(pageId);
  if (t) t.classList.add('active');
  window.scrollTo(0, 0);
  setTimeout(() => { loadUserUI(); }, 50);
}

function switchPage(pageId) {
  goTo(pageId);
  localStorage.setItem('lastPage', pageId);
  closeAllDropdowns();
  if (pageId === 'page-edit-schedule' && !isLecturerUser()) {
    showToast('Access denied', 'warning');
    return;
  }
  if (pageId === 'page-dashboard' || pageId === 'page-student-dashboard') updateDashboard();
  if (pageId === 'page-timetable')   switchTTTab('schedule');
  if (pageId === 'page-profile' || pageId === 'page-student-profile') loadProfile();
  if (pageId === 'page-notifications' || pageId === 'page-student-notifications') loadNotifications();
  if (pageId === 'page-edit-schedule') initEditSchedulePage();
}

function setRole(el, role) {
  el.parentElement.querySelectorAll('.role-btn').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

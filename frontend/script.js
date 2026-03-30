// ═══════════════════════════════════════════════════════════
// INIT — session restore, filter tabs, keyboard shortcuts
// All logic lives in frontend/modules/*.js
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Filter tab clicks (clash table)
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      this.closest('.filter-tabs').querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      const txt = this.textContent.toLowerCase();
      document.querySelectorAll('#tt-panel-clashes .clash-table tbody tr').forEach(row => {
        const s = (row.querySelector('.tag') || {}).textContent || '';
        row.style.display = txt.includes('all') ? '' : txt.includes(s.toLowerCase()) ? '' : 'none';
      });
    });
  });

  // Clash table search
  const si = document.querySelector('.search-bar input');
  if (si) {
    si.addEventListener('input', function () {
      const q = this.value.toLowerCase();
      document.querySelectorAll('#tt-panel-clashes .clash-table tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  // Restore session only if the server hasn't restarted since last visit
  const token  = localStorage.getItem('token');
  const user   = JSON.parse(localStorage.getItem('user') || 'null');
  if (token && user) {
    fetch('/api/health')
      .then(r => r.json())
      .then(({ bootId }) => {
        const lastBootId = localStorage.getItem('bootId');
        localStorage.setItem('bootId', bootId);

        if (lastBootId && lastBootId !== bootId) {
          // Server restarted — clear session and go to landing page
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('lastPage');
          goTo('page-landing');
          return;
        }

        // Same server instance — restore session
        const lastPage  = localStorage.getItem('lastPage');
        const dashboard = user.role === 'lecturer' ? 'page-dashboard' : 'page-student-dashboard';
        const restoreTo = lastPage || dashboard;
        goTo(restoreTo);

        if (restoreTo === 'page-timetable' || restoreTo === 'page-student-timetable') {
          const savedTab = localStorage.getItem('ttTab');
          if (savedTab) setTimeout(() => switchTTTab(savedTab), 50);
        }
        const savedTTView = localStorage.getItem('ttView');
        if (savedTTView) setTimeout(() => setTTView(savedTTView, ''), 100);

        loadTimetable();
        loadNotifications();
        setTimeout(() => updateDashboard(), 500);
      })
      .catch(() => {
        // Server unreachable — stay on landing page
        goTo('page-landing');
      });
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAllModals(); closeAllDropdowns(); }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.dropdown-wrap')) closeAllDropdowns();
});

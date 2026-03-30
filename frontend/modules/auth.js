// ═══════════════════════════════════════════════════════════
// AUTH — token helpers, sign in/out, user UI
// ═══════════════════════════════════════════════════════════

function getToken()      { return localStorage.getItem('token'); }
function authHeaders()   { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }; }
function isLecturerUser(){ const u = JSON.parse(localStorage.getItem('user')); return u?.role === 'lecturer'; }

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
  if (res.status === 401) { logout(); return null; }
  return res;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  goTo('page-landing');
}

async function signIn() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pw').value.trim();

  if (!email || !password) { showToast('Please enter email and password', 'warning'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Please enter a valid email address', 'warning'); return; }

  try {
    const res  = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();

    if (!res.ok) { showToast(data.message || data.error || 'Incorrect email or password', 'error'); return; }

    const token = data.token || data.access_token;
    const user  = data.user;
    if (!token || !user) { showToast('Login failed: invalid server response', 'error'); return; }

    const activeRoleBtn = document.querySelector('#page-login .role-btn.active');
    const selectedRole  = activeRoleBtn ? activeRoleBtn.textContent.trim().toLowerCase() : 'lecturer';
    if (user.role !== selectedRole) {
      showToast(`This account is registered as a ${user.role}. Please select "${user.role.charAt(0).toUpperCase() + user.role.slice(1)}" on the login page.`, 'error');
      return;
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    document.getElementById('login-email').value = '';
    document.getElementById('login-pw').value    = '';

    if (user.role === 'lecturer') {
      goTo('page-dashboard');
    } else {
      goTo('page-student-dashboard');
    }
    Promise.all([loadTimetable(), loadNotifications()]).then(() => updateDashboard());
  } catch (err) {
    console.error(err);
    showToast('Server error. Make sure the backend is running.', 'error');
  }
}

function signUp() {
  showToast('Accounts are pre-provisioned. Please contact the administrator for access.', 'info');
}

function loadUserUI() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !user.full_name) return;

  const fullName = user.full_name || 'User';
  const role     = user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'User';
  const initials = fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase();
  const update   = (sel, val) => document.querySelectorAll(sel).forEach(el => { el.textContent = val; });

  update('.user-info p:first-child', fullName);
  update('.user-info p:last-child', role);
  update('.avatar', initials);
  update('.big-avatar', initials);
  update('.profile-name', fullName);
  update('.profile-role', role);
  update('.welcome-text', `Welcome back, ${fullName.split(' ')[0] || fullName}!`);

  document.querySelectorAll('.profile-fullname').forEach(el => { el.value = user.full_name || ''; });
  document.querySelectorAll('.profile-email').forEach(el => { el.value = user.email || ''; });
}

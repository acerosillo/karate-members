// ==========================================
// MARTIAL ARTS DOJO MANAGEMENT - APP LOGIC
// ==========================================

const API_BASE = '/api';

const state = {
  activeTab: 'register',
  students: [],
  register: {
    date: new Date().toISOString().slice(0, 10),
    class_name: 'Tuesday Class (7:00 PM - 8:00 PM)',
    students: []
  },
  missedAlerts: [],
  unpaidSessions: [],
  events: [],
  stats: {},
  selectedStudent: null,
  editingStudentId: null,
  editingEventId: null
};

// Training Schedule Helpers (Tuesdays 7-8pm, Saturdays 11:30am-12:30pm)
function getScheduleForDate(dateStr) {
  if (!dateStr) return { sessionName: 'Tuesday Class (7:00 PM - 8:00 PM)', badgeText: 'Tuesday', badgeClass: 'pill-present' };
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  if (day === 2) {
    return {
      isTrainingDay: true,
      dayName: 'Tuesday',
      sessionName: 'Tuesday Class (7:00 PM - 8:00 PM)',
      badgeText: '🥋 Tuesday (7:00 PM – 8:00 PM)',
      badgeClass: 'pill-present'
    };
  } else if (day === 6) {
    return {
      isTrainingDay: true,
      dayName: 'Saturday',
      sessionName: 'Saturday Class (11:30 AM - 12:30 PM)',
      badgeText: '🥋 Saturday (11:30 AM – 12:30 PM)',
      badgeClass: 'pill-present'
    };
  } else {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      isTrainingDay: false,
      dayName: days[day],
      sessionName: 'Special Squad / Seminar Session',
      badgeText: `🗓️ ${days[day]} (Extra / Special)`,
      badgeClass: 'pill-unpaid'
    };
  }
}

function getNextDayOfWeek(targetDay) { // 2 = Tuesday, 6 = Saturday
  const now = new Date();
  const currentDay = now.getDay();
  let diff = (targetDay - currentDay + 7) % 7;
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diff);
  return targetDate.toISOString().slice(0, 10);
}

function updateScheduleUI(dateStr) {
  const sched = getScheduleForDate(dateStr);
  const badge = document.getElementById('reg-day-badge');
  if (badge) {
    badge.textContent = sched.badgeText;
    badge.className = `pill ${sched.badgeClass}`;
  }
  const classSelect = document.getElementById('reg-class');
  if (classSelect) {
    classSelect.value = sched.sessionName;
    state.register.class_name = sched.sessionName;
  }
}

// Belt Rank Visual Mapping (Gup System & Dan Grades)
const BELT_CLASSES = {
  '10th Gup': 'belt-10-gup',
  '9th Gup': 'belt-9-gup',
  '8th Gup': 'belt-8-gup',
  '7th Gup': 'belt-7-gup',
  '6th Gup': 'belt-6-gup',
  '5th Gup': 'belt-5-gup',
  '4th Gup': 'belt-4-gup',
  '3rd Gup': 'belt-3-gup',
  '2nd Gup': 'belt-2-gup',
  '1st Gup': 'belt-1-gup',
  'Cho Dan Bo': 'belt-cho-dan-bo',
  '1st Dan': 'belt-dan',
  '2nd Dan': 'belt-dan',
  '3rd Dan': 'belt-dan'
};

function getBeltClass(rank) {
  if (!rank) return 'belt-10-gup';
  const cleanRank = rank.toLowerCase();
  
  if (cleanRank.includes('10th gup') || cleanRank.includes('10th') || cleanRank.includes('white belt')) return 'belt-10-gup';
  if (cleanRank.includes('9th gup') || cleanRank.includes('black band')) return 'belt-9-gup';
  if (cleanRank.includes('8th gup') || (cleanRank.includes('orange') && !cleanRank.includes('tag'))) return 'belt-8-gup';
  if (cleanRank.includes('7th gup') || (cleanRank.includes('orange') && cleanRank.includes('tag'))) return 'belt-7-gup';
  if (cleanRank.includes('6th gup') || (cleanRank.includes('green') && !cleanRank.includes('tag'))) return 'belt-6-gup';
  if (cleanRank.includes('5th gup') || (cleanRank.includes('green') && cleanRank.includes('tag'))) return 'belt-5-gup';
  if (cleanRank.includes('4th gup') || (cleanRank.includes('brown') && !cleanRank.includes('tag'))) return 'belt-4-gup';
  if (cleanRank.includes('3rd gup') || (cleanRank.includes('brown') && cleanRank.includes('tag'))) return 'belt-3-gup';
  if (cleanRank.includes('2nd gup') || (cleanRank.includes('red') && !cleanRank.includes('tag'))) return 'belt-2-gup';
  if (cleanRank.includes('1st gup') || (cleanRank.includes('red') && cleanRank.includes('tag'))) return 'belt-1-gup';
  if (cleanRank.includes('cho dan bo') || cleanRank.includes('blue belt')) return 'belt-cho-dan-bo';
  if (cleanRank.includes('dan') || cleanRank.includes('black')) return 'belt-dan';
  return 'belt-10-gup';
}

function getBeltColorHex(beltClass) {
  switch (beltClass) {
    case 'belt-10-gup':
    case 'belt-white': return '#ffffff';
    case 'belt-9-gup': return 'linear-gradient(90deg, #ffffff 38%, #000000 38%, #000000 62%, #ffffff 62%)';
    case 'belt-8-gup':
    case 'belt-orange': return '#ea580c';
    case 'belt-7-gup': return '#ea580c';
    case 'belt-6-gup':
    case 'belt-green': return '#16a34a';
    case 'belt-5-gup': return '#16a34a';
    case 'belt-4-gup':
    case 'belt-brown': return '#6d4c41';
    case 'belt-3-gup': return '#6d4c41';
    case 'belt-2-gup':
    case 'belt-red': return '#dc2626';
    case 'belt-1-gup': return '#dc2626';
    case 'belt-cho-dan-bo':
    case 'belt-blue': return '#1d4ed8';
    case 'belt-dan':
    case 'belt-black': return '#000000';
    default: return '#ffffff';
  }
}

function calculateAge(dobString) {
  if (!dobString) return '';
  const dob = new Date(dobString);
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function formatDate(dateStr) {
  if (!dateStr) return 'Not recorded';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'warning' ? 'toast-warning' : ''}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'danger') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initAuthForms();
  checkAuthAndInit();
});

function initApp() {
  initNavigation();
  initRegisterTab();
  initStudentsTab();
  initMonthlyTab();
  initEventsTab();

  document.getElementById('btn-logout').addEventListener('click', handleLogout);
  document.getElementById('btn-change-password').addEventListener('click', handleChangePassword);

  // Set default dates and schedule
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('reg-date').value = today;
  state.register.date = today;
  updateScheduleUI(today);

  const currentMonth = today.slice(0, 7);
  document.getElementById('monthly-filter-month').value = currentMonth;

  // Initial load
  loadDashboardStats();
  loadRegister();
  loadStudents();
  loadMissedAlerts();
  loadEvents();
}

// ==========================================
// LOGIN / AUTH
// ==========================================
async function checkAuthAndInit() {
  try {
    const res = await fetch(`${API_BASE}/auth/status`);
    const data = await res.json();
    if (!data.configured) {
      showAuthOverlay('setup');
    } else if (!data.authenticated) {
      showAuthOverlay('login');
    } else {
      hideAuthOverlay();
      initApp();
    }
  } catch (err) {
    console.error('Auth check failed:', err);
    showAuthOverlay('login');
  }
}

function showAuthOverlay(mode) {
  document.getElementById('auth-overlay').style.display = 'flex';
  document.getElementById('auth-login-form').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('auth-setup-form').style.display = mode === 'setup' ? 'block' : 'none';
  document.getElementById('auth-modal-title').textContent = mode === 'setup' ? '🔒 Set Up Canning Town TSD Login' : '🔒 Canning Town TSD Login';
  const errorBox = document.getElementById('auth-error');
  errorBox.style.display = 'none';
  errorBox.textContent = '';
}

function hideAuthOverlay() {
  document.getElementById('auth-overlay').style.display = 'none';
}

function showAuthError(message) {
  const errorBox = document.getElementById('auth-error');
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function initAuthForms() {
  document.getElementById('auth-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('auth-login-username').value.trim();
    const password = document.getElementById('auth-login-password').value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      hideAuthOverlay();
      initApp();
    } catch (err) {
      showAuthError(err.message);
    }
  });

  document.getElementById('auth-setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('auth-setup-username').value.trim();
    const password = document.getElementById('auth-setup-password').value;
    const passwordConfirm = document.getElementById('auth-setup-password-confirm').value;

    if (password.length < 6) return showAuthError('Password must be at least 6 characters.');
    if (password !== passwordConfirm) return showAuthError('Passwords do not match.');

    try {
      const res = await fetch(`${API_BASE}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');
      hideAuthOverlay();
      initApp();
    } catch (err) {
      showAuthError(err.message);
    }
  });
}

async function handleLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  } catch (err) {
    console.error('Logout error:', err);
  }
  window.location.reload();
}

async function handleChangePassword() {
  const currentPassword = prompt('Enter your current password:');
  if (currentPassword === null) return;

  const newPassword = prompt('Enter a new password (min 6 characters):');
  if (newPassword === null) return;
  if (newPassword.length < 6) return showToast('New password must be at least 6 characters.', 'danger');

  const confirmPassword = prompt('Confirm new password:');
  if (confirmPassword === null) return;
  if (newPassword !== confirmPassword) return showToast('Passwords do not match.', 'danger');

  try {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
    showToast('Password changed successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ==========================================
// NAVIGATION & STATS
// ==========================================
function initNavigation() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchTab(target);
      closeHeaderMenu();
    });
  });

  document.getElementById('btn-quick-add-student').addEventListener('click', () => {
    openStudentModal();
  });

  initHeaderMenu();
}

function initHeaderMenu() {
  const burger = document.getElementById('btn-header-burger');
  const panel = document.getElementById('header-collapsible');

  burger.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Auto-close the mobile menu once the viewport grows past the burger-menu breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeHeaderMenu();
  });
}

function closeHeaderMenu() {
  const burger = document.getElementById('btn-header-burger');
  const panel = document.getElementById('header-collapsible');
  panel.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(sec => {
    sec.classList.toggle('active', sec.id === `tab-${tabId}`);
  });

  if (tabId === 'students') loadStudents();
  if (tabId === 'monthly') {
    loadMissedAlerts();
    loadUnpaidSessions();
    loadMonthlyTable();
  }
  if (tabId === 'events') loadEvents();
  if (tabId === 'register') loadRegister();
}

async function loadDashboardStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const data = await res.json();
    state.stats = data;

    document.getElementById('kpi-total-students').textContent = data.total_students || 0;
    document.getElementById('kpi-missed-alerts').textContent = data.missed_alerts_count || 0;
    document.getElementById('kpi-unpaid-sessions').textContent = data.unpaid_count || 0;
    document.getElementById('kpi-upcoming-events').textContent = data.upcoming_events_count || 0;

    // Badges in tabs
    const navMissedBadge = document.getElementById('nav-missed-badge');
    if (data.missed_alerts_count > 0) {
      navMissedBadge.textContent = data.missed_alerts_count;
      navMissedBadge.style.display = 'inline-block';
    } else {
      navMissedBadge.style.display = 'none';
    }

    const navEventsBadge = document.getElementById('nav-events-badge');
    navEventsBadge.textContent = data.upcoming_events_count || 0;

  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// ==========================================
// DAILY REGISTER & TRAINING FEES
// ==========================================
function initRegisterTab() {
  const dateInput = document.getElementById('reg-date');
  const classInput = document.getElementById('reg-class');
  const todayBtn = document.getElementById('btn-today');
  const quickTueBtn = document.getElementById('btn-quick-tuesday');
  const quickSatBtn = document.getElementById('btn-quick-saturday');

  dateInput.addEventListener('change', (e) => {
    state.register.date = e.target.value;
    updateScheduleUI(e.target.value);
    loadRegister();
  });

  classInput.addEventListener('change', (e) => {
    state.register.class_name = e.target.value;
    loadRegister();
  });

  todayBtn.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.value = today;
    state.register.date = today;
    updateScheduleUI(today);
    loadRegister();
  });

  if (quickTueBtn) {
    quickTueBtn.addEventListener('click', () => {
      const nextTue = getNextDayOfWeek(2); // Tuesday
      dateInput.value = nextTue;
      state.register.date = nextTue;
      updateScheduleUI(nextTue);
      loadRegister();
      showToast('Switched to Tuesday Training (7:00 PM – 8:00 PM)', 'info');
    });
  }

  if (quickSatBtn) {
    quickSatBtn.addEventListener('click', () => {
      const nextSat = getNextDayOfWeek(6); // Saturday
      dateInput.value = nextSat;
      state.register.date = nextSat;
      updateScheduleUI(nextSat);
      loadRegister();
      showToast('Switched to Saturday Training (11:30 AM – 12:30 PM)', 'info');
    });
  }

  document.getElementById('btn-mark-all-present').addEventListener('click', () => {
    state.register.students.forEach(item => {
      item.attendance_status = 'present';
    });
    renderRegisterTable();
    updateRegisterPills();
  });

  document.getElementById('btn-mark-all-paid').addEventListener('click', () => {
    state.register.students.forEach(item => {
      if (item.attendance_status === 'present') {
        item.paid = 1;
        if (!item.amount_paid || item.amount_paid === 0) item.amount_paid = 10.0;
        if (!item.payment_method) item.payment_method = 'Cash';
      }
    });
    renderRegisterTable();
    updateRegisterPills();
  });

  document.getElementById('btn-save-register').addEventListener('click', saveRegister);

  // Search & Filters inside Register
  document.getElementById('reg-search').addEventListener('input', renderRegisterTable);
  document.getElementById('reg-filter-unpaid').addEventListener('change', renderRegisterTable);
  document.getElementById('reg-filter-missed').addEventListener('change', renderRegisterTable);
}

async function loadRegister() {
  const tbody = document.getElementById('register-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center loading-cell">Loading class register...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/register?date=${state.register.date}&class_name=${encodeURIComponent(state.register.class_name)}`);
    const data = await res.json();
    state.register.students = data.students || [];
    renderRegisterTable();
    updateRegisterPills();
  } catch (err) {
    console.error('Failed to load register:', err);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: var(--color-absent);">Failed to load register.</td></tr>';
  }
}

function renderRegisterTable() {
  const tbody = document.getElementById('register-tbody');
  tbody.innerHTML = '';

  const searchQuery = (document.getElementById('reg-search').value || '').toLowerCase().trim();
  const filterUnpaid = document.getElementById('reg-filter-unpaid').checked;
  const filterMissed = document.getElementById('reg-filter-missed').checked;

  const filtered = state.register.students.filter(s => {
    if (searchQuery) {
      const matchName = s.name.toLowerCase().includes(searchQuery);
      const matchBelt = (s.rank || '').toLowerCase().includes(searchQuery);
      const matchAssoc = (s.association_no || '').toLowerCase().includes(searchQuery);
      if (!matchName && !matchBelt && !matchAssoc) return false;
    }
    if (filterUnpaid && !(s.attendance_status === 'present' && s.paid == 0)) {
      return false;
    }
    if (filterMissed && (s.total_missed < 5)) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center loading-cell">No students match the current filters.</td></tr>';
    return;
  }

  filtered.forEach((item) => {
    const tr = document.createElement('tr');
    const isMissedAlert = item.total_missed >= 5;
    const isUnpaidAlert = item.attendance_status === 'present' && (!item.paid || item.paid === 0);

    if (isMissedAlert) tr.classList.add('row-missed-alert');
    if (isUnpaidAlert) tr.classList.add('row-unpaid-alert');

    const beltClass = getBeltClass(item.rank);

    tr.innerHTML = `
      <td>
        <strong style="color: #fff; font-size: 0.95rem;">${escapeHTML(item.name)}</strong>
        ${isMissedAlert ? `<span class="badge-missed-alert" title="Student has missed ${item.total_missed} lessons!">⚠️ ${item.total_missed} Missed</span>` : ''}
      </td>
      <td>
        <div class="status-toggle-group">
          <button type="button" class="toggle-btn ${item.attendance_status === 'present' ? 'active-present' : ''}" data-student-id="${item.student_id}" data-status="present">
            ✓ Present
          </button>
          <button type="button" class="toggle-btn ${item.attendance_status === 'absent' ? 'active-absent' : ''}" data-student-id="${item.student_id}" data-status="absent">
            ✕ Absent
          </button>
        </div>
      </td>
      <td>
        <span class="pill pill-present" style="font-size: 0.76rem;">
          ${item.current_month_lessons || 0} lessons
        </span>
      </td>
      <td>
        <button type="button" class="payment-btn ${item.attendance_status !== 'present' ? 'is-disabled' : item.paid ? 'is-paid' : 'is-unpaid'}"
          data-student-id="${item.student_id}" ${item.attendance_status !== 'present' ? 'disabled' : ''}>
          ${item.attendance_status !== 'present' ? '—' : item.paid ? '✓ Paid' : '⚠️ Unpaid'}
        </button>
      </td>
      <td>
        <span class="belt-badge ${beltClass}">
          <span class="belt-strip"></span>
          ${escapeHTML(item.rank || 'White')}
        </span>
      </td>
      <td><span style="font-family: monospace; font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(item.association_no || 'N/A')}</span></td>
    `;

    tbody.appendChild(tr);
  });

  // Attach event handlers
  tbody.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const studentId = parseInt(btn.getAttribute('data-student-id'), 10);
      const newStatus = btn.getAttribute('data-status');
      const item = state.register.students.find(s => s.student_id === studentId);
      if (item) {
        item.attendance_status = newStatus;
        if (newStatus === 'present' && (item.paid === undefined || item.paid === 0)) {
          // default unpaid unless set
          if (!item.amount_paid) item.amount_paid = 10.0;
          if (!item.payment_method) item.payment_method = 'Cash';
        }
        renderRegisterTable();
        updateRegisterPills();
      }
    });
  });

  tbody.querySelectorAll('.payment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const studentId = parseInt(btn.getAttribute('data-student-id'), 10);
      const item = state.register.students.find(s => s.student_id === studentId);
      if (item && item.attendance_status === 'present') {
        item.paid = item.paid ? 0 : 1;
        if (item.paid && (!item.amount_paid || item.amount_paid === 0)) {
          item.amount_paid = 10.0;
        }
        if (!item.payment_method) item.payment_method = 'Cash';
        renderRegisterTable();
        updateRegisterPills();
      }
    });
  });

}

function updateRegisterPills() {
  let presentCount = 0;
  let absentCount = 0;
  let unpaidCount = 0;
  let collected = 0;

  state.register.students.forEach(item => {
    if (item.attendance_status === 'present') {
      presentCount++;
      if (item.paid) {
        collected += Number(item.amount_paid) || 0;
      } else {
        unpaidCount++;
      }
    } else if (item.attendance_status === 'absent') {
      absentCount++;
    }
  });

  document.getElementById('reg-count-present').textContent = presentCount;
  document.getElementById('reg-count-absent').textContent = absentCount;
  document.getElementById('reg-count-unpaid').textContent = unpaidCount;
  document.getElementById('reg-count-collected').textContent = collected.toFixed(2);
}

async function saveRegister() {
  const saveBtn = document.getElementById('btn-save-register');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span>⏳</span> Saving...';

  try {
    const payload = {
      session_date: state.register.date,
      class_name: state.register.class_name,
      records: state.register.students.map(s => ({
        student_id: s.student_id,
        status: s.attendance_status || 'present',
        paid: s.paid ? 1 : 0,
        payment_method: s.payment_method || 'Cash',
        amount_paid: Number(s.amount_paid) || 0,
        notes: s.attendance_notes || ''
      }))
    };

    const res = await fetch(`${API_BASE}/register/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to save register');

    showToast(`Saved register for ${state.register.students.length} students!`, 'success');
    loadDashboardStats();
    loadRegister();
  } catch (err) {
    console.error('Error saving register:', err);
    showToast('Failed to save register. Please try again.', 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span>💾</span> Save Register';
  }
}

// ==========================================
// STUDENTS DIRECTORY
// ==========================================
function initStudentsTab() {
  document.getElementById('btn-add-student').addEventListener('click', () => openStudentModal());
  document.getElementById('btn-close-student-modal').addEventListener('click', closeStudentModal);
  document.getElementById('btn-cancel-student').addEventListener('click', closeStudentModal);

  document.getElementById('btn-close-history-modal').addEventListener('click', closeHistoryModal);

  document.getElementById('student-search').addEventListener('input', debounce(loadStudents, 300));
  document.getElementById('filter-rank').addEventListener('change', loadStudents);
  document.getElementById('filter-status').addEventListener('change', loadStudents);

  document.getElementById('student-form').addEventListener('submit', handleStudentFormSubmit);
}

async function loadStudents() {
  const grid = document.getElementById('students-grid');
  grid.innerHTML = '<p class="text-center loading-cell" style="grid-column: 1/-1;">Loading students directory...</p>';

  const search = document.getElementById('student-search').value;
  const rank = document.getElementById('filter-rank').value;
  const status = document.getElementById('filter-status').value;

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (rank && rank !== 'all') params.append('rank', rank);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE}/students?${params.toString()}`);
    const data = await res.json();
    state.students = data;
    renderStudentsGrid();
  } catch (err) {
    console.error('Failed to load students:', err);
    grid.innerHTML = '<p class="text-center" style="grid-column: 1/-1; color: var(--color-absent);">Error loading students.</p>';
  }
}

function renderStudentsGrid() {
  const grid = document.getElementById('students-grid');
  grid.innerHTML = '';

  if (state.students.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <p style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 1rem;">No karate students found matching your criteria.</p>
        <button class="btn btn-primary" onclick="openStudentModal()">+ Register New Member</button>
      </div>
    `;
    return;
  }

  state.students.forEach(student => {
    const card = document.createElement('div');
    const isMissedAlert = (student.total_missed || 0) >= 5;
    card.className = `student-card ${isMissedAlert ? 'has-missed-alert' : ''}`;

    const beltClass = getBeltClass(student.rank);
    const beltColorHex = getBeltColorHex(beltClass);
    const age = calculateAge(student.dob);

    card.innerHTML = `
      <div class="belt-ribbon" style="background: ${beltColorHex};"></div>
      <div class="card-header-main">
        <div class="student-name-group">
          <h3>${escapeHTML(student.name)}</h3>
          <div class="student-meta-assoc">
            <span>🥋 Assoc: ${escapeHTML(student.association_no || 'None')}</span>
            <span>Age: ${age || 'N/A'}</span>
            <span>Sex: ${student.gender ? `<span>${student.gender === 'm' ? 'M' : student.gender === 'f' ? 'F' : escapeHTML(student.gender)}</span>` : ''}</span>
          </div>
        </div>
        <span class="belt-badge ${beltClass}">
          <span class="belt-strip"></span>
          ${escapeHTML(student.rank)}
        </span>
      </div>

      <div class="card-body-info">
        <div class="info-item">
          <span class="info-label">📞 Telephone</span>
          <span class="info-val"><a href="tel:${escapeHTML(student.tel)}" style="color: var(--color-info); text-decoration: none;">${escapeHTML(student.tel)}</a></span>
        </div>

        <div class="info-item">
          <span class="info-label">📍 Address</span>
          <span class="info-val" title="${escapeHTML(student.address)}" style="max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHTML(student.address)}
          </span>
        </div>

        <div class="info-item">
          <span class="info-label">📅 Membership Period</span>
          <span class="info-val" style="font-size: 0.78rem;">
            ${formatDate(student.membership_start)} → ${formatDate(student.membership_end)}
          </span>
        </div>

        <div class="info-item">
          <span class="info-label">🥋 Last Graded</span>
          <span class="info-val">${formatDate(student.last_graded)}</span>
        </div>

        <div class="info-item">
          <span class="info-label">🎯 Next Testing Due</span>
          <span class="info-val highlight-test">${formatDate(student.due_testing)}</span>
        </div>

        <div class="info-item">
          <span class="info-label">📊 Lessons Summary</span>
          <span class="info-val">
            <span style="color: var(--color-present); font-weight: 700;">${student.total_attended || 0} Attended</span> / 
            <span style="color: ${isMissedAlert ? 'var(--color-absent)' : 'var(--text-muted)'}; font-weight: 700;">${student.total_missed || 0} Missed</span>
          </span>
        </div>

        ${student.eligibility && student.eligibility.has_requirements ? `
          <div class="rank-progress-box">
            <div class="rank-progress-header">
              <span style="font-weight: 700; color: #fff; font-size: 0.76rem;">
                Target: ${escapeHTML(student.eligibility.next_rank)}
              </span>
              <span class="${student.eligibility.eligible ? 'badge-eligible' : 'badge-in-progress'}">
                ${student.eligibility.eligible ? '🟢 Ready to Test' : `🟡 Needs ${student.eligibility.classes_remaining} classes`}
              </span>
            </div>
            <div class="rank-progress-track">
              <div class="rank-progress-fill ${student.eligibility.eligible ? 'is-complete' : ''}" style="width: ${student.eligibility.progress_percent}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem;">
              <span>Classes: <strong style="color: ${student.eligibility.classes_met ? 'var(--color-present)' : 'var(--text-main)'};">${student.eligibility.lessons_done} / ${student.eligibility.lessons_required}</strong> (${student.eligibility.progress_percent}%)</span>
              <span>Time: <strong>${student.eligibility.months_elapsed} / ${student.eligibility.time_text}</strong></span>
            </div>
          </div>
        ` : ''}

        ${isMissedAlert ? `
          <div style="margin-top: 0.35rem; padding: 0.4rem 0.6rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); font-size: 0.76rem; color: #fca5a5;">
            ⚠️ <strong>Missed >5 Lessons Alert</strong>: Follow up with student or guardian.
          </div>
        ` : ''}
      </div>

      <div class="card-actions-footer">
        <button class="btn btn-outline btn-sm" onclick="viewStudentHistory(${student.id})">
          <span>📜</span> History
        </button>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-outline btn-sm" onclick="editStudent(${student.id})">
            <span>✏️</span> Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent(${student.id}, '${escapeHTML(student.name)}', '${student.status}')" title="${student.status === 'archived' ? 'Permanently delete this member' : 'Archive this member'}">
            <span>🗑️</span>${student.status === 'archived' ? ' Delete Permanently' : ''}
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

function openStudentModal(student = null) {
  state.editingStudentId = student ? student.id : null;
  document.getElementById('student-modal-title').textContent = student ? 'Edit Karate Member' : 'Register New Karate Member';
  
  document.getElementById('student-id').value = student ? student.id : '';
  document.getElementById('student-name').value = student ? student.name : '';
  document.getElementById('student-dob').value = student ? student.dob : '';
  document.getElementById('student-gender').value = student ? (student.gender || '') : '';
  document.getElementById('student-tel').value = student ? student.tel : '';
  document.getElementById('student-assoc').value = student ? student.association_no : '';
  document.getElementById('student-address').value = student ? student.address : '';
  document.getElementById('student-mem-start').value = student ? student.membership_start : new Date().toISOString().slice(0, 10);
  
  // Default membership end 1 year from now
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  document.getElementById('student-mem-end').value = student ? student.membership_end : nextYear.toISOString().slice(0, 10);

  document.getElementById('student-rank').value = student ? student.rank : '10th (White)';
  document.getElementById('student-last-graded').value = student ? (student.last_graded || '') : '';
  document.getElementById('student-due-testing').value = student ? (student.due_testing || '') : '';
  document.getElementById('student-notes').value = student ? (student.notes || '') : '';
  document.getElementById('student-status').value = student ? (student.status || 'active') : 'active';

  document.getElementById('student-modal').style.display = 'flex';
}

function closeStudentModal() {
  document.getElementById('student-modal').style.display = 'none';
  state.editingStudentId = null;
}

async function handleStudentFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('btn-submit-student');
  submitBtn.disabled = true;

  const payload = {
    name: document.getElementById('student-name').value.trim(),
    dob: document.getElementById('student-dob').value,
    gender: document.getElementById('student-gender').value,
    tel: document.getElementById('student-tel').value.trim(),
    association_no: document.getElementById('student-assoc').value.trim(),
    address: document.getElementById('student-address').value.trim(),
    membership_start: document.getElementById('student-mem-start').value,
    membership_end: document.getElementById('student-mem-end').value,
    rank: document.getElementById('student-rank').value,
    last_graded: document.getElementById('student-last-graded').value || null,
    due_testing: document.getElementById('student-due-testing').value || null,
    notes: document.getElementById('student-notes').value.trim(),
    status: document.getElementById('student-status').value
  };

  try {
    let res;
    if (state.editingStudentId) {
      res = await fetch(`${API_BASE}/students/${state.editingStudentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save student');
    }

    showToast(`Member ${payload.name} saved successfully!`, 'success');
    closeStudentModal();
    loadDashboardStats();
    loadStudents();
    loadRegister();
  } catch (err) {
    console.error('Save error:', err);
    showToast(err.message, 'danger');
  } finally {
    submitBtn.disabled = false;
  }
}

async function editStudent(id) {
  try {
    const res = await fetch(`${API_BASE}/students/${id}`);
    const student = await res.json();
    openStudentModal(student);
  } catch (err) {
    console.error('Fetch student error:', err);
    showToast('Failed to load student details', 'danger');
  }
}

async function deleteStudent(id, name, status) {
  const isArchived = status === 'archived';

  if (isArchived) {
    const confirmPermanent = confirm(`"${name}" is already archived.\n\nPermanently delete this member? This CANNOT be undone and will erase their attendance and payment history too.`);
    if (!confirmPermanent) return;
  } else {
    const confirmArchive = confirm(`Are you sure you want to remove/archive "${name}"?\n\nTheir training history will be preserved.`);
    if (!confirmArchive) return;
  }

  try {
    const url = isArchived ? `${API_BASE}/students/${id}?permanent=true` : `${API_BASE}/students/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete student');
    showToast(isArchived ? `Member "${name}" permanently deleted.` : `Member "${name}" archived.`, 'warning');
    loadDashboardStats();
    loadStudents();
    loadRegister();
  } catch (err) {
    console.error('Delete error:', err);
    showToast('Failed to remove member.', 'danger');
  }
}

// Student Full History Modal
async function viewStudentHistory(studentId) {
  const modal = document.getElementById('history-modal');
  const body = document.getElementById('history-modal-body');
  body.innerHTML = '<p class="text-center loading-cell">Loading training record & history...</p>';
  modal.style.display = 'flex';

  try {
    const res = await fetch(`${API_BASE}/students/${studentId}`);
    const data = await res.json();
    state.selectedStudent = data;

    const beltClass = getBeltClass(data.rank);
    const age = calculateAge(data.dob);

    body.innerHTML = `
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius-md);">
        <div style="flex: 1; min-width: 240px;">
          <h2 style="font-size: 1.35rem; color: #fff; margin-bottom: 0.4rem;">${escapeHTML(data.name)}</h2>
          <div style="display: flex; gap: 0.6rem; align-items: center; margin-bottom: 0.5rem;">
            <span class="belt-badge ${beltClass}"><span class="belt-strip"></span> ${escapeHTML(data.rank)}</span>
            <span style="font-size: 0.82rem; color: var(--text-muted);">Lic: ${escapeHTML(data.association_no)}</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Age: ${age} (DOB: ${formatDate(data.dob)}) • Tel: ${escapeHTML(data.tel)}</p>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Address: ${escapeHTML(data.address)}</p>
        </div>

        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <div class="metric-chip">
            <span class="metric-icon">🥋</span>
            <div class="metric-info">
              <span class="metric-val" style="color: var(--color-present);">${data.total_attended || 0}</span>
              <span class="metric-label">Lessons Attended</span>
            </div>
          </div>
          <div class="metric-chip">
            <span class="metric-icon">⚠️</span>
            <div class="metric-info">
              <span class="metric-val" style="color: ${(data.total_missed || 0) >= 5 ? 'var(--color-absent)' : 'var(--text-muted)'};">${data.total_missed || 0}</span>
              <span class="metric-label">Lessons Missed</span>
            </div>
          </div>
          <div class="metric-chip">
            <span class="metric-icon">🎯</span>
            <div class="metric-info">
              <span class="metric-val" style="color: var(--gold);">${formatDate(data.due_testing)}</span>
              <span class="metric-label">Testing Due</span>
            </div>
          </div>
        </div>
      </div>

      <h4 style="margin-bottom: 0.8rem; color: #fff;">Monthly Training Breakdown</h4>
      <div class="table-container" style="margin-bottom: 1.5rem;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Lessons Attended</th>
              <th>Paid Sessions</th>
              <th>Unpaid Sessions</th>
              <th>Total Paid (£)</th>
            </tr>
          </thead>
          <tbody>
            ${(data.monthly_breakdown && data.monthly_breakdown.length > 0) ? data.monthly_breakdown.map(m => `
              <tr>
                <td><strong>${m.month}</strong></td>
                <td><span class="pill pill-present">${m.attended_lessons} lessons</span></td>
                <td>${m.paid_lessons}</td>
                <td><span style="color: ${m.unpaid_lessons > 0 ? 'var(--gold)' : 'var(--text-muted)'}; font-weight: 700;">${m.unpaid_lessons}</span></td>
                <td>£${(Number(m.total_amount_paid) || 0).toFixed(2)}</td>
              </tr>
            `).join('') : '<tr><td colspan="5" class="text-center">No monthly records yet.</td></tr>'}
          </tbody>
        </table>
      </div>

      <h4 style="margin-bottom: 0.8rem; color: #fff;">Attendance & Payment Session Log</h4>
      <div class="table-container" style="max-height: 280px; overflow-y: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Class</th>
              <th>Status</th>
              <th>Fee Status</th>
              <th>Method</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${(data.attendance_history && data.attendance_history.length > 0) ? data.attendance_history.map(h => `
              <tr>
                <td>${formatDate(h.session_date)}</td>
                <td>${escapeHTML(h.class_name)}</td>
                <td>
                  <span class="pill ${h.status === 'present' ? 'pill-present' : 'pill-absent'}">
                    ${h.status === 'present' ? '✓ Present' : '✕ Absent'}
                  </span>
                </td>
                <td>
                  <span class="pill ${h.paid ? 'pill-present' : 'pill-unpaid'}">
                    ${h.paid ? `✓ Paid £${Number(h.amount_paid).toFixed(2)}` : '⚠️ Unpaid'}
                  </span>
                </td>
                <td>${escapeHTML(h.payment_method || '—')}</td>
                <td>${escapeHTML(h.notes || '—')}</td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-center">No session history yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('History load error:', err);
    body.innerHTML = '<p class="text-center" style="color: var(--color-absent);">Failed to load history.</p>';
  }
}

function closeHistoryModal() {
  document.getElementById('history-modal').style.display = 'none';
  state.selectedStudent = null;
}

// ==========================================
// MONTHLY ATTENDANCE & MISSED LESSONS
// ==========================================
function initMonthlyTab() {
  document.getElementById('monthly-filter-month').addEventListener('change', loadMonthlyTable);
  document.getElementById('btn-refresh-unpaid').addEventListener('click', loadUnpaidSessions);
  document.getElementById('btn-export-monthly-csv').addEventListener('click', () => {
    window.location.href = `${API_BASE}/export/csv?type=monthly`;
  });
}

async function loadMissedAlerts() {
  const container = document.getElementById('missed-cards-container');
  const pill = document.getElementById('missed-total-pill');
  container.innerHTML = '<p class="loading-cell text-center" style="grid-column: 1/-1;">Checking attendance patterns...</p>';

  try {
    const res = await fetch(`${API_BASE}/missed-alerts`);
    const data = await res.json();
    state.missedAlerts = data.alerts || [];

    pill.textContent = `${state.missedAlerts.length} Students Flagged`;

    if (state.missedAlerts.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-md); text-align: center; color: var(--color-present);">
          🎉 <strong>Great news!</strong> No active students have missed 5 or more classes recently. Attendance is healthy!
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    state.missedAlerts.forEach(student => {
      const card = document.createElement('div');
      card.className = 'missed-card';
      const beltClass = getBeltClass(student.rank);

      card.innerHTML = `
        <div class="missed-card-header">
          <div>
            <h4 style="color: #fff; font-size: 1.05rem;">${escapeHTML(student.name)}</h4>
            <span class="belt-badge ${beltClass}" style="margin-top: 0.3rem;">
              <span class="belt-strip"></span> ${escapeHTML(student.rank)}
            </span>
          </div>
          <span class="missed-count-pill">
            ⚠️ ${student.total_missed} Missed
          </span>
        </div>

        <div class="missed-details">
          <div><strong>Recent Consecutive Absences:</strong> <span style="color: var(--color-absent); font-weight: 700;">${student.consecutive_missed} in a row</span></div>
          <div><strong>Last Attended Session:</strong> ${formatDate(student.last_attended_date)}</div>
          <div><strong>Contact Telephone:</strong> <a href="tel:${escapeHTML(student.tel)}" style="color: var(--color-info); text-decoration: none;">${escapeHTML(student.tel)}</a></div>
          ${student.notes ? `<div><strong>Notes:</strong> <em>${escapeHTML(student.notes)}</em></div>` : ''}
        </div>

        <div class="missed-actions">
          <a href="tel:${escapeHTML(student.tel)}" class="btn btn-outline btn-sm" style="flex: 1;">
            📞 Call Student
          </a>
          <button class="btn btn-outline btn-sm" onclick="viewStudentHistory(${student.id})" style="flex: 1;">
            📜 View Log
          </button>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error('Missed alerts error:', err);
    container.innerHTML = '<p class="text-center" style="color: var(--color-absent); grid-column: 1/-1;">Failed to load missed lesson alerts.</p>';
  }
}

async function loadUnpaidSessions() {
  const tbody = document.getElementById('unpaid-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center loading-cell">Loading unpaid sessions...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/unpaid`);
    const data = await res.json();
    state.unpaidSessions = data || [];

    if (state.unpaidSessions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--color-present); padding: 1.5rem;">🎉 All attended classes have been paid for! Zero pending fees.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    state.unpaidSessions.forEach(item => {
      const tr = document.createElement('tr');
      const beltClass = getBeltClass(item.rank);

      tr.innerHTML = `
        <td>${formatDate(item.session_date)}</td>
        <td><strong>${escapeHTML(item.student_name)}</strong></td>
        <td><span class="belt-badge ${beltClass}"><span class="belt-strip"></span> ${escapeHTML(item.rank)}</span></td>
        <td>${escapeHTML(item.class_name)}</td>
        <td><a href="tel:${escapeHTML(item.tel)}" style="color: var(--color-info);">${escapeHTML(item.tel)}</a></td>
        <td>
          <button class="btn btn-success btn-sm" onclick="markSingleSessionPaid(${item.attendance_id}, '${escapeHTML(item.student_name)}')">
            💳 Mark Paid (£10.00)
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Unpaid sessions error:', err);
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--color-absent);">Failed to load unpaid sessions.</td></tr>';
  }
}

async function markSingleSessionPaid(attendanceId, studentName) {
  try {
    // Find attendance record or post update
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attendance_id: attendanceId,
        student_id: state.unpaidSessions.find(u => u.attendance_id === attendanceId)?.student_id,
        session_date: state.unpaidSessions.find(u => u.attendance_id === attendanceId)?.session_date,
        class_name: state.unpaidSessions.find(u => u.attendance_id === attendanceId)?.class_name,
        status: 'present',
        paid: 1,
        payment_method: 'Cash',
        amount_paid: 10.0,
        notes: 'Paid via fee tracker'
      })
    });

    if (!res.ok) throw new Error('Payment update failed');

    showToast(`Marked training session paid for ${studentName}!`, 'success');
    loadUnpaidSessions();
    loadDashboardStats();
    if (state.activeTab === 'register') loadRegister();
  } catch (err) {
    console.error('Payment update error:', err);
    showToast('Failed to update payment status.', 'danger');
  }
}

async function loadMonthlyTable() {
  const tbody = document.getElementById('monthly-tbody');
  tbody.innerHTML = '<tr><td colspan="9" class="text-center loading-cell">Aggregating monthly lesson totals...</td></tr>';

  const selectedMonth = document.getElementById('monthly-filter-month').value;

  try {
    const url = selectedMonth ? `${API_BASE}/monthly?month=${selectedMonth}` : `${API_BASE}/monthly`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center loading-cell">No lesson attendance recorded for this month.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach(item => {
      const tr = document.createElement('tr');
      const beltClass = getBeltClass(item.rank);

      // Consistency Rating
      let ratingBadge = '<span class="pill pill-present">🥋 Dedicated</span>';
      if (item.attended_lessons < 4) {
        ratingBadge = '<span class="pill pill-absent">⚠️ Irregular</span>';
      } else if (item.attended_lessons < 8) {
        ratingBadge = '<span class="pill pill-unpaid">👍 Regular</span>';
      }

      tr.innerHTML = `
        <td><strong style="color: #fff;">${escapeHTML(item.name)}</strong></td>
        <td><span class="belt-badge ${beltClass}"><span class="belt-strip"></span> ${escapeHTML(item.rank)}</span></td>
        <td><span style="font-family: monospace; font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(item.association_no || 'N/A')}</span></td>
        <td>${item.month}</td>
        <td><strong style="color: var(--color-present); font-size: 1.05rem;">${item.attended_lessons} lessons</strong></td>
        <td>${item.attended_lessons - item.unpaid_lessons}</td>
        <td>
          <span style="color: ${item.unpaid_lessons > 0 ? 'var(--gold)' : 'var(--text-muted)'}; font-weight: 700;">
            ${item.unpaid_lessons > 0 ? `⚠️ ${item.unpaid_lessons} unpaid` : '0'}
          </span>
        </td>
        <td><strong>£${(Number(item.total_paid) || 0).toFixed(2)}</strong></td>
        <td>${ratingBadge}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Monthly table error:', err);
    tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="color: var(--color-absent);">Failed to load monthly table.</td></tr>';
  }
}

// ==========================================
// EVENTS & GRADING REMINDERS
// ==========================================
function initEventsTab() {
  document.getElementById('btn-add-event').addEventListener('click', () => openEventModal());
  document.getElementById('btn-close-event-modal').addEventListener('click', closeEventModal);
  document.getElementById('btn-cancel-event').addEventListener('click', closeEventModal);

  document.getElementById('event-form').addEventListener('submit', handleEventFormSubmit);
}

async function loadEvents() {
  const grid = document.getElementById('events-grid');
  grid.innerHTML = '<p class="text-center loading-cell" style="grid-column: 1/-1;">Loading dojo events & gradings...</p>';

  loadGradingCandidates();

  try {
    const res = await fetch(`${API_BASE}/events`);
    const data = await res.json();
    state.events = data;
    renderEventsGrid();
  } catch (err) {
    console.error('Failed to load events:', err);
    grid.innerHTML = '<p class="text-center" style="color: var(--color-absent); grid-column: 1/-1;">Failed to load events.</p>';
  }
}

async function loadGradingCandidates() {
  const container = document.getElementById('candidates-grid');
  container.innerHTML = '<p class="loading-cell text-center" style="grid-column: 1/-1;">Finding students due for belt testing...</p>';

  try {
    const res = await fetch(`${API_BASE}/candidates`);
    const candidates = await res.json();

    if (candidates.length === 0) {
      container.innerHTML = '<p class="text-center" style="grid-column: 1/-1; color: var(--text-muted);">No members are due for testing in the upcoming 30-45 days.</p>';
      return;
    }

    container.innerHTML = '';
    candidates.forEach(cand => {
      const card = document.createElement('div');
      card.className = 'candidate-card';
      const beltClass = getBeltClass(cand.rank);
      const elig = cand.eligibility;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
          <h4>${escapeHTML(cand.name)}</h4>
          <span class="belt-badge ${beltClass}"><span class="belt-strip"></span> ${escapeHTML(cand.rank)}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--gold); font-weight: 700;">
          🎯 Next Testing Due: ${formatDate(cand.due_testing)}
        </div>
        ${elig && elig.has_requirements ? `
          <div style="margin-top: 0.25rem; font-size: 0.78rem;">
            <div>Target: <strong style="color: #fff;">${escapeHTML(elig.next_rank)}</strong></div>
            <div style="display: flex; justify-content: space-between; margin-top: 0.35rem; align-items: center;">
              <span>Classes: <strong style="color: ${elig.classes_met ? 'var(--color-present)' : 'var(--gold)'};">${elig.lessons_done} / ${elig.lessons_required} classes</strong></span>
              <span class="${elig.eligible ? 'badge-eligible' : 'badge-in-progress'}">
                ${elig.eligible ? '✓ Met Requirements' : `Needs ${elig.classes_remaining} more`}
              </span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">
              Time: ${elig.months_elapsed} / ${elig.time_text} ${elig.time_met ? '✓' : ''}
            </div>
          </div>
        ` : `
          <div style="font-size: 0.78rem; color: var(--text-muted);">
            Lessons Attended: <strong>${cand.total_attended || 0}</strong>
          </div>
        `}
        <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 0.35rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.35rem;">
          Last Graded: ${formatDate(cand.last_graded)}
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Candidates error:', err);
    container.innerHTML = '<p class="text-center" style="color: var(--color-absent); grid-column: 1/-1;">Failed to load testing candidates.</p>';
  }
}

function renderEventsGrid() {
  const grid = document.getElementById('events-grid');
  grid.innerHTML = '';

  if (state.events.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg);">
        <p style="color: var(--text-muted); margin-bottom: 1rem;">No events or gradings scheduled currently.</p>
        <button class="btn btn-primary" onclick="openEventModal()">+ Create Karate Event</button>
      </div>
    `;
    return;
  }

  state.events.forEach(event => {
    const card = document.createElement('div');
    card.className = 'event-card';

    // Countdown calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.event_date);
    const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

    let countdownText = `${diffDays} days away`;
    if (diffDays === 0) countdownText = 'Happening Today!';
    else if (diffDays === 1) countdownText = 'Tomorrow!';
    else if (diffDays < 0) countdownText = `${Math.abs(diffDays)} days ago (Completed)`;

    let typeBadgeClass = 'type-grading';
    if (event.event_type === 'competition') typeBadgeClass = 'type-competition';
    if (event.event_type === 'seminar') typeBadgeClass = 'type-seminar';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="event-type-badge ${typeBadgeClass}">
          ${event.event_type === 'grading' ? '🥋 Dan Grading' : event.event_type === 'competition' ? '🏆 Championship' : '📚 Seminar'}
        </span>
        <span class="countdown-badge">${countdownText}</span>
      </div>

      <h3 style="color: #fff; font-size: 1.15rem;">${escapeHTML(event.title)}</h3>

      <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.35rem;">
        <div>📅 <strong>Date:</strong> ${formatDate(event.event_date)} ${event.event_time ? `• ${escapeHTML(event.event_time)}` : ''}</div>
        <div>📍 <strong>Venue:</strong> ${escapeHTML(event.location || 'Honbu Dojo')}</div>
        <div>👥 <strong>Registered Students:</strong> ${event.participant_count || 0} participants</div>
        ${event.description ? `<div style="margin-top: 0.35rem; color: var(--text-main); font-size: 0.82rem; background: rgba(0,0,0,0.2); padding: 0.6rem; border-radius: var(--radius-sm);">${escapeHTML(event.description)}</div>` : ''}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.8rem; border-top: 1px solid var(--border-color);">
        <button class="btn btn-outline btn-sm" onclick="manageEventParticipants(${event.id}, '${escapeHTML(event.title)}')">
          👥 Roster & Candidates (${event.participant_count || 0})
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteEvent(${event.id}, '${escapeHTML(event.title)}')">
          🗑️
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

function openEventModal(event = null) {
  state.editingEventId = event ? event.id : null;
  document.getElementById('event-modal-title').textContent = event ? 'Edit Event' : 'Create Karate Event';

  document.getElementById('event-id').value = event ? event.id : '';
  document.getElementById('event-title').value = event ? event.title : '';
  document.getElementById('event-type').value = event ? event.event_type : 'grading';
  document.getElementById('event-date').value = event ? event.event_date : new Date().toISOString().slice(0, 10);
  document.getElementById('event-time').value = event ? (event.event_time || '') : '10:00 - 13:00';
  document.getElementById('event-reminder').value = event ? (event.reminder_days || 14) : 14;
  document.getElementById('event-location').value = event ? (event.location || '') : 'Honbu Dojo, Birmingham';
  document.getElementById('event-desc').value = event ? (event.description || '') : '';

  document.getElementById('event-modal').style.display = 'flex';
}

function closeEventModal() {
  document.getElementById('event-modal').style.display = 'none';
  state.editingEventId = null;
}

async function handleEventFormSubmit(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('event-title').value.trim(),
    event_type: document.getElementById('event-type').value,
    event_date: document.getElementById('event-date').value,
    event_time: document.getElementById('event-time').value.trim(),
    reminder_days: parseInt(document.getElementById('event-reminder').value, 10) || 7,
    location: document.getElementById('event-location').value.trim(),
    description: document.getElementById('event-desc').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to create event');

    showToast(`Event "${payload.title}" created successfully!`, 'success');
    closeEventModal();
    loadDashboardStats();
    loadEvents();
  } catch (err) {
    console.error('Event save error:', err);
    showToast(err.message, 'danger');
  }
}

async function deleteEvent(id, title) {
  if (!confirm(`Are you sure you want to delete event "${title}"?`)) return;

  try {
    const res = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete event');
    showToast(`Event "${title}" deleted.`, 'warning');
    loadDashboardStats();
    loadEvents();
  } catch (err) {
    console.error('Delete event error:', err);
    showToast('Failed to delete event', 'danger');
  }
}

async function manageEventParticipants(eventId, eventTitle) {
  // Use history modal to show event participants
  const modal = document.getElementById('history-modal');
  const body = document.getElementById('history-modal-body');
  document.getElementById('history-modal-title').textContent = `Roster for: ${eventTitle}`;
  body.innerHTML = '<p class="text-center loading-cell">Loading event participant roster...</p>';
  modal.style.display = 'flex';

  try {
    const res = await fetch(`${API_BASE}/events/${eventId}`);
    const event = await res.json();

    const studentsRes = await fetch(`${API_BASE}/students?status=active`);
    const allStudents = await studentsRes.json();

    body.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h3 style="color: #fff;">${escapeHTML(event.title)}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${formatDate(event.event_date)} • ${escapeHTML(event.location || '')}</p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <select id="select-add-participant" class="form-control" style="width: 220px;">
            <option value="">Select student to add...</option>
            ${allStudents.map(s => `<option value="${s.id}">${escapeHTML(s.name)} (${escapeHTML(s.rank)})</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="btn-add-part-confirm">+ Add</button>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Rank</th>
              <th>Status</th>
              <th>Telephone</th>
              <th>Notes / Division</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${(event.participants && event.participants.length > 0) ? event.participants.map(p => `
              <tr>
                <td><strong>${escapeHTML(p.name)}</strong></td>
                <td><span class="belt-badge ${getBeltClass(p.rank)}"><span class="belt-strip"></span> ${escapeHTML(p.rank)}</span></td>
                <td><span class="pill pill-present">${escapeHTML(p.participant_status || 'Registered')}</span></td>
                <td>${escapeHTML(p.tel || 'N/A')}</td>
                <td>${escapeHTML(p.participant_notes || '—')}</td>
                <td>
                  <button class="btn btn-danger btn-sm" onclick="removeEventParticipantAction(${eventId}, ${p.student_id}, '${escapeHTML(eventTitle)}')">
                    Remove
                  </button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-center loading-cell">No students registered for this event yet. Use the dropdown above to add candidates!</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('btn-add-part-confirm').addEventListener('click', async () => {
      const studentId = document.getElementById('select-add-participant').value;
      if (!studentId) return alert('Please select a student');

      try {
        const addRes = await fetch(`${API_BASE}/events/${eventId}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: parseInt(studentId, 10), status: 'registered' })
        });
        if (!addRes.ok) throw new Error('Failed to add participant');
        showToast('Student registered for event!', 'success');
        manageEventParticipants(eventId, eventTitle);
        loadEvents();
      } catch (e) {
        showToast('Failed to add participant', 'danger');
      }
    });

  } catch (err) {
    console.error('Participant load error:', err);
    body.innerHTML = '<p class="text-center" style="color: var(--color-absent);">Failed to load participants.</p>';
  }
}

async function removeEventParticipantAction(eventId, studentId, eventTitle) {
  try {
    const res = await fetch(`${API_BASE}/events/${eventId}/participants/${studentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove');
    showToast('Participant removed from event', 'warning');
    manageEventParticipants(eventId, eventTitle);
    loadEvents();
  } catch (err) {
    showToast('Failed to remove participant', 'danger');
  }
}

// ==========================================
// UTILITIES
// ==========================================
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

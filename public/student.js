// ==========================================
// STUDENT SELF-SERVICE PORTAL - APP LOGIC
// Completely separate from the admin app.js / session -
// this only ever talks to /api/student-auth/* and /api/student/me.
// ==========================================

const API_BASE = '/api';

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

function formatMonth(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

const BELT_CLASSES = {
  '10th gup': 'belt-10-gup',
  '9th gup': 'belt-9-gup',
  '8th gup': 'belt-8-gup',
  '7th gup': 'belt-7-gup',
  '6th gup': 'belt-6-gup',
  '5th gup': 'belt-5-gup',
  '4th gup': 'belt-4-gup',
  '3rd gup': 'belt-3-gup',
  '2nd gup': 'belt-2-gup',
  '1st gup': 'belt-1-gup',
  'cho dan bo': 'belt-cho-dan-bo'
};

function getBeltClass(rank) {
  if (!rank) return 'belt-10-gup';
  const cleanRank = rank.toLowerCase();
  for (const [key, cls] of Object.entries(BELT_CLASSES)) {
    if (cleanRank.includes(key)) return cls;
  }
  if (cleanRank.includes('dan') || cleanRank.includes('black')) return 'belt-dan';
  return 'belt-10-gup';
}

function getBeltColorHex(beltClass) {
  switch (beltClass) {
    case 'belt-10-gup': return '#ffffff';
    case 'belt-9-gup': return 'linear-gradient(90deg, #ffffff 38%, #000000 38%, #000000 62%, #ffffff 62%)';
    case 'belt-8-gup':
    case 'belt-7-gup': return '#ea580c';
    case 'belt-6-gup':
    case 'belt-5-gup': return '#16a34a';
    case 'belt-4-gup':
    case 'belt-3-gup': return '#6d4c41';
    case 'belt-2-gup':
    case 'belt-1-gup': return '#dc2626';
    case 'belt-cho-dan-bo': return '#1d4ed8';
    case 'belt-dan': return '#000000';
    default: return '#ffffff';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('student-login-form')) {
    initStudentLoginPage();
  } else if (document.getElementById('student-portal-root')) {
    initStudentPortalPage();
  }
});

// ==========================================
// LOGIN PAGE
// ==========================================
function initStudentLoginPage() {
  const form = document.getElementById('student-login-form');
  const errorBox = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    errorBox.textContent = '';

    const firstName = document.getElementById('login-first-name').value.trim();
    const associationNo = document.getElementById('login-association-no').value.trim();

    try {
      const res = await fetch(`${API_BASE}/student-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, associationNo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      window.location.href = '/student-portal.html';
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
    }
  });
}

// ==========================================
// PORTAL PAGE
// ==========================================
async function initStudentPortalPage() {
  try {
    const statusRes = await fetch(`${API_BASE}/student-auth/status`);
    const status = await statusRes.json();
    if (!status.authenticated) {
      window.location.href = '/student-login.html';
      return;
    }

    const meRes = await fetch(`${API_BASE}/student/me`);
    if (!meRes.ok) {
      window.location.href = '/student-login.html';
      return;
    }
    const student = await meRes.json();
    renderStudentPortal(student);

    document.getElementById('student-portal-loading').style.display = 'none';
    document.getElementById('student-portal-root').style.display = 'block';
  } catch (err) {
    console.error('Failed to load student portal:', err);
    window.location.href = '/student-login.html';
    return;
  }

  document.getElementById('btn-portal-logout').addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE}/student-auth/logout`, { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    window.location.href = '/student-login.html';
  });
}

function renderStudentPortal(student) {
  document.getElementById('portal-student-name').textContent = student.name || '';
  document.getElementById('portal-profile-name').textContent = student.name || '';
  document.getElementById('portal-profile-assoc').textContent = student.association_no || 'N/A';

  const beltClass = getBeltClass(student.rank);
  const badge = document.getElementById('portal-belt-badge');
  badge.className = `belt-badge ${beltClass}`;
  document.getElementById('portal-belt-strip').style.background = getBeltColorHex(beltClass);
  document.getElementById('portal-belt-text').textContent = student.rank || 'White';

  document.getElementById('portal-membership-start').textContent = formatDate(student.membership_start);
  document.getElementById('portal-last-graded').textContent = formatDate(student.last_graded);
  document.getElementById('portal-due-testing').textContent = formatDate(student.due_testing);
  document.getElementById('portal-last-attended').textContent = formatDate(student.last_attended_date);

  document.getElementById('portal-stat-month').textContent = student.lessons_this_month || 0;
  document.getElementById('portal-stat-year').textContent = student.lessons_this_year || 0;
  document.getElementById('portal-stat-total').textContent = student.total_attended || 0;
  document.getElementById('portal-stat-missed').textContent = student.total_missed || 0;

  const progressBox = document.getElementById('portal-progress-box');
  const elig = student.eligibility;
  if (elig && elig.has_requirements) {
    progressBox.innerHTML = `
      <div class="rank-progress-box" style="margin-top: 1.25rem;">
        <div class="rank-progress-header">
          <span style="font-weight: 700; color: #fff; font-size: 0.8rem;">
            Target: ${escapeHTML(elig.next_rank)}
          </span>
          <span class="${elig.eligible ? 'badge-eligible' : 'badge-in-progress'}">
            ${elig.eligible ? '🟢 Ready to Test' : `🟡 Needs ${elig.classes_remaining} classes`}
          </span>
        </div>
        <div class="rank-progress-track">
          <div class="rank-progress-fill ${elig.eligible ? 'is-complete' : ''}" style="width: ${elig.progress_percent}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">
          <span>Classes: <strong style="color: ${elig.classes_met ? 'var(--color-present)' : 'var(--text-main)'};">${elig.lessons_done} / ${elig.lessons_required}</strong> (${elig.progress_percent}%)</span>
          <span>Time: <strong>${elig.months_elapsed} / ${elig.time_text}</strong></span>
        </div>
      </div>
    `;
  } else {
    progressBox.innerHTML = '';
  }

  const tbody = document.getElementById('portal-monthly-tbody');
  const monthly = student.monthly_breakdown || [];
  if (monthly.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center loading-cell">No attendance recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = monthly.map(m => `
    <tr>
      <td>${escapeHTML(formatMonth(m.month))}</td>
      <td>${m.attended_lessons || 0}</td>
      <td><span class="pill pill-present" style="font-size: 0.72rem;">${m.paid_lessons || 0}</span></td>
      <td>${m.unpaid_lessons ? `<span class="pill pill-unpaid" style="font-size: 0.72rem;">${m.unpaid_lessons}</span>` : '0'}</td>
    </tr>
  `).join('');
}

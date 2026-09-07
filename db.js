const { createClient } = require('@libsql/client');
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');

// Gup Rank Progression & Minimum Classes / Time Requirements
const GUP_REQUIREMENTS = {
  '10th Gup (White Belt)': {
    shortRank: '10th Gup',
    beltName: 'White Belt',
    nextRank: '9th Gup',
    minTimeWeeks: 6,
    minTimeMonths: 1.5,
    minClasses: 12,
    timeText: '6 weeks'
  },
  '9th Gup (White Belt)': {
    shortRank: '9th Gup',
    beltName: 'White Belt (Black Band)',
    nextRank: '8th Gup (Orange Belt)',
    minTimeWeeks: 12,
    minTimeMonths: 3,
    minClasses: 24,
    timeText: '3 months'
  },
  '8th Gup (Orange Belt)': {
    shortRank: '8th Gup',
    beltName: 'Orange Belt',
    nextRank: '7th Gup (Orange Tag Belt)',
    minTimeWeeks: 12,
    minTimeMonths: 3,
    minClasses: 24,
    timeText: '3 months'
  },
  '7th Gup (Orange Tag Belt)': {
    shortRank: '7th Gup',
    beltName: 'Orange Tag Belt',
    nextRank: '6th Gup (Green Belt)',
    minTimeWeeks: 12,
    minTimeMonths: 3,
    minClasses: 24,
    timeText: '3 months'
  },
  '6th Gup (Green Belt)': {
    shortRank: '6th Gup',
    beltName: 'Green Belt',
    nextRank: '5th Gup (Green Tag Belt)',
    minTimeWeeks: 12,
    minTimeMonths: 3,
    minClasses: 24,
    timeText: '3 months'
  },
  '5th Gup (Green Tag Belt)': {
    shortRank: '5th Gup',
    beltName: 'Green Tag Belt',
    nextRank: '4th Gup (Brown Belt)',
    minTimeWeeks: 12,
    minTimeMonths: 3,
    minClasses: 24,
    timeText: '3 months'
  },
  '4th Gup (Brown Belt)': {
    shortRank: '4th Gup',
    beltName: 'Brown Belt',
    nextRank: '3rd Gup (Brown Tag Belt)',
    minTimeWeeks: 12,
    minTimeMonths: 3,
    minClasses: 24,
    timeText: '3 months'
  },
  '3rd Gup (Brown Tag Belt)': {
    shortRank: '3rd Gup',
    beltName: 'Brown Tag Belt',
    nextRank: '2nd Gup (Red Belt)',
    minTimeWeeks: 12,
    minTimeMonths: 3,
    minClasses: 24,
    timeText: '3 months'
  },
  '2nd Gup (Red Belt)': {
    shortRank: '2nd Gup',
    beltName: 'Red Belt',
    nextRank: '1st Gup (Red Tag Belt)',
    minTimeWeeks: 24,
    minTimeMonths: 6,
    minClasses: 60,
    timeText: '6 months'
  },
  '1st Gup (Red Tag Belt)': {
    shortRank: '1st Gup',
    beltName: 'Red Tag Belt',
    nextRank: 'Cho Dan Bo (Blue Belt - Black Belt Candidate)',
    minTimeWeeks: 24,
    minTimeMonths: 6,
    minClasses: 60,
    timeText: '6 months'
  },
  'Cho Dan Bo (Blue Belt - Black Belt Candidate)': {
    shortRank: 'Cho Dan Bo',
    beltName: 'Blue Belt (Black Belt Candidate)',
    nextRank: '1st Dan (Black Belt)',
    minTimeWeeks: 24,
    minTimeMonths: 6,
    minClasses: 60,
    timeText: '6 months'
  }
};

function getRankRequirements(rankStr) {
  if (!rankStr) return null;
  const cleanRank = rankStr.toLowerCase();
  for (const [key, req] of Object.entries(GUP_REQUIREMENTS)) {
    if (cleanRank.includes(req.shortRank.toLowerCase())) {
      return { currentRank: key, ...req };
    }
    if (cleanRank.includes('cho dan bo') && key.toLowerCase().includes('cho dan bo')) {
      return { currentRank: key, ...req };
    }
  }
  return null;
}

function evaluateEligibility(student) {
  if (!student) return null;
  const req = getRankRequirements(student.rank);
  const lessonsDone = Number(student.lessons_since_last_graded) || 0;

  const baseDateStr = student.last_graded || student.membership_start;
  let weeksElapsed = 0;
  let monthsElapsed = 0;
  if (baseDateStr) {
    const baseDate = new Date(baseDateStr);
    const now = new Date();
    const diffMs = Math.max(0, now - baseDate);
    weeksElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    monthsElapsed = Math.round((diffMs / (1000 * 60 * 60 * 24 * 30.4375)) * 10) / 10;
  }

  if (!req) {
    return {
      has_requirements: false,
      current_rank: student.rank,
      next_rank: null,
      lessons_done: lessonsDone,
      lessons_required: null,
      classes_met: true,
      time_met: true,
      eligible: true,
      summary: 'Senior Rank / Black Belt Dan Grade'
    };
  }

  const classesMet = lessonsDone >= req.minClasses;
  const timeMet = weeksElapsed >= req.minTimeWeeks;
  const eligible = classesMet && timeMet;

  const classesRemaining = Math.max(0, req.minClasses - lessonsDone);
  const progressPercent = Math.min(100, Math.round((lessonsDone / req.minClasses) * 100));

  return {
    has_requirements: true,
    current_rank: req.currentRank,
    next_rank: req.nextRank,
    belt_name: req.beltName,
    lessons_done: lessonsDone,
    lessons_required: req.minClasses,
    classes_remaining: classesRemaining,
    progress_percent: progressPercent,
    classes_met: classesMet,
    time_met: timeMet,
    weeks_elapsed: weeksElapsed,
    weeks_required: req.minTimeWeeks,
    months_elapsed: monthsElapsed,
    months_required: req.minTimeMonths,
    time_text: req.timeText,
    eligible: eligible,
    summary: eligible
      ? `Eligible for ${req.nextRank} (${lessonsDone}/${req.minClasses} classes, ${monthsElapsed}/${req.timeText})`
      : `${lessonsDone}/${req.minClasses} classes (${classesRemaining} needed), ${monthsElapsed}/${req.timeText}`
  };
}

// Belt progression, lowest to highest, used to sort students/register by
// rank rather than alphabetically (which would scatter belts randomly).
const RANK_ORDER = [
  ...Object.keys(GUP_REQUIREMENTS),
  '1st Dan (Black Belt)',
  '2nd Dan (Black Belt)',
  '3rd Dan (Black Belt)'
];

// Builds a "CASE <column> WHEN ... THEN <position> ELSE 0 END" SQL fragment
// (plus its bound args, in the order they appear in that fragment) that
// ranks belts from 1 (lowest, white belt) to N (highest, 3rd Dan). Used with
// ORDER BY ... DESC so the highest rank comes first; any rank string not in
// RANK_ORDER (e.g. old/custom data) gets 0, so it always sorts last.
function rankOrderClause(column) {
  const whens = RANK_ORDER.map(() => 'WHEN ? THEN ?').join(' ');
  const args = [];
  RANK_ORDER.forEach((rank, i) => args.push(rank, i + 1));
  return {
    sql: `CASE ${column} ${whens} ELSE 0 END`,
    args
  };
}

// Turns a plain filesystem path into the "file:" URL form @libsql/client
// expects, using forward slashes so Windows drive-letter paths work too
// (e.g. "C:\foo\karate.db" -> "file:C:/foo/karate.db").
function toFileUrl(filePath) {
  const normalized = filePath.split(path.sep).join('/');
  return `file:${normalized}`;
}

// Resolves the connection target, in priority order:
//   1. an explicit argument (used by seed.js / tests)
//   2. TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) - a hosted Turso database,
//      which keeps data intact regardless of what happens to the app host
//   3. DB_PATH - a local file path (e.g. a Render persistent disk mount)
//   4. a local karate.db file next to this script, for local development
function resolveConnection(pathOrUrl, authToken) {
  let url = pathOrUrl || process.env.TURSO_DATABASE_URL || process.env.DB_PATH || path.join(__dirname, 'karate.db');
  const token = authToken !== undefined ? authToken : process.env.TURSO_AUTH_TOKEN;

  // Anything that isn't already a proper "scheme://" URL, a "file:" URL, or
  // the special ":memory:" (used by tests) is treated as a bare filesystem
  // path and converted.
  if (url !== ':memory:' && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url) && !url.startsWith('file:')) {
    url = toFileUrl(url);
  }

  return { url, token };
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dob TEXT NOT NULL,
    gender TEXT,
    address TEXT NOT NULL,
    tel TEXT NOT NULL,
    association_no TEXT NOT NULL,
    membership_start TEXT NOT NULL,
    membership_end TEXT NOT NULL,
    rank TEXT NOT NULL,
    last_graded TEXT,
    due_testing TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    photo TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_date TEXT NOT NULL,
    class_name TEXT NOT NULL DEFAULT 'Regular Class',
    status TEXT NOT NULL DEFAULT 'present',
    paid INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT,
    amount_paid REAL DEFAULT 0.0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, session_date, class_name)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_time TEXT,
    location TEXT,
    description TEXT,
    reminder_days INTEGER DEFAULT 7,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS event_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'registered',
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, student_id)
  )`,
  `CREATE TABLE IF NOT EXISTS auth_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(session_date)`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date)`
];

async function createDatabase(pathOrUrl, authToken) {
  const { url, token } = resolveConnection(pathOrUrl, authToken);

  // Make sure the target directory exists for local file databases (e.g. a
  // freshly-mounted Render persistent disk) before opening/creating the file.
  // Hosted libsql:// / https:// Turso URLs need no such thing.
  if (url.startsWith('file:')) {
    const filePath = url.slice('file:'.length);
    const dir = path.dirname(filePath);
    if (dir && dir !== '.' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const client = createClient(token ? { url, authToken: token, intMode: 'number' } : { url, intMode: 'number' });

  // --------------------------------------------
  // Small query helpers - the rest of this file works with plain arrays of
  // plain objects, the same shape node:sqlite used to hand back.
  // --------------------------------------------
  function toObject(row, columns) {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  }

  async function all(sql, args = []) {
    const result = await client.execute({ sql, args });
    return result.rows.map(row => toObject(row, result.columns));
  }

  async function get(sql, args = []) {
    const rows = await all(sql, args);
    return rows[0] || null;
  }

  async function run(sql, args = []) {
    const result = await client.execute({ sql, args });
    return {
      lastInsertRowid: result.lastInsertRowid !== undefined && result.lastInsertRowid !== null
        ? Number(result.lastInsertRowid)
        : undefined,
      changes: result.rowsAffected
    };
  }

  await client.execute('PRAGMA foreign_keys = ON;');

  // Schema creation
  for (const statement of SCHEMA_STATEMENTS) {
    await client.execute(statement);
  }

  // Migrations: add columns for databases created before these fields existed
  const studentColumns = await all('PRAGMA table_info(students)');
  if (!studentColumns.some(col => col.name === 'gender')) {
    await client.execute('ALTER TABLE students ADD COLUMN gender TEXT');
  }
  if (!studentColumns.some(col => col.name === 'photo')) {
    await client.execute('ALTER TABLE students ADD COLUMN photo TEXT');
  }

  return {
    rawClient: client,

    // ==========================================
    // STUDENTS
    // ==========================================
    async getStudents({ search = '', rank = '', status = 'active' } = {}) {
      let sql = `
        SELECT s.*,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present') as total_attended,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'absent') as total_missed,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present' AND a.session_date >= COALESCE(s.last_graded, s.membership_start)) as lessons_since_last_graded,
          (SELECT MAX(a.session_date) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present') as last_attended_date
        FROM students s
        WHERE 1=1
      `;
      const params = [];

      if (status && status !== 'all') {
        sql += ' AND s.status = ?';
        params.push(status);
      }
      if (rank && rank !== 'all') {
        sql += ' AND s.rank = ?';
        params.push(rank);
      }
      if (search && search.trim()) {
        sql += ' AND (s.name LIKE ? OR s.association_no LIKE ? OR s.tel LIKE ? OR s.address LIKE ?)';
        const queryTerm = `%${search.trim()}%`;
        params.push(queryTerm, queryTerm, queryTerm, queryTerm);
      }

      const rankOrder = rankOrderClause('s.rank');
      sql += ` ORDER BY ${rankOrder.sql} DESC, s.name ASC`;
      params.push(...rankOrder.args);

      const rows = await all(sql, params);
      return rows.map(r => ({
        ...r,
        eligibility: evaluateEligibility(r)
      }));
    },

    async getStudentById(id) {
      const row = await get(`
        SELECT s.*,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present') as total_attended,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'absent') as total_missed,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present' AND a.session_date >= COALESCE(s.last_graded, s.membership_start)) as lessons_since_last_graded,
          (SELECT MAX(a.session_date) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present') as last_attended_date
        FROM students s
        WHERE s.id = ?
      `, [id]);
      if (!row) return null;
      return {
        ...row,
        eligibility: evaluateEligibility(row)
      };
    },

    async createStudent(data) {
      const result = await run(`
        INSERT INTO students (
          name, dob, gender, address, tel, association_no,
          membership_start, membership_end, rank,
          last_graded, due_testing, notes, status, photo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.name || '',
        data.dob || '',
        data.gender || null,
        data.address || '',
        data.tel || '',
        data.association_no || '',
        data.membership_start || '',
        data.membership_end || '',
        data.rank || '10th (White)',
        data.last_graded || null,
        data.due_testing || null,
        data.notes || '',
        data.status || 'active',
        data.photo || null
      ]);
      return this.getStudentById(result.lastInsertRowid);
    },

    async updateStudent(id, data) {
      await run(`
        UPDATE students SET
          name = ?,
          dob = ?,
          gender = ?,
          address = ?,
          tel = ?,
          association_no = ?,
          membership_start = ?,
          membership_end = ?,
          rank = ?,
          last_graded = ?,
          due_testing = ?,
          notes = ?,
          status = ?,
          photo = ?
        WHERE id = ?
      `, [
        data.name || '',
        data.dob || '',
        data.gender || null,
        data.address || '',
        data.tel || '',
        data.association_no || '',
        data.membership_start || '',
        data.membership_end || '',
        data.rank || '10th (White)',
        data.last_graded || null,
        data.due_testing || null,
        data.notes || '',
        data.status || 'active',
        data.photo || null,
        id
      ]);
      return this.getStudentById(id);
    },

    async deleteStudent(id) {
      const res = await run('DELETE FROM students WHERE id = ?', [id]);
      return res.changes > 0;
    },

    // ==========================================
    // ATTENDANCE & REGISTER
    // ==========================================
    async getRegisterForSession(sessionDate, className = 'Regular Class') {
      const rankOrder = rankOrderClause('s.rank');
      return all(`
        SELECT
          s.id as student_id,
          s.name,
          s.rank,
          s.association_no,
          s.tel,
          s.status as student_status,
          a.id as attendance_id,
          a.session_date,
          a.class_name,
          COALESCE(a.status, 'unrecorded') as attendance_status,
          COALESCE(a.paid, 0) as paid,
          COALESCE(a.payment_method, '') as payment_method,
          COALESCE(a.amount_paid, 0.0) as amount_paid,
          COALESCE(a.notes, '') as attendance_notes,
          (SELECT COUNT(*) FROM attendance att WHERE att.student_id = s.id AND att.status = 'absent') as total_missed,
          (SELECT COUNT(*) FROM attendance att WHERE att.student_id = s.id AND att.status = 'present' AND strftime('%Y-%m', att.session_date) = strftime('%Y-%m', ?)) as current_month_lessons
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.session_date = ? AND a.class_name = ?
        WHERE s.status = 'active'
        ORDER BY ${rankOrder.sql} DESC, s.name ASC
      `, [sessionDate, sessionDate, className, ...rankOrder.args]);
    },

    async saveAttendanceRecord({ student_id, session_date, class_name = 'Regular Class', status = 'present', paid = 0, payment_method = null, amount_paid = 0.0, notes = '' }) {
      await run(`
        INSERT INTO attendance (student_id, session_date, class_name, status, paid, payment_method, amount_paid, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, session_date, class_name) DO UPDATE SET
          status = excluded.status,
          paid = excluded.paid,
          payment_method = excluded.payment_method,
          amount_paid = excluded.amount_paid,
          notes = excluded.notes
      `, [
        student_id,
        session_date,
        class_name,
        status,
        paid ? 1 : 0,
        payment_method,
        Number(amount_paid) || 0.0,
        notes
      ]);
      return this.getAttendanceRecord(student_id, session_date, class_name);
    },

    async getAttendanceRecord(student_id, session_date, class_name = 'Regular Class') {
      return get(`
        SELECT * FROM attendance
        WHERE student_id = ? AND session_date = ? AND class_name = ?
      `, [student_id, session_date, class_name]);
    },

    async saveBulkAttendance(session_date, class_name, records) {
      const results = [];
      for (const rec of records) {
        if (!rec.student_id) continue;
        const res = await this.saveAttendanceRecord({
          student_id: rec.student_id,
          session_date,
          class_name,
          status: rec.status || 'present',
          paid: rec.paid ? 1 : 0,
          payment_method: rec.payment_method || null,
          amount_paid: rec.amount_paid || 0,
          notes: rec.notes || ''
        });
        results.push(res);
      }
      return results;
    },

    async getStudentAttendanceHistory(student_id) {
      return all(`
        SELECT * FROM attendance
        WHERE student_id = ?
        ORDER BY session_date DESC, class_name ASC
      `, [student_id]);
    },

    // ==========================================
    // MONTHLY COUNTS & MISSED LESSONS (>5)
    // ==========================================
    async getMonthlyLessonCounts(yearMonth = null) {
      let sql = `
        SELECT
          s.id as student_id,
          s.name,
          s.rank,
          s.association_no,
          s.tel,
          strftime('%Y-%m', a.session_date) as month,
          COUNT(*) as attended_lessons,
          SUM(CASE WHEN a.paid = 1 THEN a.amount_paid ELSE 0 END) as total_paid,
          SUM(CASE WHEN a.paid = 0 THEN 1 ELSE 0 END) as unpaid_lessons
        FROM students s
        JOIN attendance a ON s.id = a.student_id
        WHERE a.status = 'present'
      `;
      const params = [];
      if (yearMonth) {
        sql += " AND strftime('%Y-%m', a.session_date) = ?";
        params.push(yearMonth);
      }
      sql += `
        GROUP BY s.id, month
        ORDER BY month DESC, attended_lessons DESC, s.name ASC
      `;
      return all(sql, params);
    },

    async getStudentMonthlyBreakdown(student_id) {
      return all(`
        SELECT
          strftime('%Y-%m', session_date) as month,
          COUNT(*) as attended_lessons,
          SUM(CASE WHEN paid = 1 THEN 1 ELSE 0 END) as paid_lessons,
          SUM(CASE WHEN paid = 0 THEN 1 ELSE 0 END) as unpaid_lessons,
          SUM(amount_paid) as total_amount_paid
        FROM attendance
        WHERE student_id = ? AND status = 'present'
        GROUP BY month
        ORDER BY month DESC
      `, [student_id]);
    },

    async getMissedLessonsReport() {
      // Highlights students who have missed >5 lessons
      // Checks:
      // 1. Total missed lessons in database >= 5
      // 2. Consecutive recent missed lessons
      const activeStudents = await all(`
        SELECT s.*,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present') as total_attended,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'absent') as total_missed,
          (SELECT MAX(a.session_date) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present') as last_attended_date
        FROM students s
        WHERE s.status = 'active'
        ORDER BY total_missed DESC, s.name ASC
      `);

      return Promise.all(activeStudents.map(async student => {
        // Calculate recent streak of missed classes
        const recentRecords = await all(`
          SELECT status, session_date
          FROM attendance
          WHERE student_id = ?
          ORDER BY session_date DESC
          LIMIT 10
        `, [student.id]);

        let consecutiveMissed = 0;
        for (const r of recentRecords) {
          if (r.status === 'absent') {
            consecutiveMissed++;
          } else if (r.status === 'present') {
            break;
          }
        }

        const isAlert = student.total_missed >= 5 || consecutiveMissed >= 5;

        return {
          ...student,
          consecutive_missed: consecutiveMissed,
          is_missed_alert: isAlert, // Highlight if missed > 5 lessons
          recent_records: recentRecords
        };
      }));
    },

    async getUnpaidTrainedSessions() {
      return all(`
        SELECT
          a.id as attendance_id,
          a.session_date,
          a.class_name,
          a.paid,
          a.amount_paid,
          a.payment_method,
          s.id as student_id,
          s.name as student_name,
          s.rank,
          s.tel
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE a.status = 'present' AND a.paid = 0
        ORDER BY a.session_date DESC, s.name ASC
      `);
    },

    // ==========================================
    // STUDENT SELF-SERVICE PORTAL
    // ==========================================
    // Students log in with first name + association number (no password).
    // Only ever returns/looks up their OWN record - never a list of others.
    async findStudentForLogin(firstName, associationNo) {
      const assoc = (associationNo || '').trim();
      const target = (firstName || '').trim().toLowerCase();
      if (!assoc || !target) return null;
      const rows = await all(`
        SELECT id, name FROM students
        WHERE status = 'active' AND LOWER(TRIM(association_no)) = LOWER(?)
      `, [assoc]);
      const match = rows.find(r => (r.name || '').trim().split(/\s+/)[0].toLowerCase() === target);
      return match ? this.getStudentById(match.id) : null;
    },

    async getStudentPortalSummary(studentId) {
      const student = await this.getStudentById(studentId);
      if (!student) return null;
      const monthly = await this.getStudentMonthlyBreakdown(studentId);
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);
      const currentYear = now.toISOString().slice(0, 4);
      const thisMonth = monthly.find(m => m.month === currentMonth);
      const lessonsThisMonth = thisMonth ? thisMonth.attended_lessons : 0;
      const lessonsThisYear = monthly
        .filter(m => m.month && m.month.startsWith(currentYear))
        .reduce((sum, m) => sum + (m.attended_lessons || 0), 0);

      return {
        id: student.id,
        name: student.name,
        photo: student.photo,
        rank: student.rank,
        association_no: student.association_no,
        membership_start: student.membership_start,
        membership_end: student.membership_end,
        last_graded: student.last_graded,
        due_testing: student.due_testing,
        last_attended_date: student.last_attended_date,
        total_attended: student.total_attended,
        total_missed: student.total_missed,
        eligibility: student.eligibility,
        lessons_this_month: lessonsThisMonth,
        lessons_this_year: lessonsThisYear,
        current_month: currentMonth,
        current_year: currentYear,
        monthly_breakdown: monthly
      };
    },

    async getUpcomingEventsForStudent(studentId) {
      const events = await this.getEvents({ upcomingOnly: true });
      const participantRows = await all(`
        SELECT event_id FROM event_participants WHERE student_id = ?
      `, [studentId]);
      const registeredEventIds = new Set(participantRows.map(r => r.event_id));
      return events.map(e => ({
        ...e,
        is_registered: registeredEventIds.has(e.id)
      }));
    },

    // ==========================================
    // EVENTS & REMINDERS
    // ==========================================
    async getEvents({ type = '', upcomingOnly = false } = {}) {
      let sql = `
        SELECT e.*,
          (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count
        FROM events e
        WHERE 1=1
      `;
      const params = [];
      if (type) {
        sql += ' AND e.event_type = ?';
        params.push(type);
      }
      if (upcomingOnly) {
        sql += " AND e.event_date >= date('now', 'localtime')";
      }
      sql += ' ORDER BY e.event_date ASC';
      return all(sql, params);
    },

    async getEventById(id) {
      return get(`
        SELECT e.*,
          (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count
        FROM events e
        WHERE e.id = ?
      `, [id]);
    },

    async createEvent(data) {
      const res = await run(`
        INSERT INTO events (title, event_type, event_date, event_time, location, description, reminder_days)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        data.title,
        data.event_type || 'grading',
        data.event_date,
        data.event_time || '',
        data.location || '',
        data.description || '',
        Number(data.reminder_days) || 7
      ]);
      return this.getEventById(res.lastInsertRowid);
    },

    async updateEvent(id, data) {
      await run(`
        UPDATE events SET
          title = ?,
          event_type = ?,
          event_date = ?,
          event_time = ?,
          location = ?,
          description = ?,
          reminder_days = ?
        WHERE id = ?
      `, [
        data.title,
        data.event_type || 'grading',
        data.event_date,
        data.event_time || '',
        data.location || '',
        data.description || '',
        Number(data.reminder_days) || 7,
        id
      ]);
      return this.getEventById(id);
    },

    async deleteEvent(id) {
      const res = await run('DELETE FROM events WHERE id = ?', [id]);
      return res.changes > 0;
    },

    async getEventParticipants(eventId) {
      return all(`
        SELECT
          ep.id as participant_id,
          ep.status as participant_status,
          ep.notes as participant_notes,
          s.id as student_id,
          s.name,
          s.rank,
          s.last_graded,
          s.due_testing,
          s.tel
        FROM event_participants ep
        JOIN students s ON ep.student_id = s.id
        WHERE ep.event_id = ?
        ORDER BY s.name ASC
      `, [eventId]);
    },

    async addEventParticipant(eventId, studentId, status = 'registered', notes = '') {
      await run(`
        INSERT INTO event_participants (event_id, student_id, status, notes)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(event_id, student_id) DO UPDATE SET
          status = excluded.status,
          notes = excluded.notes
      `, [eventId, studentId, status, notes]);
      return true;
    },

    async removeEventParticipant(eventId, studentId) {
      const res = await run('DELETE FROM event_participants WHERE event_id = ? AND student_id = ?', [eventId, studentId]);
      return res.changes > 0;
    },

    async getGradingCandidates(targetDate = null) {
      // Find students whose due_testing is around the targetDate or within 45 days
      let sql = `
        SELECT s.*,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present') as total_attended,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present' AND a.session_date >= COALESCE(s.last_graded, s.membership_start)) as lessons_since_last_graded
        FROM students s
        WHERE s.status = 'active'
      `;
      const params = [];
      if (targetDate) {
        sql += " AND (s.due_testing <= ? OR s.due_testing IS NULL OR s.due_testing <= date(?, '+30 days'))";
        params.push(targetDate, targetDate);
      } else {
        sql += " AND s.due_testing IS NOT NULL AND s.due_testing <= date('now', '+30 days')";
      }
      sql += ' ORDER BY s.due_testing ASC, s.rank ASC';
      const rows = await all(sql, params);
      return rows.map(r => ({
        ...r,
        eligibility: evaluateEligibility(r)
      }));
    },

    // ==========================================
    // STATS & DASHBOARD OVERVIEW
    // ==========================================
    async getDashboardStats() {
      const totalStudentsRow = await get("SELECT COUNT(*) as count FROM students WHERE status = 'active'");
      const missedAlertsCount = (await this.getMissedLessonsReport()).filter(s => s.is_missed_alert).length;

      const unpaidSessions = await get(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total_amount
        FROM attendance
        WHERE status = 'present' AND paid = 0
      `);

      const upcomingEventsRow = await get(`
        SELECT COUNT(*) as count
        FROM events
        WHERE event_date >= date('now', 'localtime')
      `);

      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyLessonsRow = await get(`
        SELECT COUNT(*) as count
        FROM attendance
        WHERE status = 'present' AND strftime('%Y-%m', session_date) = ?
      `, [currentMonth]);

      return {
        total_students: totalStudentsRow.count,
        missed_alerts_count: missedAlertsCount,
        unpaid_count: unpaidSessions.count,
        upcoming_events_count: upcomingEventsRow.count,
        current_month: currentMonth,
        monthly_lessons_attended: monthlyLessonsRow.count
      };
    },

    // ==========================================
    // LOGIN / AUTH
    // ==========================================
    async getAuthConfig() {
      return get('SELECT username, password_hash, password_salt FROM auth_config WHERE id = 1');
    },

    async isAuthConfigured() {
      return !!(await this.getAuthConfig());
    },

    async setupAuth(username, password) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);
      await run(`
        INSERT INTO auth_config (id, username, password_hash, password_salt)
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          password_hash = excluded.password_hash,
          password_salt = excluded.password_salt,
          updated_at = CURRENT_TIMESTAMP
      `, [username, hash, salt]);
      return true;
    },

    async verifyCredentials(username, password) {
      const cfg = await this.getAuthConfig();
      if (!cfg || !username || !password) return false;
      if (cfg.username !== username) return false;
      const candidateHash = Buffer.from(hashPassword(password, cfg.password_salt), 'hex');
      const storedHash = Buffer.from(cfg.password_hash, 'hex');
      if (candidateHash.length !== storedHash.length) return false;
      return crypto.timingSafeEqual(candidateHash, storedHash);
    },

    async changePassword(currentPassword, newPassword) {
      const cfg = await this.getAuthConfig();
      if (!cfg) return { success: false, message: 'Login has not been set up yet' };
      if (!(await this.verifyCredentials(cfg.username, currentPassword))) {
        return { success: false, message: 'Current password is incorrect' };
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(newPassword, salt);
      await run(`
        UPDATE auth_config SET password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
      `, [hash, salt]);
      return { success: true };
    }
  };
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

module.exports = { createDatabase, GUP_REQUIREMENTS, getRankRequirements, evaluateEligibility };

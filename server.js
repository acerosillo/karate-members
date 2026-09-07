const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const crypto = require('node:crypto');
const { createDatabase } = require('./db.js');

const PORT = process.env.PORT || 3000;
// createDatabase() is async (it talks to a real DB connection - either a
// local file or a hosted Turso database), so kick it off once here and let
// each request await the same promise before touching `db`.
const dbPromise = createDatabase();
dbPromise.catch(err => {
  console.error('❌ Failed to initialize the database:', err.message);
});
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, message = 'Internal Server Error', statusCode = 500) {
  sendJSON(res, { error: message }, statusCode);
}

// ==========================================
// LOGIN SESSIONS (in-memory, cookie-based)
// ==========================================
const SESSION_COOKIE_NAME = 'dojo_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h server-side safety-net expiry
const sessions = new Map(); // token -> { createdAt }

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { createdAt: Date.now() });
  return token;
}

function isValidSession(token) {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_MAX_AGE_MS) {
    sessions.delete(token);
    return false;
  }
  return true;
}

// ==========================================
// STUDENT PORTAL SESSIONS (separate, self-service, no password)
// ==========================================
const STUDENT_SESSION_COOKIE_NAME = 'dojo_student_session';
const studentSessions = new Map(); // token -> { studentId, createdAt }

function createStudentSession(studentId) {
  const token = crypto.randomBytes(32).toString('hex');
  studentSessions.set(token, { studentId, createdAt: Date.now() });
  return token;
}

function getValidStudentSession(token) {
  if (!token) return null;
  const session = studentSessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_MAX_AGE_MS) {
    studentSessions.delete(token);
    return null;
  }
  return session;
}

function setStudentSessionCookie(req, res, token) {
  const secureFlag = isHttpsRequest(req) ? ' Secure;' : '';
  res.setHeader('Set-Cookie', `${STUDENT_SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/;${secureFlag}`);
}

function clearStudentSessionCookie(req, res) {
  const secureFlag = isHttpsRequest(req) ? ' Secure;' : '';
  res.setHeader('Set-Cookie', `${STUDENT_SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0;${secureFlag}`);
}

// Basic brute-force throttle: first name + association number is much lower
// entropy than a real password, so cap attempts per IP within a time window.
const STUDENT_LOGIN_MAX_ATTEMPTS = 8;
const STUDENT_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const studentLoginAttempts = new Map(); // ip -> { count, firstAttempt }

function checkStudentLoginRateLimit(ip) {
  const now = Date.now();
  const entry = studentLoginAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > STUDENT_LOGIN_WINDOW_MS) {
    studentLoginAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= STUDENT_LOGIN_MAX_ATTEMPTS;
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

function isHttpsRequest(req) {
  return Boolean(req.socket && req.socket.encrypted) || req.headers['x-forwarded-proto'] === 'https';
}

// Session cookie only (no Max-Age/Expires) so it clears when the browser closes.
function setSessionCookie(req, res, token) {
  const secureFlag = isHttpsRequest(req) ? ' Secure;' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/;${secureFlag}`);
}

function clearSessionCookie(req, res) {
  const secureFlag = isHttpsRequest(req) ? ' Secure;' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0;${secureFlag}`);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// Student photos are stored as data: URLs directly in the database (Turso),
// same as everything else - keeping them out of the app host's disk is the
// whole point after the persistence issues we've already been through.
// The client compresses to a ~60KB thumbnail before upload; this cap is a
// generous safety ceiling (not the target) in case that's ever bypassed.
const MAX_PHOTO_DATA_URL_LENGTH = 150 * 1024; // ~150KB of base64 text

function validatePhoto(photo) {
  if (photo === undefined || photo === null || photo === '') return null;
  if (typeof photo !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/.test(photo)) {
    return 'Photo must be a PNG, JPEG, or WebP image';
  }
  if (photo.length > MAX_PHOTO_DATA_URL_LENGTH) {
    return 'Photo is too large - please use a smaller image';
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  try {
    const db = await dbPromise;

    // ==========================================
    // API ROUTES
    // ==========================================
    if (pathname.startsWith('/api/')) {

      // ------------------------------------------
      // AUTH ROUTES (not gated by the login check below)
      // ------------------------------------------

      // GET /api/auth/status
      if (pathname === '/api/auth/status' && method === 'GET') {
        const cookies = parseCookies(req);
        return sendJSON(res, {
          configured: await db.isAuthConfigured(),
          authenticated: isValidSession(cookies[SESSION_COOKIE_NAME])
        });
      }

      // POST /api/auth/setup (first-run only — creates the single dojo login)
      if (pathname === '/api/auth/setup' && method === 'POST') {
        if (await db.isAuthConfigured()) {
          return sendError(res, 'Login has already been set up', 400);
        }
        const body = await parseBody(req);
        const username = (body.username || '').trim();
        if (!username || !body.password || body.password.length < 6) {
          return sendError(res, 'Username and a password of at least 6 characters are required', 400);
        }
        await db.setupAuth(username, body.password);
        const token = createSession();
        setSessionCookie(req, res, token);
        return sendJSON(res, { success: true });
      }

      // POST /api/auth/login
      if (pathname === '/api/auth/login' && method === 'POST') {
        if (!(await db.isAuthConfigured())) {
          return sendError(res, 'Login has not been set up yet', 400);
        }
        const body = await parseBody(req);
        const username = (body.username || '').trim();
        if (!(await db.verifyCredentials(username, body.password || ''))) {
          return sendError(res, 'Invalid username or password', 401);
        }
        const token = createSession();
        setSessionCookie(req, res, token);
        return sendJSON(res, { success: true });
      }

      // POST /api/auth/logout
      if (pathname === '/api/auth/logout' && method === 'POST') {
        const cookies = parseCookies(req);
        if (cookies[SESSION_COOKIE_NAME]) sessions.delete(cookies[SESSION_COOKIE_NAME]);
        clearSessionCookie(req, res);
        return sendJSON(res, { success: true });
      }

      // POST /api/auth/change-password
      if (pathname === '/api/auth/change-password' && method === 'POST') {
        const cookies = parseCookies(req);
        if (!isValidSession(cookies[SESSION_COOKIE_NAME])) {
          return sendError(res, 'Unauthorized', 401);
        }
        const body = await parseBody(req);
        if (!body.currentPassword || !body.newPassword || body.newPassword.length < 6) {
          return sendError(res, 'Current password and a new password (min 6 characters) are required', 400);
        }
        const result = await db.changePassword(body.currentPassword, body.newPassword);
        if (!result.success) return sendError(res, result.message, 400);
        return sendJSON(res, { success: true });
      }

      // ------------------------------------------
      // STUDENT PORTAL ROUTES (self-service, gated by their own session below —
      // not gated by, and never granted, the admin session)
      // ------------------------------------------

      // GET /api/student-auth/status
      if (pathname === '/api/student-auth/status' && method === 'GET') {
        const cookies = parseCookies(req);
        const session = getValidStudentSession(cookies[STUDENT_SESSION_COOKIE_NAME]);
        return sendJSON(res, { authenticated: !!session });
      }

      // POST /api/student-auth/login  { firstName, associationNo }
      if (pathname === '/api/student-auth/login' && method === 'POST') {
        const ip = req.socket.remoteAddress || 'unknown';
        if (!checkStudentLoginRateLimit(ip)) {
          return sendError(res, 'Too many login attempts. Please try again in 15 minutes.', 429);
        }
        const body = await parseBody(req);
        const firstName = (body.firstName || '').trim();
        const associationNo = (body.associationNo || '').trim();
        if (!firstName || !associationNo) {
          return sendError(res, 'First name and association number are required', 400);
        }
        const student = await db.findStudentForLogin(firstName, associationNo);
        if (!student) {
          return sendError(res, 'No matching student found. Check your first name and association number.', 401);
        }
        const token = createStudentSession(student.id);
        setStudentSessionCookie(req, res, token);
        return sendJSON(res, { success: true, name: student.name });
      }

      // POST /api/student-auth/logout
      if (pathname === '/api/student-auth/logout' && method === 'POST') {
        const cookies = parseCookies(req);
        if (cookies[STUDENT_SESSION_COOKIE_NAME]) studentSessions.delete(cookies[STUDENT_SESSION_COOKIE_NAME]);
        clearStudentSessionCookie(req, res);
        return sendJSON(res, { success: true });
      }

      // GET /api/student/me — a logged-in student's own progress, nothing else
      if (pathname === '/api/student/me' && method === 'GET') {
        const cookies = parseCookies(req);
        const session = getValidStudentSession(cookies[STUDENT_SESSION_COOKIE_NAME]);
        if (!session) return sendError(res, 'Unauthorized — please log in', 401);
        const summary = await db.getStudentPortalSummary(session.studentId);
        if (!summary) return sendError(res, 'Student record not found', 404);
        return sendJSON(res, summary);
      }

      // GET /api/student/events — upcoming gradings/competitions/seminars,
      // flagged with whether this student is registered for each
      if (pathname === '/api/student/events' && method === 'GET') {
        const cookies = parseCookies(req);
        const session = getValidStudentSession(cookies[STUDENT_SESSION_COOKIE_NAME]);
        if (!session) return sendError(res, 'Unauthorized — please log in', 401);
        const events = await db.getUpcomingEventsForStudent(session.studentId);
        return sendJSON(res, events);
      }

      // ------------------------------------------
      // LOGIN GATE — every other /api/* route requires a valid admin session
      // ------------------------------------------
      if (!pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/student-auth/') && !pathname.startsWith('/api/student/')) {
        const cookies = parseCookies(req);
        if (!isValidSession(cookies[SESSION_COOKIE_NAME])) {
          return sendError(res, 'Unauthorized — please log in', 401);
        }
      }

      // GET /api/stats
      if (pathname === '/api/stats' && method === 'GET') {
        const stats = await db.getDashboardStats();
        return sendJSON(res, stats);
      }

      // GET /api/students
      if (pathname === '/api/students' && method === 'GET') {
        const { search, rank, status } = parsedUrl.query;
        const students = await db.getStudents({ search, rank, status });
        return sendJSON(res, students);
      }

      // POST /api/students
      if (pathname === '/api/students' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || !body.dob || !body.tel) {
          return sendError(res, 'Name, Date of Birth, and Telephone are required.', 400);
        }
        const photoError = validatePhoto(body.photo);
        if (photoError) return sendError(res, photoError, 400);
        const created = await db.createStudent(body);
        return sendJSON(res, created, 201);
      }

      // Single student routes: /api/students/:id
      const studentMatch = pathname.match(/^\/api\/students\/(\d+)$/);
      if (studentMatch) {
        const studentId = parseInt(studentMatch[1], 10);

        if (method === 'GET') {
          const student = await db.getStudentById(studentId);
          if (!student) return sendError(res, 'Student not found', 404);
          const history = await db.getStudentAttendanceHistory(studentId);
          const monthly = await db.getStudentMonthlyBreakdown(studentId);
          return sendJSON(res, { ...student, attendance_history: history, monthly_breakdown: monthly });
        }

        if (method === 'PUT') {
          const body = await parseBody(req);
          const photoError = validatePhoto(body.photo);
          if (photoError) return sendError(res, photoError, 400);
          const updated = await db.updateStudent(studentId, body);
          return sendJSON(res, updated);
        }

        if (method === 'DELETE') {
          const { permanent } = parsedUrl.query;
          if (permanent === 'true') {
            const ok = await db.deleteStudent(studentId);
            return sendJSON(res, { success: ok, message: 'Student permanently deleted' });
          } else {
            // Soft delete/archive
            const existing = await db.getStudentById(studentId);
            const updated = await db.updateStudent(studentId, {
              ...existing,
              status: 'archived'
            });
            return sendJSON(res, { success: true, student: updated, message: 'Student archived' });
          }
        }
      }

      // GET /api/register
      if (pathname === '/api/register' && method === 'GET') {
        const date = parsedUrl.query.date || new Date().toISOString().slice(0, 10);
        const className = parsedUrl.query.class_name || 'Tuesday Class (7:00 PM - 8:00 PM)';
        const register = await db.getRegisterForSession(date, className);
        return sendJSON(res, {
          session_date: date,
          class_name: className,
          students: register
        });
      }

      // POST /api/register (single)
      if (pathname === '/api/register' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.student_id || !body.session_date) {
          return sendError(res, 'Student ID and session date are required', 400);
        }
        const saved = await db.saveAttendanceRecord(body);
        return sendJSON(res, saved);
      }

      // POST /api/register/bulk
      if (pathname === '/api/register/bulk' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.session_date || !Array.isArray(body.records)) {
          return sendError(res, 'session_date and records array are required', 400);
        }
        const saved = await db.saveBulkAttendance(body.session_date, body.class_name || 'Tuesday Class (7:00 PM - 8:00 PM)', body.records);
        return sendJSON(res, { count: saved.length, records: saved });
      }

      // GET /api/monthly
      if (pathname === '/api/monthly' && method === 'GET') {
        const month = parsedUrl.query.month || null;
        const counts = await db.getMonthlyLessonCounts(month);
        return sendJSON(res, counts);
      }

      // GET /api/missed-alerts
      if (pathname === '/api/missed-alerts' && method === 'GET') {
        const report = await db.getMissedLessonsReport();
        const alertsOnly = report.filter(s => s.is_missed_alert);
        return sendJSON(res, {
          total_alerts: alertsOnly.length,
          alerts: alertsOnly,
          all_students: report
        });
      }

      // GET /api/unpaid
      if (pathname === '/api/unpaid' && method === 'GET') {
        const unpaid = await db.getUnpaidTrainedSessions();
        return sendJSON(res, unpaid);
      }

      // GET /api/events
      if (pathname === '/api/events' && method === 'GET') {
        const { type, upcomingOnly } = parsedUrl.query;
        const events = await db.getEvents({
          type,
          upcomingOnly: upcomingOnly === 'true'
        });
        return sendJSON(res, events);
      }

      // POST /api/events
      if (pathname === '/api/events' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.title || !body.event_date) {
          return sendError(res, 'Title and event date are required', 400);
        }
        const created = await db.createEvent(body);
        return sendJSON(res, created, 201);
      }

      // Event by ID: /api/events/:id
      const eventMatch = pathname.match(/^\/api\/events\/(\d+)$/);
      if (eventMatch) {
        const eventId = parseInt(eventMatch[1], 10);
        if (method === 'GET') {
          const event = await db.getEventById(eventId);
          if (!event) return sendError(res, 'Event not found', 404);
          const participants = await db.getEventParticipants(eventId);
          return sendJSON(res, { ...event, participants });
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const updated = await db.updateEvent(eventId, body);
          return sendJSON(res, updated);
        }
        if (method === 'DELETE') {
          const ok = await db.deleteEvent(eventId);
          return sendJSON(res, { success: ok });
        }
      }

      // Event participants: /api/events/:id/participants
      const partMatch = pathname.match(/^\/api\/events\/(\d+)\/participants$/);
      if (partMatch) {
        const eventId = parseInt(partMatch[1], 10);
        if (method === 'GET') {
          const participants = await db.getEventParticipants(eventId);
          return sendJSON(res, participants);
        }
        if (method === 'POST') {
          const body = await parseBody(req);
          if (!body.student_id) return sendError(res, 'Student ID required', 400);
          await db.addEventParticipant(eventId, body.student_id, body.status || 'registered', body.notes || '');
          const participants = await db.getEventParticipants(eventId);
          return sendJSON(res, participants);
        }
      }

      const removePartMatch = pathname.match(/^\/api\/events\/(\d+)\/participants\/(\d+)$/);
      if (removePartMatch && method === 'DELETE') {
        const eventId = parseInt(removePartMatch[1], 10);
        const studentId = parseInt(removePartMatch[2], 10);
        const ok = await db.removeEventParticipant(eventId, studentId);
        return sendJSON(res, { success: ok });
      }

      // GET /api/candidates
      if (pathname === '/api/candidates' && method === 'GET') {
        const targetDate = parsedUrl.query.date || null;
        const candidates = await db.getGradingCandidates(targetDate);
        return sendJSON(res, candidates);
      }

      // GET /api/export/csv
      if (pathname === '/api/export/csv' && method === 'GET') {
        const type = parsedUrl.query.type || 'students';
        let filename = `karate_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
        let csvContent = '';

        if (type === 'students') {
          const students = await db.getStudents({ status: 'all' });
          csvContent = [
            ['ID', 'Name', 'DOB', 'Gender', 'Tel', 'Address', 'Association Number', 'Rank', 'Membership Start', 'Membership End', 'Last Graded', 'Due Testing', 'Status', 'Total Attended', 'Total Missed'].map(escapeCSV).join(','),
            ...students.map(s => [
              s.id, s.name, s.dob, s.gender || '', s.tel, s.address, s.association_no, s.rank, s.membership_start, s.membership_end, s.last_graded || '', s.due_testing || '', s.status, s.total_attended, s.total_missed
            ].map(escapeCSV).join(','))
          ].join('\r\n');
        } else if (type === 'monthly') {
          const counts = await db.getMonthlyLessonCounts();
          csvContent = [
            ['Student ID', 'Student Name', 'Rank', 'Association No', 'Tel', 'Month', 'Attended Lessons', 'Total Paid (£)', 'Unpaid Lessons'].map(escapeCSV).join(','),
            ...counts.map(c => [
              c.student_id, c.name, c.rank, c.association_no, c.tel, c.month, c.attended_lessons, c.total_paid, c.unpaid_lessons
            ].map(escapeCSV).join(','))
          ].join('\r\n');
        } else if (type === 'missed') {
          const missed = await db.getMissedLessonsReport();
          csvContent = [
            ['Student ID', 'Student Name', 'Rank', 'Tel', 'Total Missed Lessons', 'Consecutive Missed', 'Alert Flagged (>5)', 'Last Attended Date'].map(escapeCSV).join(','),
            ...missed.map(m => [
              m.id, m.name, m.rank, m.tel, m.total_missed, m.consecutive_missed, m.is_missed_alert ? 'YES (>5 Missed)' : 'No', m.last_attended_date || 'Never'
            ].map(escapeCSV).join(','))
          ].join('\r\n');
        }

        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        });
        return res.end(csvContent);
      }

      // Unknown API route
      return sendError(res, 'API endpoint not found', 404);
    }

    // ==========================================
    // STATIC ASSETS
    // ==========================================
    let reqPath = pathname === '/' ? '/index.html' : pathname;
    let safePath = path.normalize(path.join(PUBLIC_DIR, reqPath));

    if (!safePath.startsWith(PUBLIC_DIR)) {
      return sendError(res, 'Forbidden', 403);
    }

    fs.stat(safePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Try fallback to index.html for SPA if not an asset
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return fs.createReadStream(indexPath).pipe(res);
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('File Not Found');
      }

      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(safePath).pipe(res);
    });

  } catch (err) {
    console.error('Server error:', err);
    sendError(res, err.message, 500);
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🥋 Karate Members Web App running at http://localhost:${PORT}`);
  });
}

module.exports = { server, dbPromise };

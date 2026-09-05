const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { createDatabase } = require('./db.js');

const PORT = process.env.PORT || 3000;
const db = createDatabase();
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
    // ==========================================
    // API ROUTES
    // ==========================================
    if (pathname.startsWith('/api/')) {

      // GET /api/stats
      if (pathname === '/api/stats' && method === 'GET') {
        const stats = db.getDashboardStats();
        return sendJSON(res, stats);
      }

      // GET /api/students
      if (pathname === '/api/students' && method === 'GET') {
        const { search, rank, status } = parsedUrl.query;
        const students = db.getStudents({ search, rank, status });
        return sendJSON(res, students);
      }

      // POST /api/students
      if (pathname === '/api/students' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || !body.dob || !body.tel) {
          return sendError(res, 'Name, Date of Birth, and Telephone are required.', 400);
        }
        const created = db.createStudent(body);
        return sendJSON(res, created, 201);
      }

      // Single student routes: /api/students/:id
      const studentMatch = pathname.match(/^\/api\/students\/(\d+)$/);
      if (studentMatch) {
        const studentId = parseInt(studentMatch[1], 10);

        if (method === 'GET') {
          const student = db.getStudentById(studentId);
          if (!student) return sendError(res, 'Student not found', 404);
          const history = db.getStudentAttendanceHistory(studentId);
          const monthly = db.getStudentMonthlyBreakdown(studentId);
          return sendJSON(res, { ...student, attendance_history: history, monthly_breakdown: monthly });
        }

        if (method === 'PUT') {
          const body = await parseBody(req);
          const updated = db.updateStudent(studentId, body);
          return sendJSON(res, updated);
        }

        if (method === 'DELETE') {
          const { permanent } = parsedUrl.query;
          if (permanent === 'true') {
            const ok = db.deleteStudent(studentId);
            return sendJSON(res, { success: ok, message: 'Student permanently deleted' });
          } else {
            // Soft delete/archive
            const updated = db.updateStudent(studentId, {
              ...db.getStudentById(studentId),
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
        const register = db.getRegisterForSession(date, className);
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
        const saved = db.saveAttendanceRecord(body);
        return sendJSON(res, saved);
      }

      // POST /api/register/bulk
      if (pathname === '/api/register/bulk' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.session_date || !Array.isArray(body.records)) {
          return sendError(res, 'session_date and records array are required', 400);
        }
        const saved = db.saveBulkAttendance(body.session_date, body.class_name || 'Tuesday Class (7:00 PM - 8:00 PM)', body.records);
        return sendJSON(res, { count: saved.length, records: saved });
      }

      // GET /api/monthly
      if (pathname === '/api/monthly' && method === 'GET') {
        const month = parsedUrl.query.month || null;
        const counts = db.getMonthlyLessonCounts(month);
        return sendJSON(res, counts);
      }

      // GET /api/missed-alerts
      if (pathname === '/api/missed-alerts' && method === 'GET') {
        const report = db.getMissedLessonsReport();
        const alertsOnly = report.filter(s => s.is_missed_alert);
        return sendJSON(res, {
          total_alerts: alertsOnly.length,
          alerts: alertsOnly,
          all_students: report
        });
      }

      // GET /api/unpaid
      if (pathname === '/api/unpaid' && method === 'GET') {
        const unpaid = db.getUnpaidTrainedSessions();
        return sendJSON(res, unpaid);
      }

      // GET /api/events
      if (pathname === '/api/events' && method === 'GET') {
        const { type, upcomingOnly } = parsedUrl.query;
        const events = db.getEvents({
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
        const created = db.createEvent(body);
        return sendJSON(res, created, 201);
      }

      // Event by ID: /api/events/:id
      const eventMatch = pathname.match(/^\/api\/events\/(\d+)$/);
      if (eventMatch) {
        const eventId = parseInt(eventMatch[1], 10);
        if (method === 'GET') {
          const event = db.getEventById(eventId);
          if (!event) return sendError(res, 'Event not found', 404);
          const participants = db.getEventParticipants(eventId);
          return sendJSON(res, { ...event, participants });
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const updated = db.updateEvent(eventId, body);
          return sendJSON(res, updated);
        }
        if (method === 'DELETE') {
          const ok = db.deleteEvent(eventId);
          return sendJSON(res, { success: ok });
        }
      }

      // Event participants: /api/events/:id/participants
      const partMatch = pathname.match(/^\/api\/events\/(\d+)\/participants$/);
      if (partMatch) {
        const eventId = parseInt(partMatch[1], 10);
        if (method === 'GET') {
          const participants = db.getEventParticipants(eventId);
          return sendJSON(res, participants);
        }
        if (method === 'POST') {
          const body = await parseBody(req);
          if (!body.student_id) return sendError(res, 'Student ID required', 400);
          db.addEventParticipant(eventId, body.student_id, body.status || 'registered', body.notes || '');
          const participants = db.getEventParticipants(eventId);
          return sendJSON(res, participants);
        }
      }

      const removePartMatch = pathname.match(/^\/api\/events\/(\d+)\/participants\/(\d+)$/);
      if (removePartMatch && method === 'DELETE') {
        const eventId = parseInt(removePartMatch[1], 10);
        const studentId = parseInt(removePartMatch[2], 10);
        const ok = db.removeEventParticipant(eventId, studentId);
        return sendJSON(res, { success: ok });
      }

      // GET /api/candidates
      if (pathname === '/api/candidates' && method === 'GET') {
        const targetDate = parsedUrl.query.date || null;
        const candidates = db.getGradingCandidates(targetDate);
        return sendJSON(res, candidates);
      }

      // GET /api/export/csv
      if (pathname === '/api/export/csv' && method === 'GET') {
        const type = parsedUrl.query.type || 'students';
        let filename = `karate_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
        let csvContent = '';

        if (type === 'students') {
          const students = db.getStudents({ status: 'all' });
          csvContent = [
            ['ID', 'Name', 'DOB', 'Tel', 'Address', 'Association Number', 'Rank', 'Membership Start', 'Membership End', 'Last Graded', 'Due Testing', 'Status', 'Total Attended', 'Total Missed'].map(escapeCSV).join(','),
            ...students.map(s => [
              s.id, s.name, s.dob, s.tel, s.address, s.association_no, s.rank, s.membership_start, s.membership_end, s.last_graded || '', s.due_testing || '', s.status, s.total_attended, s.total_missed
            ].map(escapeCSV).join(','))
          ].join('\r\n');
        } else if (type === 'monthly') {
          const counts = db.getMonthlyLessonCounts();
          csvContent = [
            ['Student ID', 'Student Name', 'Rank', 'Association No', 'Tel', 'Month', 'Attended Lessons', 'Total Paid (£)', 'Unpaid Lessons'].map(escapeCSV).join(','),
            ...counts.map(c => [
              c.student_id, c.name, c.rank, c.association_no, c.tel, c.month, c.attended_lessons, c.total_paid, c.unpaid_lessons
            ].map(escapeCSV).join(','))
          ].join('\r\n');
        } else if (type === 'missed') {
          const missed = db.getMissedLessonsReport();
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

module.exports = { server, db };

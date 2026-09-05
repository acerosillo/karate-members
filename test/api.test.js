const test = require('node:test');
const assert = require('node:assert');
const { Readable, Writable } = require('node:stream');
const { server } = require('../server.js');

function mockRequest(method, urlPath, body = null) {
  return new Promise((resolve) => {
    const req = new Readable({
      read() {
        if (body) {
          this.push(typeof body === 'string' ? body : JSON.stringify(body));
        }
        this.push(null);
      }
    });
    req.method = method;
    req.url = urlPath;
    req.headers = { host: 'localhost' };

    let resBody = '';
    const headers = {};
    let statusCode = 200;

    const res = new Writable({
      write(chunk, enc, cb) {
        resBody += chunk.toString();
        cb();
      }
    });
    res.writeHead = (code, hdrs) => {
      statusCode = code;
      if (hdrs) Object.assign(headers, hdrs);
    };
    res.setHeader = (k, v) => { headers[k] = v; };
    res.on('finish', () => {
      resolve({ statusCode, headers, body: resBody });
    });

    server.emit('request', req, res);
  });
}

test('API: GET / serves index.html', async () => {
  const res = await mockRequest('GET', '/');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.includes('KENSEIKAN KARATE CLUB'));
  assert.ok(res.headers['Content-Type'].includes('text/html'));
});

test('API: GET /styles.css and /app.js serve static assets', async () => {
  const css = await mockRequest('GET', '/styles.css');
  assert.strictEqual(css.statusCode, 200);
  assert.ok(css.headers['Content-Type'].includes('text/css'));

  const js = await mockRequest('GET', '/app.js');
  assert.strictEqual(js.statusCode, 200);
  assert.ok(js.headers['Content-Type'].includes('application/javascript'));
});

test('API: GET /api/stats returns dashboard KPIs', async () => {
  const res = await mockRequest('GET', '/api/stats');
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.total_students >= 10, 'Should have seeded students');
  assert.ok(data.missed_alerts_count >= 1, 'Should have missed alerts');
});

test('API: GET /api/missed-alerts identifies students with >5 missed classes', async () => {
  const res = await mockRequest('GET', '/api/missed-alerts');
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.total_alerts >= 2, 'Should have at least 2 alerts from seed');
  const liam = data.alerts.find(a => a.name.includes('Liam'));
  assert.ok(liam, 'Liam should be in missed alerts');
  assert.ok(liam.total_missed >= 5);
});

test('API: Student registration, register check-in and payment workflow', async () => {
  // 1. Create a student
  const createRes = await mockRequest('POST', '/api/students', {
    name: 'Akira Endo',
    dob: '2005-07-11',
    address: '8 Dojo Place, Leeds',
    tel: '07111 222333',
    association_no: 'EKF-2026-900',
    membership_start: '2026-09-01',
    membership_end: '2027-09-01',
    rank: '3rd Kyu (Brown)',
    last_graded: '2026-03-01',
    due_testing: '2026-12-01'
  });
  assert.strictEqual(createRes.statusCode, 201);
  const student = JSON.parse(createRes.body);

  // 2. Check into class on 2026-09-05, marked as present and PAID
  const regRes = await mockRequest('POST', '/api/register', {
    student_id: student.id,
    session_date: '2026-09-05',
    class_name: 'Saturday Class (11:30 AM - 12:30 PM)',
    status: 'present',
    paid: 1,
    payment_method: 'Card',
    amount_paid: 8.5,
    notes: 'First session of the month'
  });
  assert.strictEqual(regRes.statusCode, 200);
  const regRecord = JSON.parse(regRes.body);
  assert.strictEqual(regRecord.paid, 1);
  assert.strictEqual(regRecord.amount_paid, 8.5);

  // 3. Verify monthly aggregation reflects this session
  const monthlyRes = await mockRequest('GET', '/api/monthly?month=2026-09');
  assert.strictEqual(monthlyRes.statusCode, 200);
  const monthlyData = JSON.parse(monthlyRes.body);
  const akiraMonthly = monthlyData.find(m => m.student_id === student.id);
  assert.ok(akiraMonthly);
  assert.strictEqual(akiraMonthly.attended_lessons, 1);
});

test('API: Export CSV downloads', async () => {
  const resStudents = await mockRequest('GET', '/api/export/csv?type=students');
  assert.strictEqual(resStudents.statusCode, 200);
  assert.ok(resStudents.headers['Content-Type'].includes('text/csv'));
  assert.ok(resStudents.body.includes('Association Number'));

  const resMonthly = await mockRequest('GET', '/api/export/csv?type=monthly');
  assert.strictEqual(resMonthly.statusCode, 200);
  assert.ok(resMonthly.body.includes('Attended Lessons'));
});

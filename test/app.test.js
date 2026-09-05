const test = require('node:test');
const assert = require('node:assert');
const { createDatabase } = require('../db.js');

test('Database: Student registration and profile fields', () => {
  const db = createDatabase(':memory:');

  const newStudent = db.createStudent({
    name: 'Hiroshi Tanaka',
    dob: '1998-05-20',
    address: '10 Dojo Way, Manchester, M1 1AA',
    tel: '07999 112233',
    association_no: 'JKA-2026-9901',
    membership_start: '2026-01-01',
    membership_end: '2027-01-01',
    rank: '2nd Kyu (Brown)',
    last_graded: '2025-10-15',
    due_testing: '2026-10-15',
    notes: 'Preparing for 1st Kyu Brown Belt'
  });

  assert.ok(newStudent.id, 'Student should receive an ID');
  assert.strictEqual(newStudent.name, 'Hiroshi Tanaka');
  assert.strictEqual(newStudent.dob, '1998-05-20');
  assert.strictEqual(newStudent.tel, '07999 112233');
  assert.strictEqual(newStudent.association_no, 'JKA-2026-9901');
  assert.strictEqual(newStudent.rank, '2nd Kyu (Brown)');
  assert.strictEqual(newStudent.due_testing, '2026-10-15');

  // Update student rank
  const updated = db.updateStudent(newStudent.id, {
    ...newStudent,
    rank: '1st Kyu (Brown)',
    last_graded: '2026-10-15',
    due_testing: '2027-10-15'
  });

  assert.strictEqual(updated.rank, '1st Kyu (Brown)');
  assert.strictEqual(updated.last_graded, '2026-10-15');
});

test('Database: Attendance registration & Payment tracking per training day', () => {
  const db = createDatabase(':memory:');

  const student = db.createStudent({
    name: 'Kenji Sato',
    dob: '1985-05-12',
    address: 'Tokyo Garden, Birmingham',
    tel: '07700 900555',
    association_no: 'EKF-2020-0012',
    membership_start: '2020-01-01',
    membership_end: '2028-12-31',
    rank: '3rd Dan (Black)'
  });

  // 1. Mark present and paid
  const record1 = db.saveAttendanceRecord({
    student_id: student.id,
    session_date: '2026-09-01',
    class_name: 'Seniors Kata',
    status: 'present',
    paid: 1,
    payment_method: 'Card',
    amount_paid: 10.0,
    notes: 'Paid at desk'
  });

  assert.strictEqual(record1.status, 'present');
  assert.strictEqual(record1.paid, 1);
  assert.strictEqual(record1.amount_paid, 10.0);
  assert.strictEqual(record1.payment_method, 'Card');

  // 2. Mark another day present but UNPAID
  const record2 = db.saveAttendanceRecord({
    student_id: student.id,
    session_date: '2026-09-03',
    class_name: 'Seniors Kata',
    status: 'present',
    paid: 0,
    amount_paid: 0.0,
    notes: 'Forgot wallet'
  });

  assert.strictEqual(record2.status, 'present');
  assert.strictEqual(record2.paid, 0);

  // Verify unpaid tracker catches this session
  const unpaid = db.getUnpaidTrainedSessions();
  assert.strictEqual(unpaid.length, 1);
  assert.strictEqual(unpaid[0].student_name, 'Kenji Sato');
  assert.strictEqual(unpaid[0].session_date, '2026-09-03');
});

test('Database: Monthly lesson count calculation', () => {
  const db = createDatabase(':memory:');

  const student = db.createStudent({
    name: 'Emily Chen',
    dob: '2004-09-18',
    address: 'Harborne',
    tel: '07700 900321',
    association_no: 'EKF-2024-6552',
    membership_start: '2024-05-15',
    membership_end: '2026-12-31',
    rank: '4th Kyu (Purple)'
  });

  // Add 4 sessions in August 2026
  ['2026-08-04', '2026-08-11', '2026-08-18', '2026-08-25'].forEach(date => {
    db.saveAttendanceRecord({
      student_id: student.id,
      session_date: date,
      class_name: 'Regular Class',
      status: 'present',
      paid: 1,
      amount_paid: 8.0
    });
  });

  // Add 2 sessions in September 2026
  ['2026-09-01', '2026-09-03'].forEach(date => {
    db.saveAttendanceRecord({
      student_id: student.id,
      session_date: date,
      class_name: 'Regular Class',
      status: 'present',
      paid: 1,
      amount_paid: 8.0
    });
  });

  const augCounts = db.getMonthlyLessonCounts('2026-08');
  assert.strictEqual(augCounts.length, 1);
  assert.strictEqual(augCounts[0].attended_lessons, 4);

  const septCounts = db.getMonthlyLessonCounts('2026-09');
  assert.strictEqual(septCounts.length, 1);
  assert.strictEqual(septCounts[0].attended_lessons, 2);
});

test('Database: Highlight student who missed more than 5 lessons', () => {
  const db = createDatabase(':memory:');

  // Student A: Attends regularly (1 missed)
  const studentGood = db.createStudent({
    name: 'Good Attendee',
    dob: '2000-01-01',
    address: '1 Lane',
    tel: '0700000001',
    association_no: 'EKF-001',
    membership_start: '2026-01-01',
    membership_end: '2027-01-01',
    rank: '5th Kyu (Blue)'
  });

  // Student B: Missed 6 lessons (>5 lessons missed!)
  const studentAbsent = db.createStudent({
    name: 'Absent Student',
    dob: '2002-02-02',
    address: '2 Lane',
    tel: '0700000002',
    association_no: 'EKF-002',
    membership_start: '2026-01-01',
    membership_end: '2027-01-01',
    rank: '7th Kyu (Orange)'
  });

  // Student A records: 4 present, 1 absent
  ['2026-08-01', '2026-08-05', '2026-08-08', '2026-08-12'].forEach(d => {
    db.saveAttendanceRecord({ student_id: studentGood.id, session_date: d, status: 'present' });
  });
  db.saveAttendanceRecord({ student_id: studentGood.id, session_date: '2026-08-15', status: 'absent' });

  // Student B records: 6 absent
  ['2026-08-01', '2026-08-05', '2026-08-08', '2026-08-12', '2026-08-15', '2026-08-19'].forEach(d => {
    db.saveAttendanceRecord({ student_id: studentAbsent.id, session_date: d, status: 'absent' });
  });

  const report = db.getMissedLessonsReport();
  const alertAbsent = report.find(r => r.id === studentAbsent.id);
  const alertGood = report.find(r => r.id === studentGood.id);

  assert.strictEqual(alertAbsent.total_missed, 6);
  assert.strictEqual(alertAbsent.is_missed_alert, true, 'Student with 6 missed lessons must be flagged with alert');

  assert.strictEqual(alertGood.total_missed, 1);
  assert.strictEqual(alertGood.is_missed_alert, false, 'Student with only 1 missed lesson must not be flagged');
});

test('Database: Events and Grading testing reminders', () => {
  const db = createDatabase(':memory:');

  const student = db.createStudent({
    name: 'David Miller',
    dob: '1992-08-19',
    address: 'Yardley',
    tel: '07700 900222',
    association_no: 'EKF-2023-1109',
    membership_start: '2023-09-01',
    membership_end: '2026-12-31',
    rank: '1st Kyu (Brown)',
    due_testing: '2026-09-26' // Due for Black belt
  });

  // Create event: Shodan Dan Grading
  const event = db.createEvent({
    title: 'Autumn Black Belt Examination',
    event_type: 'grading',
    event_date: '2026-09-26',
    event_time: '14:00 - 17:00',
    location: 'Main Dojo',
    description: '1st Dan Shodan grading',
    reminder_days: 21
  });

  assert.strictEqual(event.title, 'Autumn Black Belt Examination');

  // Verify candidate query picks up David Miller
  const candidates = db.getGradingCandidates('2026-09-26');
  assert.ok(candidates.some(c => c.id === student.id), 'Candidate due testing should appear in grading candidates');

  // Add participant
  db.addEventParticipant(event.id, student.id, 'registered', '1st Dan Shodan');
  const participants = db.getEventParticipants(event.id);
  assert.strictEqual(participants.length, 1);
  assert.strictEqual(participants[0].name, 'David Miller');
});

test('Database: Gup Belt System and Minimum Classes Requirements Check', () => {
  const db = createDatabase(':memory:');

  // Student 1: 8th Gup (Orange Belt) needing 24 classes & 3 months for 7th Gup (Orange Tag Belt)
  const studentOrange = db.createStudent({
    name: 'Carlos Ruiz',
    dob: '2005-04-10',
    address: '15 High St',
    tel: '07123 000111',
    association_no: 'EKF-2025-111',
    membership_start: '2026-01-01',
    membership_end: '2027-01-01',
    rank: '8th Gup (Orange Belt)',
    last_graded: '2026-05-01' // 4 months ago (>3 months)
  });

  // Record 18 classes (less than 24 classes required)
  for (let i = 1; i <= 18; i++) {
    const day = String(i).padStart(2, '0');
    db.saveAttendanceRecord({
      student_id: studentOrange.id,
      session_date: `2026-05-${day}`,
      class_name: 'Tuesday Class (7:00 PM - 8:00 PM)',
      status: 'present',
      paid: 1
    });
  }

  const fetchedOrange1 = db.getStudentById(studentOrange.id);
  assert.strictEqual(fetchedOrange1.eligibility.lessons_done, 18);
  assert.strictEqual(fetchedOrange1.eligibility.lessons_required, 24);
  assert.strictEqual(fetchedOrange1.eligibility.classes_remaining, 6);
  assert.strictEqual(fetchedOrange1.eligibility.classes_met, false, 'Should not meet 24 classes requirement with only 18 classes');
  assert.strictEqual(fetchedOrange1.eligibility.time_met, true, 'Should meet 3 months requirement');
  assert.strictEqual(fetchedOrange1.eligibility.eligible, false);

  // Now record 6 more classes (total 24)
  for (let i = 19; i <= 24; i++) {
    const day = String(i).padStart(2, '0');
    db.saveAttendanceRecord({
      student_id: studentOrange.id,
      session_date: `2026-05-${day}`,
      class_name: 'Saturday Class (11:30 AM - 12:30 PM)',
      status: 'present',
      paid: 1
    });
  }

  const fetchedOrange2 = db.getStudentById(studentOrange.id);
  assert.strictEqual(fetchedOrange2.eligibility.lessons_done, 24);
  assert.strictEqual(fetchedOrange2.eligibility.classes_met, true, 'Should meet 24 classes requirement');
  assert.strictEqual(fetchedOrange2.eligibility.eligible, true, 'Should now be eligible for 7th Gup (Orange Tag Belt)');
  assert.strictEqual(fetchedOrange2.eligibility.next_rank, '7th Gup (Orange Tag Belt)');

  // Student 2: 1st Gup (Red Tag Belt) needing 60 classes and 6 months for Cho Dan Bo
  const studentRedTag = db.createStudent({
    name: 'Maya Lin',
    dob: '2000-08-12',
    address: '22 Dojo Lane',
    tel: '07123 000222',
    association_no: 'EKF-2024-222',
    membership_start: '2024-01-01',
    membership_end: '2027-01-01',
    rank: '1st Gup (Red Tag Belt)',
    last_graded: '2026-01-01'
  });

  const fetchedRedTag = db.getStudentById(studentRedTag.id);
  assert.strictEqual(fetchedRedTag.eligibility.lessons_required, 60);
  assert.strictEqual(fetchedRedTag.eligibility.months_required, 6);
  assert.strictEqual(fetchedRedTag.eligibility.next_rank, 'Cho Dan Bo (Blue Belt - Black Belt Candidate)');
});

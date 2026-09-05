const { createDatabase } = require('./db.js');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(__dirname, 'karate.db');
if (fs.existsSync(dbPath)) {
  console.log('Removing existing karate.db for clean seed...');
  fs.unlinkSync(dbPath);
}

const db = createDatabase(dbPath);

console.log('Seeding Karate Dojo database...');

const studentsData = [
  {
    name: 'Marcus Vance',
    dob: '1996-03-14',
    address: '42 High Street, Birmingham, B1 2AA',
    tel: '07700 900123',
    association_no: 'EKF-2024-8841',
    membership_start: '2024-01-10',
    membership_end: '2026-12-31',
    rank: '1st Dan (Black Belt)',
    last_graded: '2025-06-15',
    due_testing: '2027-06-20',
    notes: 'Squad kata competitor. Assistant coach for juniors.',
    status: 'active'
  },
  {
    name: 'Sarah Jenkins',
    dob: '2001-07-22',
    address: '15 Maple Avenue, Solihull, B91 3QR',
    tel: '07700 900456',
    association_no: 'EKF-2024-9102',
    membership_start: '2024-03-01',
    membership_end: '2026-11-30',
    rank: '3rd Gup (Brown Tag Belt)',
    last_graded: '2026-05-15',
    due_testing: '2026-09-26', // Due for 2nd Gup (Red Belt)!
    notes: 'Eligible for 2nd Gup testing this month. Great Bassai Dai.',
    status: 'active'
  },
  {
    name: 'Liam O’Connor',
    dob: '2008-11-05',
    address: '88 Oakridge Road, Sutton Coldfield, B73 5XY',
    tel: '07700 900789',
    association_no: 'EKF-2025-3319',
    membership_start: '2025-02-01',
    membership_end: '2027-02-01',
    rank: '8th Gup (Orange Belt)',
    last_graded: '2025-11-10',
    due_testing: '2026-10-15',
    notes: 'Parent reported exam commitments. Flagged for follow-up.',
    status: 'active'
  },
  {
    name: 'Emily Chen',
    dob: '2004-09-18',
    address: '34 Victoria Lane, Harborne, B17 9PB',
    tel: '07700 900321',
    association_no: 'EKF-2024-6552',
    membership_start: '2024-05-15',
    membership_end: '2026-12-31',
    rank: '5th Gup (Green Tag Belt)',
    last_graded: '2026-04-12',
    due_testing: '2026-10-15',
    notes: 'Strong kumite footwork. Regular attendee.',
    status: 'active'
  },
  {
    name: 'Nathan Patel',
    dob: '2010-02-08',
    address: '19 Chestnut Grove, Edgbaston, B15 2TH',
    tel: '07700 900654',
    association_no: 'EKF-2026-1044',
    membership_start: '2026-06-01',
    membership_end: '2027-06-01',
    rank: '10th Gup (White Belt)',
    last_graded: null,
    due_testing: '2026-09-26', // Due for 9th Gup White Belt with Black Band
    notes: 'New beginner showing great progress in basic drills.',
    status: 'active'
  },
  {
    name: 'Tyler Brooks',
    dob: '2006-12-30',
    address: '7 Kingsway Park, Shirley, B90 4EG',
    tel: '07700 900888',
    association_no: 'EKF-2025-4421',
    membership_start: '2025-01-15',
    membership_end: '2026-10-15',
    rank: '7th Gup (Orange Tag Belt)',
    last_graded: '2026-01-20',
    due_testing: '2026-10-01',
    notes: 'Owes class fee for last Tuesday training.',
    status: 'active'
  },
  {
    name: 'Olivia Taylor',
    dob: '2007-04-15',
    address: '61 Meadow Way, Moseley, B13 8DJ',
    tel: '07700 900999',
    association_no: 'EKF-2025-7723',
    membership_start: '2025-03-01',
    membership_end: '2027-03-01',
    rank: '9th Gup (White Belt with Black Band)',
    last_graded: '2026-05-10',
    due_testing: '2026-09-26',
    notes: 'Missed multiple sessions during summer break.',
    status: 'active'
  },
  {
    name: 'David Miller',
    dob: '1992-08-19',
    address: '104 Church Road, Yardley, B25 8XE',
    tel: '07700 900222',
    association_no: 'EKF-2023-1109',
    membership_start: '2023-09-01',
    membership_end: '2026-12-31',
    rank: 'Cho Dan Bo (Blue Belt - Black Belt Candidate)',
    last_graded: '2025-11-20',
    due_testing: '2026-09-26', // Due for Black Belt 1st Dan!
    notes: 'Preparing for Shodan (1st Dan) examination.',
    status: 'active'
  },
  {
    name: 'Kenji Sato',
    dob: '1985-05-12',
    address: '5 The Firs, Coventry, CV3 4PL',
    tel: '07700 900555',
    association_no: 'EKF-2020-0012',
    membership_start: '2020-01-01',
    membership_end: '2028-12-31',
    rank: '3rd Dan (Black Belt)',
    last_graded: '2023-11-20',
    due_testing: '2027-11-20',
    notes: 'Senior Sandan practitioner and referee.',
    status: 'active'
  },
  {
    name: 'Chloe Davies',
    dob: '2009-06-14',
    address: '22 Blossom Drive, Hall Green, B28 9LM',
    tel: '07700 900333',
    association_no: 'EKF-2025-8812',
    membership_start: '2025-04-10',
    membership_end: '2027-04-10',
    rank: '6th Gup (Green Belt)',
    last_graded: '2026-03-22',
    due_testing: '2026-11-15',
    notes: 'Active junior member, excellent attendance.',
    status: 'active'
  }
];

const insertedStudents = [];
for (const s of studentsData) {
  const created = db.createStudent(s);
  insertedStudents.push(created);
}
console.log(`Created ${insertedStudents.length} students.`);

// Helper to find student by name
const findStudent = (name) => insertedStudents.find(s => s.name === name);

// Official Dojo Training Schedule:
// Tuesdays: 7:00 PM - 8:00 PM
// Saturdays: 11:30 AM - 12:30 PM
const sessions = [
  { date: '2026-08-04', name: 'Tuesday Class (7:00 PM - 8:00 PM)' },
  { date: '2026-08-08', name: 'Saturday Class (11:30 AM - 12:30 PM)' },
  { date: '2026-08-11', name: 'Tuesday Class (7:00 PM - 8:00 PM)' },
  { date: '2026-08-15', name: 'Saturday Class (11:30 AM - 12:30 PM)' },
  { date: '2026-08-18', name: 'Tuesday Class (7:00 PM - 8:00 PM)' },
  { date: '2026-08-22', name: 'Saturday Class (11:30 AM - 12:30 PM)' },
  { date: '2026-08-25', name: 'Tuesday Class (7:00 PM - 8:00 PM)' },
  { date: '2026-08-29', name: 'Saturday Class (11:30 AM - 12:30 PM)' },
  { date: '2026-09-01', name: 'Tuesday Class (7:00 PM - 8:00 PM)' },
  { date: '2026-09-05', name: 'Saturday Class (11:30 AM - 12:30 PM)' }
];

console.log('Generating realistic attendance and payment records for Tuesdays & Saturdays...');

// 1. Regular Attendees (Marcus Vance, Sarah Jenkins, David Miller, Kenji Sato, Chloe Davies, Emily Chen)
const regularStudents = [
  findStudent('Marcus Vance'),
  findStudent('Sarah Jenkins'),
  findStudent('David Miller'),
  findStudent('Kenji Sato'),
  findStudent('Chloe Davies'),
  findStudent('Emily Chen'),
  findStudent('Nathan Patel')
];

for (const student of regularStudents) {
  sessions.forEach((sess, index) => {
    // 90% present
    const isPresent = (index + student.id) % 8 !== 0;
    const isPaid = isPresent ? ((index === 9 && student.name === 'Emily Chen') ? 0 : 1) : 0; // Emily Chen owes 1 session
    db.saveAttendanceRecord({
      student_id: student.id,
      session_date: sess.date,
      class_name: sess.name,
      status: isPresent ? 'present' : 'absent',
      paid: isPaid,
      payment_method: isPaid ? 'Card' : null,
      amount_paid: isPaid ? 8.0 : 0.0,
      notes: !isPresent ? 'Notified instructor' : ''
    });
  });
}

// 2. High Missed Lessons (>5 missed) students:
// Liam O'Connor: Absent for 7 consecutive sessions!
const liam = findStudent('Liam O’Connor');
sessions.forEach((sess, index) => {
  if (index < 3) {
    db.saveAttendanceRecord({
      student_id: liam.id,
      session_date: sess.date,
      class_name: sess.name,
      status: 'present',
      paid: 1,
      payment_method: 'Cash',
      amount_paid: 8.0
    });
  } else {
    // Missed last 7 sessions!
    db.saveAttendanceRecord({
      student_id: liam.id,
      session_date: sess.date,
      class_name: sess.name,
      status: 'absent',
      paid: 0,
      notes: 'No contact recorded'
    });
  }
});

// Olivia Taylor: Missed 6 sessions!
const olivia = findStudent('Olivia Taylor');
sessions.forEach((sess, index) => {
  const isAbsent = index >= 4; // Missed 6 sessions
  db.saveAttendanceRecord({
    student_id: olivia.id,
    session_date: sess.date,
    class_name: sess.name,
    status: isAbsent ? 'absent' : 'present',
    paid: isAbsent ? 0 : 1,
    payment_method: isAbsent ? null : 'Bank Transfer',
    amount_paid: isAbsent ? 0.0 : 8.0,
    notes: isAbsent ? 'Summer holiday absence' : ''
  });
});

// Tyler Brooks: Missed 5 sessions and has unpaid training
const tyler = findStudent('Tyler Brooks');
sessions.forEach((sess, index) => {
  if (index % 2 === 0) {
    // Present
    const paid = index !== 8; // unpaid on 2026-09-01
    db.saveAttendanceRecord({
      student_id: tyler.id,
      session_date: sess.date,
      class_name: sess.name,
      status: 'present',
      paid: paid ? 1 : 0,
      payment_method: paid ? 'Cash' : null,
      amount_paid: paid ? 8.0 : 0.0,
      notes: paid ? '' : 'Promised to bring cash next session'
    });
  } else {
    // Absent
    db.saveAttendanceRecord({
      student_id: tyler.id,
      session_date: sess.date,
      class_name: sess.name,
      status: 'absent',
      paid: 0
    });
  }
});

// Seed Events
console.log('Seeding Karate Events & Gradings...');
const eventsData = [
  {
    title: 'Autumn Gup Grading (Up to 1st Gup Red Tag)',
    event_type: 'grading',
    event_date: '2026-09-26',
    event_time: '10:00 - 13:00',
    location: 'Main Dojo Hall, Honbu Dojo',
    description: 'Official Gup belt examination conducted by Sensei Kenji Sato (3rd Dan). Students must have up-to-date association license and minimum required training attendance.',
    reminder_days: 14
  },
  {
    title: 'Black Belt (Dan) Testing & Examination',
    event_type: 'grading',
    event_date: '2026-09-26',
    event_time: '14:00 - 17:30',
    location: 'Main Dojo Hall, Honbu Dojo',
    description: 'Shodan (1st Dan) and Nidan (2nd Dan) panel examination with technical kata, bunkai, and continuous jiyu-kumite.',
    reminder_days: 21
  },
  {
    title: 'National Karate Open Championship 2026',
    event_type: 'competition',
    event_date: '2026-10-10',
    event_time: '08:30 - 18:00',
    location: 'National Indoor Arena, Birmingham',
    description: 'Kata and Kumite divisions for Cadets, Juniors, and Seniors under WKF rules. Club squad entry required.',
    reminder_days: 30
  },
  {
    title: 'Masterclass: Kata Bunkai & Self Defence Seminar',
    event_type: 'seminar',
    event_date: '2026-11-14',
    event_time: '11:00 - 15:00',
    location: 'Sports Centre Studio A, Solihull',
    description: 'Deep dive into Bassai Dai, Kanku Dai, and practical joint lock applications. Open to Cho Dan Bo and above.',
    reminder_days: 14
  }
];

const insertedEvents = [];
for (const ev of eventsData) {
  const e = db.createEvent(ev);
  insertedEvents.push(e);
}
console.log(`Created ${insertedEvents.length} events.`);

// Register participants for events
// Register Sarah Jenkins and Nathan Patel for Gup Grading
const gupGrading = insertedEvents[0];
db.addEventParticipant(gupGrading.id, findStudent('Sarah Jenkins').id, 'registered', 'Testing for 2nd Gup (Red Belt)');
db.addEventParticipant(gupGrading.id, findStudent('Nathan Patel').id, 'registered', 'Testing for 9th Gup (White Belt with Black Band)');

// Register David Miller for Black Belt Dan Testing
const danGrading = insertedEvents[1];
db.addEventParticipant(danGrading.id, findStudent('David Miller').id, 'registered', 'Testing for 1st Dan (Black Belt)');

// Register Marcus Vance & Emily Chen for National Championship
const comp = insertedEvents[2];
db.addEventParticipant(comp.id, findStudent('Marcus Vance').id, 'registered', 'Senior Male Kata & Kumite -75kg');
db.addEventParticipant(comp.id, findStudent('Emily Chen').id, 'registered', 'Junior Female Kumite -55kg');

console.log('Seeding completed successfully!');

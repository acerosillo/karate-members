const { createDatabase } = require('./db.js');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(__dirname, 'karate.db');
if (fs.existsSync(dbPath)) {
  console.log('Removing existing karate.db for clean seed...');
  fs.unlinkSync(dbPath);
}

async function main() {
  const db = await createDatabase(dbPath);

  console.log('Seeding Karate Dojo database...');

  const studentsData = [];

  const insertedStudents = [];
  for (const s of studentsData) {
    const created = await db.createStudent(s);
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
  const regularStudents = [];

  for (const student of regularStudents) {
    for (const [index, sess] of sessions.entries()) {
      // 90% present
      const isPresent = (index + student.id) % 8 !== 0;
      const isPaid = isPresent ? ((index === 9 && student.name === 'Emily Chen') ? 0 : 1) : 0; // Emily Chen owes 1 session
      await db.saveAttendanceRecord({
        student_id: student.id,
        session_date: sess.date,
        class_name: sess.name,
        status: isPresent ? 'present' : 'absent',
        paid: isPaid,
        payment_method: isPaid ? 'Card' : null,
        amount_paid: isPaid ? 8.0 : 0.0,
        notes: !isPresent ? 'Notified instructor' : ''
      });
    }
  }

  // 2. High Missed Lessons (>5 missed) students:
  // Liam O'Connor: Absent for 7 consecutive sessions!
  const liam = findStudent('Liam O’Connor');
  for (const [index, sess] of sessions.entries()) {
    if (index < 3) {
      await db.saveAttendanceRecord({
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
      await db.saveAttendanceRecord({
        student_id: liam.id,
        session_date: sess.date,
        class_name: sess.name,
        status: 'absent',
        paid: 0,
        notes: 'No contact recorded'
      });
    }
  }

  // Olivia Taylor: Missed 6 sessions!
  const olivia = findStudent('Olivia Taylor');
  for (const [index, sess] of sessions.entries()) {
    const isAbsent = index >= 4; // Missed 6 sessions
    await db.saveAttendanceRecord({
      student_id: olivia.id,
      session_date: sess.date,
      class_name: sess.name,
      status: isAbsent ? 'absent' : 'present',
      paid: isAbsent ? 0 : 1,
      payment_method: isAbsent ? null : 'Bank Transfer',
      amount_paid: isAbsent ? 0.0 : 8.0,
      notes: isAbsent ? 'Summer holiday absence' : ''
    });
  }

  // Tyler Brooks: Missed 5 sessions and has unpaid training
  const tyler = findStudent('Tyler Brooks');
  for (const [index, sess] of sessions.entries()) {
    if (index % 2 === 0) {
      // Present
      const paid = index !== 8; // unpaid on 2026-09-01
      await db.saveAttendanceRecord({
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
      await db.saveAttendanceRecord({
        student_id: tyler.id,
        session_date: sess.date,
        class_name: sess.name,
        status: 'absent',
        paid: 0
      });
    }
  }

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
    const e = await db.createEvent(ev);
    insertedEvents.push(e);
  }
  console.log(`Created ${insertedEvents.length} events.`);

  // Register participants for events
  // Register Sarah Jenkins and Nathan Patel for Gup Grading
  const gupGrading = insertedEvents[0];

  // Register David Miller for Black Belt Dan Testing
  const danGrading = insertedEvents[1];

  // Register Marcus Vance & Emily Chen for National Championship
  const comp = insertedEvents[2];

  console.log('Seeding completed successfully!');
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

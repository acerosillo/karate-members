# 🥋 Kenseikan Martial Arts & Karate Dojo Web App

A web application designed for Karate and Martial Arts dojos to manage student registers, track training attendance and class payments, calculate monthly lesson counts, alert instructors to high absenteeism (>5 missed lessons), track belt ranks and grading eligibility, and organize upcoming events.

---

## 🌟 Key Features

1. **Daily Training Register & Class Payment Tracking**:
   - **Official Dojo Schedule**:
     - **Tuesdays: 7:00 PM – 8:00 PM**
     - **Saturdays: 11:30 AM – 12:30 PM**
   - Quick jump buttons for **Next Tuesday** and **Next Saturday** with auto-session detection and day badge indicators.
   - Fast 1-click status toggle: **Present** or **Absent**.
   - Immediate payment status per training day: **Paid** vs **Unpaid** with fee amount (£) and payment method (Cash, Card, Bank Transfer, Subscription).
   - Quick bulk actions: **Mark All Present**, **Mark All Paid**.

2. **Student Profile & Member Directory**:
   - Stores all requested member fields:
     - **Full Name**
     - **Date of Birth (DOB)** and automatic age calculation
     - **Home Address**
     - **Telephone Number** (with direct click-to-call)
     - **Association / License Number** (EKF, WKF, JKA, etc.)
     - **Membership Start & Expiry Dates**
     - **Karate Belt Rank** (10th Kyu White up to 5th Dan Black Belt with visual belt colors)
     - **Last Graded Date**
     - **Next Testing Due Date**
     - **Instructor Notes** and status (Active / Archived)
   - Add new students, edit profiles, and archive/delete old members.

3. **Monthly Lesson Counter**:
   - Automatically computes total lessons attended per student each month.
   - Summarizes paid vs unpaid sessions and total fees collected.
   - Monthly consistency ratings (Dedicated, Regular, Irregular).

4. **⚠️ High Absenteeism Alert (>5 Missed Lessons)**:
   - Identifies and highlights students who have missed 5 or more lessons.
   - Distinctive warning badges and an **Attendance Watchlist** tab showing consecutive absences, last attended session date, and one-click contact details for instructor follow-up.

5. **🏆 Karate Events & Grading Reminders**:
   - Schedule Kyu/Dan Gradings, Tournaments/Competitions, and Seminars.
   - Real-time countdown timer badges.
   - **Belt Testing Due Reminders**: Automatically matches students whose next test is due near the event date.
   - Manage event registration rosters.

6. **💾 Reports, CSV Export & Mat Printing**:
   - Download complete rosters and attendance sheets as CSV.
   - Export monthly lesson totals for club accounts.
   - Print-friendly layout for clipboard use directly on the tatami mats.

7. **⚡ Zero External Dependencies**:
   - Built on Node.js 22 with native SQLite database (`node:sqlite` via `DatabaseSync`).
   - Starts instantly without requiring heavy `node_modules` or complex build tools.

---

## 🚀 Quick Start

### 1. Requirements
- Node.js v22+

### 2. Seed Sample Dojo Data (Optional)
To populate the app with realistic students, belt ranks, attendance records, unpaid sessions, and upcoming gradings:
```bash
npm run seed
```

### 3. Launch Application
```bash
npm start
```
Then open [http://localhost:3000](http://localhost:3000) in your web browser.

### 4. Run Automated Tests
```bash
npm test
```
All 11 unit and integration tests run in <100ms.

---

## 📁 Project Structure

```
KarateMembers/
├── db.js                 # SQLite database models, schemas & queries (native DatabaseSync)
├── server.js             # HTTP REST API server & static asset host
├── seed.js               # Sample data generator for students, attendance & events
├── package.json          # Project scripts and configuration
├── README.md             # Documentation and usage guide
├── public/
│   ├── index.html        # Single-page martial arts app interface
│   ├── styles.css        # Dojo theme, authentic belt styling & responsive layout
│   └── app.js            # Frontend reactive client logic & API interactions
└── test/
    ├── app.test.js       # Database models and business logic unit tests
    └── api.test.js       # End-to-end HTTP API integration tests
```

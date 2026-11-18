/* Seeds demo data. WARNING: wipes users, complaints, chats, notifications and counters.
 *   npm run seed            (refuses to run when NODE_ENV=production)
 *   npm run seed -- --force (override)
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');
const Counter = require('../models/Counter');
const { nextTicketId } = require('../services/complaintService');

const ADMIN_PASSWORD = 'Admin@123';
const STUDENT_PASSWORD = 'Student@123';

const ADMINS = [
  { name: 'Dr. Meera Iyer', email: 'admin@university.edu', department: 'Registrar Office' },
  { name: 'Prof. Rahul Verma', email: 'exams@university.edu', department: 'Examination Cell' },
  { name: 'Ms. Sunita Rao', email: 'hostel@university.edu', department: 'Hostel Administration' },
];

const STUDENTS = [
  { name: 'Aarav Sharma', email: 'aarav@student.edu', studentId: 'CS2021001', department: 'Computer Science', phone: '9876500001' },
  { name: 'Priya Nair', email: 'priya@student.edu', studentId: 'EC2021014', department: 'Electronics', phone: '9876500002' },
  { name: 'Rohan Gupta', email: 'rohan@student.edu', studentId: 'ME2022033', department: 'Mechanical', phone: '9876500003' },
  { name: 'Ananya Singh', email: 'ananya@student.edu', studentId: 'BT2020007', department: 'Biotechnology', phone: '9876500004' },
  { name: 'Karan Mehta', email: 'karan@student.edu', studentId: 'CE2023045', department: 'Civil Engineering', phone: '9876500005' },
  { name: 'Sneha Patel', email: 'sneha@student.edu', studentId: 'CS2022058', department: 'Computer Science', phone: '9876500006' },
];

// [category, title, description, priority]
const TEMPLATES = [
  ['Exams', 'Hall ticket not generated for end-semester exam', 'My hall ticket is not available on the exam portal even though my fees are cleared. The semester exams start next week and I have not been able to download it.', 'High'],
  ['Exams', 'Marks mismatch in Data Structures result', 'The marks displayed in my Data Structures result are 41 but my answer sheet copy shows 56. I would like to apply for revaluation.', 'Medium'],
  ['Exams', 'Request for supplementary exam schedule', 'The supplementary exam timetable has not been published yet and the last date to apply is approaching. Please clarify the schedule.', 'Medium'],
  ['Hostel', 'No hot water in Block C for two weeks', 'There has been no hot water in Block C bathrooms for the past two weeks. Several students have complained to the warden without any action.', 'High'],
  ['Hostel', 'Mess food quality and hygiene', 'The food served in the hostel mess has been of poor quality and we found insects in the dal on Tuesday. Please inspect the kitchen.', 'High'],
  ['Hostel', 'Wi-Fi not working in Room 214', 'The hostel Wi-Fi router on the second floor has been down for three days which affects our online classes and assignments.', 'Medium'],
  ['Fees', 'Tuition fee paid but showing as pending', 'I paid the semester tuition fee through the online portal on 3rd of this month and the amount was deducted, but the portal still shows it as pending.', 'High'],
  ['Fees', 'Scholarship amount not credited', 'My merit scholarship for this academic year has not been credited to my account yet. Other students in my batch have received it.', 'Medium'],
  ['Fees', 'Refund for withdrawn elective', 'I withdrew from a paid elective course within the permitted period but the refund has not been processed after two months.', 'Low'],
  ['Transport', 'Bus route 7 consistently arrives late', 'Bus route 7 from the city centre has been arriving 30 to 40 minutes late almost every day, causing us to miss first period lectures.', 'Medium'],
  ['Transport', 'Request for additional evening bus', 'There is no bus after 6 PM from campus to the railway station. Students attending the library or labs late have no safe way to travel.', 'Low'],
  ['Transport', 'Bus driver driving rashly', 'The driver of bus number 12 drives very rashly and overspeeds near the main road crossing. This is a safety risk for all students.', 'Urgent'],
  ['Faculty', 'Faculty regularly cancelling classes', 'Our Operating Systems classes have been cancelled six times this semester without any replacement lectures and the syllabus is incomplete.', 'High'],
  ['Faculty', 'Unfair evaluation of lab record', 'The lab instructor refused to evaluate my record book without giving a reason, while others submitted at the same time were graded.', 'Medium'],
  ['Faculty', 'Professor not responding to project queries', 'My project guide has not responded to emails or scheduled meetings for over a month and the review deadline is close.', 'Medium'],
  ['Infrastructure', 'Projector not working in Room 305', 'The projector in classroom 305 has been broken for a month and lecturers are unable to show presentations.', 'Medium'],
  ['Infrastructure', 'Leaking roof in library reading hall', 'Rainwater is leaking from the ceiling of the library reading hall near the window section, damaging books and making seating unusable.', 'High'],
  ['Infrastructure', 'Drinking water cooler out of order', 'The water cooler near the main building canteen has not been working for weeks and students have no safe drinking water.', 'Medium'],
  ['Infrastructure', 'Poor lighting in parking area', 'The student parking area behind the science block has non-functional street lights. It is unsafe to walk there after dark.', 'High'],
  ['Academic', 'Attendance not updated on portal', 'My attendance for the last month in Computer Networks is not updated on the portal although I attended all classes. I may be marked short.', 'High'],
  ['Academic', 'Clash between elective timetable slots', 'Two of my registered electives have overlapping slots on Wednesday afternoons, making it impossible to attend both.', 'Medium'],
  ['Academic', 'Syllabus copy not provided for new course', 'The department has not shared the detailed syllabus and reference books for the new Machine Learning elective.', 'Low'],
  ['Academic', 'Internal assessment marks not published', 'Internal assessment marks for the second unit test have not been published even though the deadline passed three weeks ago.', 'Medium'],
  ['Hostel', 'Harassment by seniors in hostel corridor', 'A group of senior students has been harassing first year students in the hostel corridor at night. We are scared to report it individually.', 'Urgent'],
  ['Fees', 'Late fee fine charged incorrectly', 'I was charged a late fee fine although my payment receipt shows I paid before the due date.', 'Medium'],
  ['Exams', 'Question paper had out-of-syllabus questions', 'The Thermodynamics paper contained a 10 mark question from a unit that was removed from the syllabus. Please consider this during evaluation.', 'Medium'],
  ['Infrastructure', 'Computer lab systems very slow', 'Most of the computers in Lab 2 take over ten minutes to boot and several have broken keyboards, affecting practical sessions.', 'Medium'],
  ['Transport', 'Bus pass renewal delay', 'I applied for my transport bus pass renewal a month ago and it is still not approved, so I am paying daily fares.', 'Low'],
  ['Faculty', 'Inappropriate remarks by a faculty member', 'A faculty member made inappropriate and discouraging remarks about students from a particular background during class.', 'Urgent'],
  ['Academic', 'Course registration portal error', 'The semester course registration portal keeps showing an error when I try to add my electives and the window closes tomorrow.', 'High'],
];

// Deterministic pseudo-random so every seed run gives the same dataset
let rngState = 20261115;
const rand = () => {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const DAY = 24 * 60 * 60 * 1000;

const STATUS_PATTERN = ['Resolved', 'Pending', 'In Progress', 'Resolved', 'In Progress', 'Pending', 'Rejected', 'Resolved', 'Pending', 'In Progress'];

const ADMIN_REMARKS = {
  'In Progress': ['We have forwarded this to the concerned department.', 'Under review. We will update you shortly.', 'Inspection scheduled this week.'],
  Resolved: ['Issue has been fixed. Please confirm if you still face any problem.', 'Resolved after coordination with the department.', 'Corrective action completed.'],
  Rejected: ['This request does not fall under the grievance policy. Please contact the department office directly.', 'Duplicate of an existing complaint that is already being handled.'],
};

async function seed() {
  if (env.nodeEnv === 'production' && !process.argv.includes('--force')) {
    console.error('Refusing to seed with NODE_ENV=production. Use --force if you are really sure.');
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);
  console.log(`[seed] Connected to ${mongoose.connection.name}. Clearing old data...`);
  await Promise.all([User, Complaint, ChatMessage, Notification, Counter].map((m) => m.deleteMany({})));
  await User.syncIndexes();

  // create() (not insertMany) so the bcrypt pre-save hook runs
  const admins = [];
  for (const a of ADMINS) admins.push(await User.create({ ...a, password: ADMIN_PASSWORD, role: 'admin' }));
  const students = [];
  for (const s of STUDENTS) students.push(await User.create({ ...s, password: STUDENT_PASSWORD, role: 'student' }));

  // Spread complaints over the last ~150 days, oldest first so ticket numbers are chronological
  const plan = TEMPLATES.map((t, i) => ({
    t,
    createdAt: new Date(Date.now() - Math.floor((TEMPLATES.length - i) * (150 / TEMPLATES.length) * DAY) + Math.floor(rand() * DAY * 0.8)),
    status: STATUS_PATTERN[i % STATUS_PATTERN.length],
  }));
  // Make sure the most recent few are open so dashboards look "live"
  plan.slice(-5).forEach((p, i) => { p.status = i % 2 ? 'In Progress' : 'Pending'; p.createdAt = new Date(Date.now() - (i + 1) * DAY * 0.7); });
  plan.sort((a, b) => a.createdAt - b.createdAt);

  const created = [];
  for (const { t, createdAt, status } of plan) {
    const [category, title, description, priority] = t;
    const student = pick(students);
    const assignee = status === 'Pending' ? null : (category === 'Exams' ? admins[1] : category === 'Hostel' ? admins[2] : pick(admins));
    const history = [{ status: 'Pending', changedBy: student._id, note: 'Complaint submitted', at: createdAt }];
    const remarks = [];
    let resolvedAt;

    if (status !== 'Pending') {
      const t1 = new Date(createdAt.getTime() + DAY * (0.3 + rand()));
      history.push({ status: 'In Progress', changedBy: assignee._id, note: 'Assigned and under review', at: t1 });
      remarks.push({ by: assignee._id, message: pick(ADMIN_REMARKS['In Progress']), at: t1 });
      if (status === 'Resolved' || status === 'Rejected') {
        const t2 = new Date(t1.getTime() + DAY * (1 + rand() * 5));
        const msg = pick(ADMIN_REMARKS[status]);
        history.push({ status, changedBy: assignee._id, note: msg, at: t2 });
        remarks.push({ by: assignee._id, message: msg, at: t2 });
        if (status === 'Resolved') resolvedAt = t2;
      }
    }

    const ticketId = await nextTicketId();
    const doc = await Complaint.create({
      ticketId, student: student._id, title, description, category, priority, status,
      assignedTo: assignee ? assignee._id : undefined,
      remarks, statusHistory: history, resolvedAt, source: 'seed', createdAt,
    });
    created.push(doc);
  }

  // Demo chat history + notifications for the first student
  const demo = students[0];
  const demoComplaint = created.find((c) => String(c.student) === String(demo._id)) || created[0];
  await ChatMessage.create([
    { user: demo._id, role: 'user', content: 'Hi', provider: undefined },
    { user: demo._id, role: 'bot', content: "Hello! I'm UniHelp, your grievance assistant. Tell me about any issue you're facing and I'll file a ticket for you.", provider: 'system' },
  ]);
  await Notification.create([
    { user: demo._id, title: 'Welcome to UniHelp', message: 'Describe any grievance in the chatbot and we will register it instantly.', type: 'info' },
    { user: demo._id, title: `Complaint ${demoComplaint.status}`, message: `${demoComplaint.ticketId} is now "${demoComplaint.status}".`, type: 'status', complaint: demoComplaint._id },
  ]);
  for (const a of admins) {
    await Notification.create({ user: a._id, title: 'Seed data loaded', message: `${created.length} sample complaints are available for review.`, type: 'info' });
  }

  const byStatus = created.reduce((m, c) => ({ ...m, [c.status]: (m[c.status] || 0) + 1 }), {});
  console.log(`[seed] Created ${admins.length} admins, ${students.length} students, ${created.length} complaints`, byStatus);
  console.log('\n  Admin   : admin@university.edu / ' + ADMIN_PASSWORD);
  console.log('  Student : aarav@student.edu    / ' + STUDENT_PASSWORD);
  console.log('  (all seeded students use ' + STUDENT_PASSWORD + ', other admins ' + ADMIN_PASSWORD + ')\n');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});

const CATEGORIES = [
  'Academic',
  'Exams',
  'Hostel',
  'Fees',
  'Transport',
  'Faculty',
  'Infrastructure',
  'Other', // fallback when nothing fits
];
const STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const ROLES = ['student', 'admin'];

module.exports = { CATEGORIES, STATUSES, PRIORITIES, ROLES };

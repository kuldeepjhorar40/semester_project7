const Complaint = require('../models/Complaint');
const Counter = require('../models/Counter');
const { formatTicketId } = require('../utils/ticket');
const { notifyUser, notifyAdmins } = require('./notificationService');

// Atomic per-year sequence -> GRV-2026-00001
async function nextTicketId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `ticket-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return formatTicketId(year, counter.seq);
}

async function createComplaint({ student, title, description, category, priority, source = 'chatbot' }) {
  const ticketId = await nextTicketId();
  const complaint = await Complaint.create({
    ticketId,
    student: student._id,
    title,
    description,
    category,
    priority,
    source,
    statusHistory: [{ status: 'Pending', changedBy: student._id, note: 'Complaint submitted' }],
  });

  await Promise.all([
    notifyUser(student._id, {
      title: 'Complaint registered',
      message: `Your complaint ${ticketId} (${category}) has been registered and is awaiting review.`,
      type: 'created',
      complaint: complaint._id,
    }),
    notifyAdmins(
      {
        title: `New ${priority} priority complaint`,
        message: `${ticketId} · ${category} · ${title}`,
        type: 'created',
        complaint: complaint._id,
      },
      student._id
    ),
  ]);
  return complaint;
}

const populateComplaint = (query) =>
  query
    .populate('student', 'name email studentId department')
    .populate('assignedTo', 'name email department')
    .populate('remarks.by', 'name role')
    .populate('statusHistory.changedBy', 'name role');

module.exports = { nextTicketId, createComplaint, populateComplaint };

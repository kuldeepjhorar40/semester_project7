const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const { AppError, asyncHandler, escapeRegex } = require('../utils/AppError');
const { createComplaint, populateComplaint } = require('../services/complaintService');
const { categorize } = require('../utils/categorizer');
const { STATUSES } = require('../constants');

// GET /api/complaints  (student: own complaints)
exports.listMine = asyncHandler(async (req, res) => {
  const { status, category, q, page, limit } = req.query;
  const filter = { student: req.user._id };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ ticketId: re }, { title: re }];
  }
  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('assignedTo', 'name')
      .lean(),
    Complaint.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// GET /api/complaints/stats/summary
exports.myStats = asyncHandler(async (req, res) => {
  const [grouped, recent] = await Promise.all([
    Complaint.aggregate([
      { $match: { student: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Complaint.find({ student: req.user._id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  grouped.forEach((g) => { byStatus[g._id] = g.count; });
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  res.json({ success: true, total, byStatus, recent });
});

// GET /api/complaints/:id  (id = Mongo _id OR ticket id). Students can only open their own.
exports.getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const match = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { ticketId: id.toUpperCase() }] } : { ticketId: id.toUpperCase() };
  const complaint = await populateComplaint(Complaint.findOne(match));
  if (!complaint) throw new AppError('Complaint not found', 404);
  const isOwner = String(complaint.student._id) === String(req.user._id);
  if (req.user.role !== 'admin' && !isOwner) throw new AppError('Complaint not found', 404); // do not leak existence
  res.json({ success: true, complaint });
});

// POST /api/complaints  (manual form submission, same pipeline as the chatbot)
exports.create = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const guess = categorize(`${title} ${description}`);
  const complaint = await createComplaint({
    student: req.user,
    title,
    description,
    category: req.body.category || guess.category,
    priority: req.body.priority || guess.priority,
    source: 'form',
  });
  res.status(201).json({ success: true, complaint });
});

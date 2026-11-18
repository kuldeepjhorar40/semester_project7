const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { AppError, asyncHandler, escapeRegex } = require('../utils/AppError');
const { populateComplaint } = require('../services/complaintService');
const { notifyUser } = require('../services/notificationService');
const { STATUSES, CATEGORIES, PRIORITIES } = require('../constants');

// GET /api/admin/complaints
exports.listAll = asyncHandler(async (req, res) => {
  const { status, category, priority, assignedTo, q, page, limit } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (assignedTo === 'unassigned') filter.assignedTo = { $exists: false };
  else if (assignedTo) filter.assignedTo = assignedTo;
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ ticketId: re }, { title: re }];
  }
  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('student', 'name studentId')
      .populate('assignedTo', 'name')
      .lean(),
    Complaint.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// GET /api/admin/staff  (admins that complaints can be assigned to)
exports.listStaff = asyncHandler(async (_req, res) => {
  const staff = await User.find({ role: 'admin' }).select('name email department').sort({ name: 1 }).lean();
  res.json({ success: true, staff });
});

// PATCH /api/admin/complaints/:id
exports.updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new AppError('Complaint not found', 404);

  const { status, priority, category, assignedTo, remark } = req.body;
  const notes = [];
  let newStatus = status;

  if (assignedTo !== undefined) {
    if (assignedTo === null) {
      complaint.assignedTo = undefined;
    } else {
      const staff = await User.findOne({ _id: assignedTo, role: 'admin' });
      if (!staff) throw new AppError('Assignee must be an existing staff/admin user', 400);
      if (String(complaint.assignedTo) !== String(staff._id)) {
        complaint.assignedTo = staff._id;
        notes.push(`assigned to ${staff.name}`);
        // Assigning a pending complaint implicitly starts work on it
        if (!newStatus && complaint.status === 'Pending') newStatus = 'In Progress';
      }
    }
  }
  if (priority && priority !== complaint.priority) {
    complaint.priority = priority;
    notes.push(`priority set to ${priority}`);
  }
  if (category && category !== complaint.category) {
    complaint.category = category;
    notes.push(`recategorised as ${category}`);
  }

  let statusChanged = false;
  if (newStatus && newStatus !== complaint.status) {
    if (['Resolved', 'Rejected'].includes(newStatus) && !remark) {
      throw new AppError(`A remark is required when marking a complaint as ${newStatus}`, 400);
    }
    complaint.status = newStatus;
    complaint.resolvedAt = newStatus === 'Resolved' ? new Date() : undefined;
    complaint.statusHistory.push({ status: newStatus, changedBy: req.user._id, note: remark || undefined });
    statusChanged = true;
  }
  if (remark) complaint.remarks.push({ by: req.user._id, message: remark });

  if (!statusChanged && !remark && !notes.length) {
    throw new AppError('No changes to apply', 400);
  }
  await complaint.save();

  // Notify the student about what happened
  if (statusChanged) {
    await notifyUser(complaint.student, {
      title: `Complaint ${complaint.status}`,
      message: `${complaint.ticketId} is now "${complaint.status}".${remark ? ` Remark: ${remark}` : ''}`,
      type: 'status',
      complaint: complaint._id,
    });
  } else if (notes.some((n) => n.startsWith('assigned'))) {
    await notifyUser(complaint.student, {
      title: 'Complaint assigned',
      message: `${complaint.ticketId} has been ${notes.find((n) => n.startsWith('assigned'))}.`,
      type: 'assigned',
      complaint: complaint._id,
    });
  } else if (remark) {
    await notifyUser(complaint.student, {
      title: 'New remark on your complaint',
      message: `${complaint.ticketId}: ${remark}`,
      type: 'remark',
      complaint: complaint._id,
    });
  }

  const updated = await populateComplaint(Complaint.findById(complaint._id));
  res.json({ success: true, complaint: updated });
});

// GET /api/admin/analytics
exports.analytics = asyncHandler(async (_req, res) => {
  const now = new Date();
  // Everything is bucketed in UTC so the JS side and the Mongo $year/$month side always agree
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const [facet] = await Complaint.aggregate([
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        monthly: [
          { $match: { createdAt: { $gte: monthStart } } },
          {
            $group: {
              _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
              created: { $sum: 1 },
              resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
            },
          },
        ],
        resolution: [
          { $match: { status: 'Resolved', resolvedAt: { $exists: true } } },
          { $group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } } } },
        ],
        workload: [
          { $match: { assignedTo: { $exists: true }, status: { $in: ['Pending', 'In Progress'] } } },
          { $group: { _id: '$assignedTo', open: { $sum: 1 } } },
          { $sort: { open: -1 } },
        ],
        unassigned: [
          { $match: { assignedTo: { $exists: false }, status: { $in: ['Pending', 'In Progress'] } } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  facet.byStatus.forEach((s) => { statusCounts[s._id] = s.count; });
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const closed = statusCounts.Resolved + statusCounts.Rejected;

  const toSeries = (rows, order) => {
    const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
    return order.map((name) => ({ name, value: map[name] || 0 }));
  };

  // Always return the last 6 months, even months with zero complaints
  const monthly = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const hit = facet.monthly.find((m) => m._id.y === d.getUTCFullYear() && m._id.m === d.getUTCMonth() + 1);
    monthly.push({
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      created: hit?.created || 0,
      resolved: hit?.resolved || 0,
    });
  }

  const staffDocs = await User.find({ _id: { $in: facet.workload.map((w) => w._id) } }).select('name').lean();
  const nameById = Object.fromEntries(staffDocs.map((s) => [String(s._id), s.name]));
  const workload = facet.workload.map((w) => ({ name: nameById[String(w._id)] || 'Unknown', open: w.open }));

  const avgMs = facet.resolution[0]?.avgMs;
  const topCategory = facet.byCategory[0];

  res.json({
    success: true,
    totals: {
      total,
      pending: statusCounts.Pending,
      inProgress: statusCounts['In Progress'],
      resolved: statusCounts.Resolved,
      rejected: statusCounts.Rejected,
      unassigned: facet.unassigned[0]?.count || 0,
      resolutionRate: total ? Math.round((statusCounts.Resolved / total) * 100) : 0,
      closureRate: total ? Math.round((closed / total) * 100) : 0,
      avgResolutionHours: avgMs ? Math.round((avgMs / 36e5) * 10) / 10 : 0,
      topCategory: topCategory ? topCategory._id : null,
      students: await User.countDocuments({ role: 'student' }),
    },
    byStatus: STATUSES.map((s) => ({ name: s, value: statusCounts[s] })),
    byCategory: toSeries(facet.byCategory, CATEGORIES).filter((c) => c.value > 0 || c.name !== 'Other'),
    byPriority: toSeries(facet.byPriority, PRIORITIES),
    monthly,
    workload,
  });
});

// Used by the admin dashboard "recent complaints" widget
exports.recent = asyncHandler(async (_req, res) => {
  const items = await Complaint.find()
    .sort({ createdAt: -1 })
    .limit(6)
    .populate('student', 'name studentId')
    .populate('assignedTo', 'name')
    .lean();
  res.json({ success: true, items });
});

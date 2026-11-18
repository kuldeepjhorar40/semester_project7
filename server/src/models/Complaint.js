const mongoose = require('mongoose');
const { CATEGORIES, STATUSES, PRIORITIES } = require('../constants');

const { ObjectId } = mongoose.Schema.Types;

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    changedBy: { type: ObjectId, ref: 'User' },
    note: { type: String, maxlength: 300 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const remarkSchema = new mongoose.Schema(
  {
    by: { type: ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    student: { type: ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    category: { type: String, enum: CATEGORIES, required: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    status: { type: String, enum: STATUSES, default: 'Pending' },
    assignedTo: { type: ObjectId, ref: 'User' },
    remarks: [remarkSchema],
    statusHistory: [historySchema],
    resolvedAt: Date,
    source: { type: String, enum: ['chatbot', 'form', 'seed'], default: 'chatbot' },
  },
  { timestamps: true }
);

complaintSchema.index({ student: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });

complaintSchema.set('toJSON', {
  transform: (_d, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Complaint', complaintSchema);

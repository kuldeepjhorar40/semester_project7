const mongoose = require('mongoose');

// Atomic sequence generator used for ticket IDs (one counter per year).
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);

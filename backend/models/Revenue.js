const mongoose = require('mongoose');

const RevenueSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2030
  },
  revenue: {
    type: Number,
    required: true,
    min: 0
  },
  source: {
    type: String,
    default: 'manual',
    enum: ['manual', 'payment', 'project']
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Index for efficient queries
RevenueSchema.index({ year: 1, month: 1 });
RevenueSchema.index({ createdAt: -1 });

// Update timestamp on save
RevenueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Revenue', RevenueSchema);
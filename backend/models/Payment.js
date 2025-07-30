const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  description: {
    type: String,
    required: [true, 'Payment description is required'],
    trim: true
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  dueAmount: {
    type: Number,
    default: function() {
      return this.totalAmount - this.paidAmount;
    }
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'partial', 'paid', 'overdue'],
      message: 'Payment status must be pending, partial, paid, or overdue'
    },
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: {
      values: ['cash', 'bank-transfer', 'cheque', 'online', 'upi', 'card'],
      message: 'Please select a valid payment method'
    },
    default: 'bank-transfer'
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  paidDate: {
    type: Date
  },
  transactionId: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  paymentHistory: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      required: true
    },
    transactionId: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  gstRate: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
paymentSchema.index({ client: 1, paymentStatus: 1 });
paymentSchema.index({ project: 1 });
paymentSchema.index({ invoiceNumber: 1 });
paymentSchema.index({ dueDate: 1 });

// Pre-save middleware to generate unique invoice number
paymentSchema.pre('save', async function(next) {
  try {
    if (!this.invoiceNumber) {
      const count = await this.constructor.countDocuments();
      const currentYear = new Date().getFullYear();
      this.invoiceNumber = `INV${currentYear}${String(count + 1).padStart(4, '0')}`;
      console.log('✅ Generated invoiceNumber:', this.invoiceNumber);
    }
    
    // Update due amount
    this.dueAmount = this.totalAmount - this.paidAmount;
    
    // Update payment status based on amounts
    if (this.paidAmount >= this.totalAmount) {
      this.paymentStatus = 'paid';
      if (!this.paidDate) {
        this.paidDate = new Date();
      }
    } else if (this.paidAmount > 0) {
      this.paymentStatus = 'partial';
    } else if (this.dueDate < new Date() && this.paidAmount === 0) {
      this.paymentStatus = 'overdue';
    } else {
      this.paymentStatus = 'pending';
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for payment completion percentage
paymentSchema.virtual('completionPercentage').get(function() {
  if (this.totalAmount === 0) return 0;
  return Math.round((this.paidAmount / this.totalAmount) * 100);
});

// Virtual for days overdue
paymentSchema.virtual('daysOverdue').get(function() {
  if (this.paymentStatus !== 'overdue') return 0;
  const diffTime = new Date() - this.dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to add payment
paymentSchema.methods.addPayment = function(paymentData) {
  this.paymentHistory.push(paymentData);
  this.paidAmount += paymentData.amount;
  return this.save();
};

// Static method to get overdue payments
paymentSchema.statics.getOverduePayments = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    paymentStatus: { $in: ['pending', 'partial'] }
  });
};

module.exports = mongoose.model('Payment', paymentSchema);

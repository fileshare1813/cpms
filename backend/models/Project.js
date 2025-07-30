const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    unique: true
  },
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    enum: {
      values: ['Website Development', 'SEO', 'Digital Marketing', 'E-commerce', 'Mobile App', 'Custom Software', 'Maintenance', 'Other'],
      message: 'Please select a valid service type'
    }
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['planning', 'in-progress', 'completed', 'on-hold', 'cancelled', 'delayed'],
      message: 'Please select a valid status'
    },
    default: 'planning'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Please select a valid priority'
    },
    default: 'medium'
  },
  budget: {
    type: Number,
    required: [true, 'Budget is required'],
    min: [0, 'Budget cannot be negative']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  remainingAmount: {
    type: Number,
    default: function() {
      return this.budget - this.paidAmount;
    }
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  estimatedEndDate: {
    type: Date,
    required: [true, 'Estimated end date is required']
  },
  actualEndDate: {
    type: Date
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  assignedEmployees: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: ['Project Manager', 'Developer', 'Designer', 'SEO Specialist', 'Content Writer', 'QA Tester']
    },
    assignedDate: {
      type: Date,
      default: Date.now
    }
  }],
  milestones: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    completedDate: Date
  }],
  requirements: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    }
  }],
  technologies: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
projectSchema.index({ client: 1, status: 1 });
projectSchema.index({ projectId: 1 });
projectSchema.index({ status: 1 });

// Pre-save middleware to generate unique project ID
projectSchema.pre('save', async function(next) {
  try {
    if (!this.projectId) {
      const count = await this.constructor.countDocuments();
      this.projectId = `PRJ${String(count + 1).padStart(4, '0')}`;
      console.log('✅ Generated projectId:', this.projectId);
    }
    
    // Update remaining amount
    this.remainingAmount = this.budget - this.paidAmount;
    
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  if (this.startDate && this.estimatedEndDate) {
    const diffTime = Math.abs(this.estimatedEndDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
});

// Virtual for completion percentage
projectSchema.virtual('completionPercentage').get(function() {
  if (this.status === 'completed') return 100;
  return this.progress || 0;
});

// Instance method to add milestone
projectSchema.methods.addMilestone = function(milestoneData) {
  this.milestones.push(milestoneData);
  return this.save();
};

// Instance method to update progress
projectSchema.methods.updateProgress = function(newProgress) {
  this.progress = Math.min(100, Math.max(0, newProgress));
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.actualEndDate = new Date();
  }
  return this.save();
};

// Static method to get projects by status
projectSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .populate('client', 'companyName clientId')
    .populate('assignedEmployees.employee', 'name designation');
};

module.exports = mongoose.model('Project', projectSchema);

const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { 
    type: String, 
    unique: true,
    // REMOVED: required: true - Let pre-save middleware handle this
  },
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: { 
    type: String, 
    required: [true, 'Phone number is required'],
    trim: true
  },
  designation: { 
    type: String, 
    required: [true, 'Designation is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: {
      values: ['Web Development', 'SEO', 'Design', 'Marketing', 'Management'],
      message: 'Department must be one of: Web Development, SEO, Design, Marketing, Management'
    }
  },
  joiningDate: {
    type: Date,
    required: [true, 'Joining date is required']
  },
  salary: {
    type: Number,
    min: [0, 'Salary cannot be negative'],
    default: 0
  },
  skills: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'on-leave'],
      message: 'Status must be active, inactive, or on-leave'
    },
    default: 'active'
  },
  address: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
employeeSchema.index({ email: 1 });
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ department: 1 });

// FIXED: Pre-save middleware to generate unique employee ID
employeeSchema.pre('save', async function(next) {
  try {
    // Only generate employeeId if it doesn't exist (new document)
    if (!this.employeeId || this.employeeId === '') {
      console.log('🔄 Generating employeeId for new employee...');
      
      // Get count of existing employees
      const EmployeeModel = this.constructor;
      const count = await EmployeeModel.countDocuments();
      
      // Generate unique employeeId
      this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
      
      console.log('✅ Generated employeeId:', this.employeeId);
    }
    
    // Ensure email is lowercase
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
    
    // Trim other string fields
    if (this.name) this.name = this.name.trim();
    if (this.phone) this.phone = this.phone.trim();
    if (this.designation) this.designation = this.designation.trim();
    
    next();
  } catch (error) {
    console.error('❌ Employee pre-save middleware error:', error);
    next(error);
  }
});

// Post-save middleware for logging
employeeSchema.post('save', function(doc) {
  console.log('✅ Employee saved successfully with ID:', doc.employeeId);
});

// Virtual for full employee info
employeeSchema.virtual('fullInfo').get(function() {
  return `${this.name} - ${this.designation} (${this.employeeId})`;
});

// Static method to find by employeeId
employeeSchema.statics.findByEmployeeId = function(employeeId) {
  return this.findOne({ employeeId });
};

// Instance method to check if employee has login account
employeeSchema.methods.hasLoginAccount = async function() {
  const User = mongoose.model('User');
  const account = await User.findOne({ 
    role: 'employee', 
    employeeId: this._id 
  });
  return !!account;
};

module.exports = mongoose.model('Employee', employeeSchema);
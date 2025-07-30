const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  clientId: { 
    type: String, 
    unique: true,
    // REMOVED: required: true - Let pre-save middleware handle this
  },
  companyName: { 
    type: String, 
    required: [true, 'Company name is required'],
    trim: true
  },
  contactPerson: { 
    type: String, 
    required: [true, 'Contact person is required'],
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
  address: { 
    type: String,
    trim: true
  },
  notes: { 
    type: String,
    trim: true
  },
  domains: [{
    domainName: { 
      type: String, 
      required: true,
      trim: true
    },
    provider: { 
      type: String,
      trim: true
    },
    expiryDate: { 
      type: Date, 
      required: true 
    },
    registrationDate: { 
      type: Date,
      default: Date.now
    },
    autoRenewal: { 
      type: Boolean, 
      default: false 
    }
  }],
  hosting: [{
    provider: { 
      type: String, 
      required: true,
      trim: true
    },
    plan: { 
      type: String,
      trim: true
    },
    expiryDate: { 
      type: Date, 
      required: true 
    },
    renewalDate: { 
      type: Date 
    },
    cost: { 
      type: Number,
      min: 0
    }
  }],
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended'],
      message: 'Status must be active, inactive, or suspended'
    },
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
clientSchema.index({ email: 1 });
clientSchema.index({ clientId: 1 });
clientSchema.index({ companyName: 1 });

// FIXED: Pre-save middleware to generate unique client ID
clientSchema.pre('save', async function(next) {
  try {
    // Only generate clientId if it doesn't exist (new document)
    if (!this.clientId || this.clientId === '') {
      console.log('🔄 Generating clientId for new client...');
      
      // Get count of existing clients
      const ClientModel = this.constructor;
      const count = await ClientModel.countDocuments();
      
      // Generate unique clientId
      this.clientId = `CL${String(count + 1).padStart(4, '0')}`;
      
      console.log('✅ Generated clientId:', this.clientId);
    }
    
    // Ensure email is lowercase
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
    
    // Trim other string fields
    if (this.companyName) {
      this.companyName = this.companyName.trim();
    }
    
    if (this.contactPerson) {
      this.contactPerson = this.contactPerson.trim();
    }
    
    if (this.phone) {
      this.phone = this.phone.trim();
    }
    
    next();
  } catch (error) {
    console.error('❌ Pre-save middleware error:', error);
    next(error);
  }
});

// Post-save middleware for logging
clientSchema.post('save', function(doc) {
  console.log('✅ Client saved successfully with ID:', doc.clientId);
});

// Virtual for full client info
clientSchema.virtual('fullInfo').get(function() {
  return `${this.companyName} - ${this.contactPerson} (${this.clientId})`;
});

// Static method to find by clientId
clientSchema.statics.findByClientId = function(clientId) {
  return this.findOne({ clientId });
};

// Instance method to check if client has active projects
clientSchema.methods.hasActiveProjects = async function() {
  const Project = mongoose.model('Project');
  const count = await Project.countDocuments({ 
    client: this._id, 
    status: { $in: ['planning', 'in-progress'] } 
  });
  return count > 0;
};

module.exports = mongoose.model('Client', clientSchema);

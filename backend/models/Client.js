// backend/models/Client.js
// FIXED: Enhanced clientId generation to avoid duplicates

const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  clientId: { 
    type: String, 
    unique: true
    // REMOVED: required: true - Let pre-save middleware handle this
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// FIXED: Enhanced pre-save middleware with proper duplicate handling
clientSchema.pre('save', async function(next) {
  try {
    // Only generate clientId if it doesn't exist (new document)
    if (!this.clientId || this.clientId === '') {
      console.log('🔄 Generating unique clientId for new client...');
      
      const ClientModel = this.constructor;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        try {
          // Get the highest existing clientId number
          const lastClient = await ClientModel.findOne({}, { clientId: 1 })
            .sort({ clientId: -1 })
            .limit(1);
          
          let nextNumber = 1;
          if (lastClient && lastClient.clientId) {
            // Extract number from clientId (e.g., "CL0005" -> 5)
            const match = lastClient.clientId.match(/CL(\d+)/);
            if (match) {
              nextNumber = parseInt(match[1]) + 1;
            }
          }
          
          // Generate new clientId
          const newClientId = `CL${String(nextNumber).padStart(4, '0')}`;
          console.log(`🔄 Attempt ${attempts + 1}: Trying clientId: ${newClientId}`);
          
          // Check if this clientId already exists
          const existingClient = await ClientModel.findOne({ clientId: newClientId });
          if (!existingClient) {
            this.clientId = newClientId;
            console.log('✅ Generated unique clientId:', this.clientId);
            break;
          } else {
            console.log(`⚠️ ClientId ${newClientId} already exists, trying next...`);
            attempts++;
          }
        } catch (checkError) {
          console.error('❌ Error checking clientId uniqueness:', checkError);
          attempts++;
        }
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique clientId after multiple attempts');
      }
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

// ADDED: Alternative method for generating clientId if pre-save fails
clientSchema.statics.generateUniqueClientId = async function() {
  try {
    console.log('🔄 Using alternative clientId generation method...');
    
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      // Generate random number to avoid conflicts
      const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
      const clientId = `CL${randomNum}`;
      
      const existing = await this.findOne({ clientId });
      if (!existing) {
        console.log('✅ Alternative method generated unique clientId:', clientId);
        return clientId;
      }
      
      attempts++;
    }
    
    // Last resort: use timestamp
    const timestamp = Date.now().toString().slice(-4);
    const fallbackClientId = `CL${timestamp}`;
    console.log('⚠️ Using timestamp fallback clientId:', fallbackClientId);
    return fallbackClientId;
    
  } catch (error) {
    console.error('❌ Alternative clientId generation failed:', error);
    throw error;
  }
};

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
  try {
    const Project = mongoose.model('Project');
    const count = await Project.countDocuments({ 
      client: this._id, 
      status: { $in: ['planning', 'in-progress'] } 
    });
    return count > 0;
  } catch (error) {
    console.error('Error checking active projects:', error);
    return false;
  }
};

module.exports = mongoose.model('Client', clientSchema);
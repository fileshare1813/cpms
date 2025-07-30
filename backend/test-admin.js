// backend/test-admin.js (Create this file)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User model (copy from your models/User.js)
const userSchema = new mongoose.Schema({
  name: String,
  email: String, 
  password: String,
  role: { type: String, default: 'admin' }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const User = mongoose.model('User', userSchema);

async function createTestAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@company.com' });
    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }
    
    // Create admin
    const admin = new User({
      name: 'Test Admin',
      email: 'rk@company.com',
      password: 'rk123',
      role: 'admin'
    });
    
    await admin.save();
    console.log('✅ Test admin created successfully!');
    console.log('Email: admin@company.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestAdmin();

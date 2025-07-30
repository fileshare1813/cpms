const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@company.com' });
    if (existingAdmin) {
      console.log('✅ Admin already exists');
      console.log('📧 Email:', existingAdmin.email);
      return;
    }
    
    // Create new admin
    const admin = new User({
      name: 'System Admin',
      email: 'admin@company.com',
      password: 'admin123',
      role: 'admin'
    });
    
    await admin.save();
    console.log('🎉 Admin created successfully!');
    console.log('📧 Email: admin@company.com');
    console.log('🔑 Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();

const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...');
  console.log('📍 MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');
  
  try {
    // Connect
    console.log('⏳ Connecting...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to:', conn.connection.host);
    console.log('📊 Database:', conn.connection.name);
    console.log('🔌 Connection State:', conn.connection.readyState);
    
    // Test ping
    await mongoose.connection.db.admin().ping();
    console.log('🏓 Ping successful');
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📂 Collections:', collections.map(c => c.name));
    
    // Test creating a document
    const testSchema = new mongoose.Schema({ test: String });
    const TestModel = mongoose.model('Test', testSchema);
    
    const testDoc = new TestModel({ test: 'Connection successful!' });
    await testDoc.save();
    console.log('✅ Test document created');
    
    // Clean up
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('🧹 Cleanup completed');
    
    console.log('🎉 Database connection is working perfectly!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('🔍 Full error:', error);
    
    if (error.message.includes('authentication failed')) {
      console.log('🔑 Check username/password in connection string');
    }
    if (error.message.includes('network')) {
      console.log('🌐 Check internet connection');
    }
    if (error.message.includes('timeout')) {
      console.log('⏱️ Connection timeout - check firewall/network');
    }
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
    process.exit(0);
  }
}

testConnection();

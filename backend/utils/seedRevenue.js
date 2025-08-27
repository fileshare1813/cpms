const Revenue = require('../models/Revenue');

const seedRevenueData = async () => {
  try {
    const existingData = await Revenue.countDocuments();
    
    if (existingData > 0) {
      console.log('✅ Revenue data already exists, skipping seed');
      return;
    }

    const currentYear = new Date().getFullYear();
    const sampleData = [
      { month: 'January', year: currentYear, revenue: 65000, source: 'payment' },
      { month: 'February', year: currentYear, revenue: 59000, source: 'payment' },
      { month: 'March', year: currentYear, revenue: 80000, source: 'project' },
      { month: 'April', year: currentYear, revenue: 81000, source: 'payment' },
      { month: 'May', year: currentYear, revenue: 56000, source: 'manual' },
      { month: 'June', year: currentYear, revenue: 95000, source: 'project' },
      { month: 'July', year: currentYear, revenue: 72000, source: 'payment' },
      { month: 'August', year: currentYear, revenue: 68000, source: 'payment' },
      
      // Previous year data
      { month: 'January', year: currentYear - 1, revenue: 45000, source: 'payment' },
      { month: 'February', year: currentYear - 1, revenue: 52000, source: 'payment' },
      { month: 'March', year: currentYear - 1, revenue: 61000, source: 'project' },
      { month: 'April', year: currentYear - 1, revenue: 58000, source: 'payment' },
      { month: 'May', year: currentYear - 1, revenue: 67000, source: 'manual' },
      { month: 'June', year: currentYear - 1, revenue: 73000, source: 'project' },
    ];
    
    await Revenue.insertMany(sampleData);
    console.log('✅ Sample revenue data inserted successfully');
  } catch (error) {
    console.error('❌ Error seeding revenue data:', error);
  }
};

module.exports = { seedRevenueData };
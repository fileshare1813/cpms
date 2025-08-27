const express = require('express');
const router = express.Router();
const Revenue = require('../models/Revenue');
const auth = require('../middleware/auth');

// Get chart data for dashboard
router.get('/chart-data', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    console.log(`🔄 Fetching chart data for year: ${year}`);
    
    const revenueData = await Revenue.find({ year: parseInt(year) })
      .sort({ createdAt: 1 })
      .lean();
    
    // Create month-wise mapping
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthlyData = monthOrder.reduce((acc, month) => {
      const monthData = revenueData.filter(item => item.month === month);
      acc[month] = monthData.reduce((sum, item) => sum + item.revenue, 0);
      return acc;
    }, {});
    
    const chartData = {
      labels: monthOrder,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: monthOrder.map(month => monthlyData[month]),
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    };
    
    console.log(`✅ Chart data prepared for ${year}:`, chartData);
    
    res.json({ 
      success: true, 
      data: chartData,
      totalRevenue: Object.values(monthlyData).reduce((a, b) => a + b, 0),
      year: parseInt(year)
    });
  } catch (error) {
    console.error('❌ Error fetching chart data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add new revenue data
router.post('/', auth, async (req, res) => {
  try {
    const { month, year, revenue, description, source = 'manual' } = req.body;
    
    console.log('💾 Creating new revenue entry:', { month, year, revenue, source });
    
    // Validation
    if (!month || !year || !revenue) {
      return res.status(400).json({ 
        success: false, 
        message: 'Month, year, and revenue are required' 
      });
    }

    if (revenue < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Revenue cannot be negative' 
      });
    }
    
    const newRevenue = new Revenue({
      month,
      year: parseInt(year),
      revenue: parseFloat(revenue),
      description,
      source
    });
    
    await newRevenue.save();
    console.log('✅ Revenue entry created:', newRevenue);
    
    res.json({ success: true, data: newRevenue });
  } catch (error) {
    console.error('❌ Error adding revenue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all revenue data with pagination and filters
router.get('/', auth, async (req, res) => {
  try {
    const { 
      year, 
      month, 
      page = 1, 
      limit = 10,
      sort = '-createdAt'
    } = req.query;
    
    const filter = {};
    
    if (year) filter.year = parseInt(year);
    if (month) filter.month = month;
    
    const skip = (page - 1) * parseInt(limit);
    
    const [revenues, total] = await Promise.all([
      Revenue.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Revenue.countDocuments(filter)
    ]);
    
    console.log(`✅ Fetched ${revenues.length} revenue entries`);
    
    res.json({
      success: true,
      data: revenues,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching revenue data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update revenue data
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year, revenue, description, source } = req.body;
    
    console.log(`🔄 Updating revenue entry ${id}:`, { month, year, revenue });
    
    // Validation
    if (revenue !== undefined && revenue < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Revenue cannot be negative' 
      });
    }
    
    const updatedRevenue = await Revenue.findByIdAndUpdate(
      id,
      { 
        ...(month && { month }),
        ...(year && { year: parseInt(year) }),
        ...(revenue !== undefined && { revenue: parseFloat(revenue) }),
        ...(description !== undefined && { description }),
        ...(source && { source }),
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedRevenue) {
      return res.status(404).json({ success: false, message: 'Revenue entry not found' });
    }
    
    console.log('✅ Revenue entry updated:', updatedRevenue);
    
    res.json({ success: true, data: updatedRevenue });
  } catch (error) {
    console.error('❌ Error updating revenue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete revenue data
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting revenue entry ${id}`);
    
    const deletedRevenue = await Revenue.findByIdAndDelete(id);
    
    if (!deletedRevenue) {
      return res.status(404).json({ success: false, message: 'Revenue entry not found' });
    }
    
    console.log('✅ Revenue entry deleted');
    
    res.json({ success: true, message: 'Revenue entry deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting revenue:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get revenue analytics/stats
router.get('/analytics', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    console.log(`📊 Generating analytics for year: ${year}`);
    
    const [yearlyTotal, monthlyBreakdown, yearlyComparison] = await Promise.all([
      // Total revenue for the year
      Revenue.aggregate([
        { $match: { year: parseInt(year) } },
        { $group: { _id: null, total: { $sum: '$revenue' } } }
      ]),
      
      // Monthly breakdown
      Revenue.aggregate([
        { $match: { year: parseInt(year) } },
        { 
          $group: { 
            _id: '$month', 
            total: { $sum: '$revenue' },
            count: { $sum: 1 }
          } 
        },
        { $sort: { total: -1 } }
      ]),
      
      // Year over year comparison
      Revenue.aggregate([
        { 
          $group: { 
            _id: '$year', 
            total: { $sum: '$revenue' },
            count: { $sum: 1 }
          } 
        },
        { $sort: { _id: -1 } },
        { $limit: 3 }
      ])
    ]);
    
    const analytics = {
      currentYear: parseInt(year),
      totalRevenue: yearlyTotal[0]?.total || 0,
      monthlyBreakdown: monthlyBreakdown,
      yearlyComparison: yearlyComparison,
      avgMonthlyRevenue: monthlyBreakdown.length > 0 ? 
        (yearlyTotal[0]?.total || 0) / monthlyBreakdown.length : 0
    };
    
    console.log('✅ Analytics generated:', analytics);
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('❌ Error generating analytics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
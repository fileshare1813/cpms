// backend/routes/users.js
const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Client = require('../models/Client');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/users - Get all users (Admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    
    let filter = {};
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('clientId', 'companyName clientId')
      .populate('employeeId', 'name employeeId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('clientId', 'companyName clientId')
      .populate('employeeId', 'name employeeId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// GET /api/users/search - Search users by various criteria
router.get('/search', async (req, res) => {
  try {
    const { email, role, clientId } = req.query;
    
    let filter = {};
    
    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (clientId) {
      filter.clientId = clientId;
    }

    console.log('🔍 User search filter:', filter);

    const user = await User.findOne(filter)
      .select('-password')
      .populate('clientId', 'companyName clientId')
      .populate('employeeId', 'name employeeId');

    if (!user) {
      return res.json({
        success: false,
        message: 'No user found with the given criteria',
        user: null
      });
    }

    console.log('✅ Found user:', user._id, user.email, user.role);

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ User search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
});

// GET /api/users/role/:role - Get users by role
router.get('/role/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const { limit = 50 } = req.query;

    console.log('🔍 Finding users by role:', role);

    const users = await User.find({ role })
      .select('-password')
      .populate('clientId', 'companyName clientId')
      .populate('employeeId', 'name employeeId')
      .limit(parseInt(limit));

    console.log(`✅ Found ${users.length} users with role: ${role}`);

    res.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error('❌ Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users by role',
      error: error.message
    });
  }
});

// GET /api/users/email/:email - Get user by email
router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log('🔍 Finding user by email:', email);

    const user = await User.findOne({ 
      email: email.toLowerCase() 
    })
      .select('-password')
      .populate('clientId', 'companyName clientId')
      .populate('employeeId', 'name employeeId');

    if (!user) {
      return res.json({
        success: false,
        message: 'User not found with this email',
        user: null
      });
    }

    console.log('✅ Found user by email:', user._id, user.role);

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Get user by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user by email',
      error: error.message
    });
  }
});

// GET /api/users/client/:clientId - Get user by client ID (ENHANCED)
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    console.log('🔍 Finding user by clientId:', clientId);

    // Method 1: Find user with clientId field
    let user = await User.findOne({ 
      clientId: clientId,
      role: 'client'
    })
      .select('-password')
      .populate('clientId', 'companyName clientId');

    if (user) {
      console.log('✅ Method 1: Found user by clientId field:', user._id);
      return res.json({
        success: true,
        user,
        method: 'clientId_field'
      });
    }

    // Method 2: Find client and get its user reference
    const client = await Client.findById(clientId).populate('user', '-password');
    if (client && client.user) {
      console.log('✅ Method 2: Found user via client.user field:', client.user._id);
      return res.json({
        success: true,
        user: client.user,
        method: 'client_user_field'
      });
    }

    // Method 3: Find by client's email
    if (client && client.email) {
      user = await User.findOne({ 
        email: client.email,
        role: 'client'
      }).select('-password');
      
      if (user) {
        console.log('✅ Method 3: Found user by matching email:', user._id);
        return res.json({
          success: true,
          user,
          method: 'email_match'
        });
      }
    }

    console.log('❌ No user found for clientId:', clientId);
    
    res.json({
      success: false,
      message: 'No user found for this client',
      user: null
    });
  } catch (error) {
    console.error('❌ Get user by clientId error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user by client ID',
      error: error.message
    });
  }
});

// POST /api/users - Create new user (Admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, email, password, role, clientId, employeeId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      role
    };

    if (role === 'client' && clientId) {
      userData.clientId = clientId;
    }

    if (role === 'employee' && employeeId) {
      userData.employeeId = employeeId;
    }

    const user = new User(userData);
    await user.save();

    console.log('✅ User created successfully:', user._id, user.email, user.role);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// PUT /api/users/:id - Update user (Admin or own profile)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updates = {};
    const allowedFields = ['name', 'email'];
    
    // Admin can update more fields
    if (req.user.role === 'admin') {
      allowedFields.push('role', 'isActive', 'clientId', 'employeeId');
    }

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User updated successfully:', user._id);

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User deleted successfully:', user._id, user.email);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

module.exports = router;
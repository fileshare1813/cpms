const User = require('../models/User');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d',
  });
};

// Admin Login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find admin user
    const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Client Login
const clientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find client user
    const user = await User.findOne({ 
      email: email.toLowerCase(), 
      role: 'client' 
    }).populate('clientId');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if client is active
    if (!user.clientId || user.clientId.status !== 'active') {
      return res.status(403).json({ message: 'Account is suspended or inactive' });
    }

    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientInfo: user.clientId
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Employee Login
const employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find employee user
    const user = await User.findOne({ 
      email: email.toLowerCase(), 
      role: 'employee' 
    }).populate('employeeId');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if employee is active
    if (!user.employeeId || user.employeeId.status !== 'active') {
      return res.status(403).json({ message: 'Employee account is inactive' });
    }

    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeInfo: user.employeeId
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create Admin (for initial setup or adding new admins)
const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create admin
    const admin = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'admin'
    });

    await admin.save();

    // Generate token
    const token = generateToken(admin._id);
    
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create Client User Account
const createClientUser = async (req, res) => {
  try {
    const { clientId, name, email, password } = req.body;

    // Validation
    if (!clientId || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client ID, email, and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Create client user
    const clientUser = new User({
      name: name || client.contactPerson,
      email: email.toLowerCase().trim(),
      password,
      role: 'client',
      clientId: clientId
    });

    await clientUser.save();

    res.status(201).json({
      success: true,
      message: 'Client login account created successfully',
      user: {
        id: clientUser._id,
        name: clientUser.name,
        email: clientUser.email,
        role: clientUser.role,
        clientId: clientUser.clientId
      }
    });
  } catch (error) {
    console.error('Create client user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Create Employee User Account
const createEmployeeUser = async (req, res) => {
  try {
    const { employeeId, email, password } = req.body;

    // Validation
    if (!employeeId || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee ID, email, and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Create employee user
    const employeeUser = new User({
      name: employee.name,
      email: email.toLowerCase().trim(),
      password,
      role: 'employee',
      employeeId: employeeId
    });

    await employeeUser.save();

    res.status(201).json({
      success: true,
      message: 'Employee login account created successfully',
      user: {
        id: employeeUser._id,
        name: employeeUser.name,
        email: employeeUser.email,
        role: employeeUser.role,
        employeeId: employeeUser.employeeId
      }
    });
  } catch (error) {
    console.error('Create employee user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Current User Profile
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('clientId')
      .populate('employeeId')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientInfo: user.clientId || null,
        employeeInfo: user.employeeId || null,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update User Profile
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user._id;

    // Validation
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already taken' });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        name: name.trim(), 
        email: email.toLowerCase().trim() 
      },
      { new: true, runValidators: true }
    ).populate('clientId').populate('employeeId').select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientInfo: user.clientId || null,
        employeeInfo: user.employeeId || null
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Logout (mainly for clearing any server-side sessions if needed)
const logout = async (req, res) => {
  try {
    // In JWT-based auth, logout is mainly handled client-side
    // But we can add any server-side cleanup here if needed
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify Token (useful for middleware or client-side verification)
const verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('clientId')
      .populate('employeeId')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      valid: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientInfo: user.clientId || null,
        employeeInfo: user.employeeId || null
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(401).json({ success: false, valid: false, message: 'Invalid token' });
  }
};

// Reset Password (basic implementation)
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Validation
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Users (Admin Only)
const getAllUsers = async (req, res) => {
  try {
    const { role = '', search = '', page = 1, limit = 10 } = req.query;
    
    let filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .populate('clientId', 'companyName clientId')
      .populate('employeeId', 'name employeeId department')
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete User Account (Admin Only)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting own account
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  adminLogin,
  clientLogin,
  employeeLogin,
  createAdmin,
  createClientUser,
  createEmployeeUser,
  changePassword,
  getCurrentUser,
  updateProfile,
  logout,
  verifyToken,
  resetPassword,
  getAllUsers,
  deleteUser
};
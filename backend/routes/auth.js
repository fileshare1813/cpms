const express = require('express');
const {
  adminLogin,
  clientLogin,
  employeeLogin,
  createAdmin,
  createEmployeeUser,
  createClientUser,
  changePassword,
  getCurrentUser,
  updateProfile,
  logout,
  verifyToken,
  resetPassword
} = require('../controllers/authController');
const { auth, adminAuth } = require('../middleware/auth');
const User = require('../models/User'); // path adjust karo agar zarurat ho
// const authMiddleware = require('../middleware/auth'); // JWT ya jo use karte ho

const router = express.Router();

// Public routes
router.post('/admin/login', adminLogin);
router.post('/client/login', clientLogin);
router.post('/employee/login', employeeLogin);
router.post('/admin/create', createAdmin);
router.post('/reset-password', resetPassword);

// Protected routes (require authentication)
router.use(auth); // All routes below require authentication

router.get('/me', getCurrentUser);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);
router.post('/logout', logout);
router.get('/verify', verifyToken);

// Admin only routes
router.post('/employee/create', adminAuth, createEmployeeUser);
router.post('/client/create', adminAuth, createClientUser);

router.post('/change-password', auth, async (req, res) => {
  const userId = req.user._id; // JWT middleware se set hota hai
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Optional: Check only admin can change through this route
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can change password here' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
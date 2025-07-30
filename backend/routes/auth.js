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

module.exports = router;
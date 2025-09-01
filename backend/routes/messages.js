const express = require('express');
const {
  getAllMessages,
  getMessageById,
  sendMessage,
  markAsRead,
  replyMessage,
  getMessageStats,
  getAdminUsers
} = require('../controllers/messageController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Routes accessible to all authenticated users
router.get('/', getAllMessages);
router.get('/stats', getMessageStats);
router.get('/admin-users', auth, getAdminUsers); // New route for clients to get admin users
router.get('/:id', getMessageById);
router.post('/', sendMessage);
router.put('/:id/read', markAsRead);
router.post('/:id/reply', replyMessage);

module.exports = router;

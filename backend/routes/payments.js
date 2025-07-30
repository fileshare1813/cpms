const express = require('express');
const {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentsByClient,
  addPaymentToRecord,
  getPaymentStats
} = require('../controllers/paymentController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Routes accessible to all authenticated users
router.get('/', getAllPayments);
router.get('/stats', getPaymentStats);
router.get('/client/:clientId', getPaymentsByClient);
router.get('/:id', getPaymentById);

// Admin only routes
router.post('/', adminAuth, createPayment);
router.put('/:id', adminAuth, updatePayment);
router.delete('/:id', adminAuth, deletePayment);
router.post('/:id/add-payment', adminAuth, addPaymentToRecord);

module.exports = router;

const express = require('express');
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controllers/employeeController');
const { adminAuth, auth } = require('../middleware/auth');

const router = express.Router();

// All employee routes require authentication
router.use(auth);

// Admin only routes
router.get('/', adminAuth, getAllEmployees);
router.get('/:id', adminAuth, getEmployeeById);
router.post('/', adminAuth, createEmployee);
router.put('/:id', adminAuth, updateEmployee);
router.delete('/:id', adminAuth, deleteEmployee);

module.exports = router;

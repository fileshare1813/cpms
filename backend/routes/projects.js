const express = require('express');
const {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectsByClient,
  getProjectStats
} = require('../controllers/projectController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Routes accessible to all authenticated users
router.get('/', getAllProjects);
router.get('/stats', getProjectStats);
router.get('/client/:clientId', getProjectsByClient);
router.get('/:id', getProjectById);

// Admin only routes
router.post('/', adminAuth, createProject);
router.put('/:id', adminAuth, updateProject);
router.delete('/:id', adminAuth, deleteProject);

module.exports = router;

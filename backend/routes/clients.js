const express = require('express');
const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getUpcomingExpiries,
  getClientStats
} = require('../controllers/clientController');
const { adminAuth, auth } = require('../middleware/auth');

const router = express.Router();

// Debug: Check if all functions are imported properly
console.log('🔍 Client Controller Functions Check:');
console.log('getAllClients:', typeof getAllClients);
console.log('getClientById:', typeof getClientById);
console.log('createClient:', typeof createClient);
console.log('updateClient:', typeof updateClient);
console.log('deleteClient:', typeof deleteClient);
console.log('getUpcomingExpiries:', typeof getUpcomingExpiries);
console.log('getClientStats:', typeof getClientStats);

// All routes require authentication
router.use(auth);

// Admin only routes with proper error handling
try {
  router.get('/', adminAuth, getAllClients || ((req, res) => res.status(501).json({error: 'getAllClients not implemented'})));
  router.get('/stats', adminAuth, getClientStats || ((req, res) => res.status(501).json({error: 'getClientStats not implemented'})));
  router.get('/expiries', adminAuth, getUpcomingExpiries || ((req, res) => res.status(501).json({error: 'getUpcomingExpiries not implemented'})));
  router.post('/', adminAuth, createClient || ((req, res) => res.status(501).json({error: 'createClient not implemented'})));
  router.put('/:id', adminAuth, updateClient || ((req, res) => res.status(501).json({error: 'updateClient not implemented'})));
  router.delete('/:id', adminAuth, deleteClient || ((req, res) => res.status(501).json({error: 'deleteClient not implemented'})));

  // Shared routes (admin and client can access)
  router.get('/:id', getClientById || ((req, res) => res.status(501).json({error: 'getClientById not implemented'})));
} catch (error) {
  console.error('❌ Route setup error:', error);
}

module.exports = router;

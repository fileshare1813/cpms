// Missing this line:
const mongoose = require('mongoose');
const Client = require('../models/Client');
const User = require('../models/User');
const Project = require('../models/Project');
const Payment = require('../models/Payment');

// Get all clients with pagination, search and filter
const getAllClients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    console.log('🔄 Getting all clients with params:', { page, limit, search, status });
    
    // Build filter object
    let filter = {};
    
    // Search functionality
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { clientId: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Status filter
    if (status) {
      filter.status = status;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const clients = await Client.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOptions);

    // Get total count for pagination
    const total = await Client.countDocuments(filter);

    // Calculate additional stats for each client
    const clientsWithStats = await Promise.all(clients.map(async (client) => {
      try {
        // Check if client has login account
        const hasLoginAccount = await User.exists({ 
          role: 'client', 
          clientId: client._id 
        });

        // Get project count
        const projectCount = await Project.countDocuments({ client: client._id });
        
        // Get payment stats
        const paymentStats = await Payment.aggregate([
          { $match: { client: client._id } },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$totalAmount' },
              paidAmount: { $sum: '$paidAmount' },
              dueAmount: { $sum: '$dueAmount' }
            }
          }
        ]);

        return {
          ...client.toObject(),
          hasLoginAccount: !!hasLoginAccount,
          projectCount,
          paymentStats: paymentStats[0] || { totalAmount: 0, paidAmount: 0, dueAmount: 0 }
        };
      } catch (error) {
        console.error(`Error getting stats for client ${client._id}:`, error);
        return {
          ...client.toObject(),
          hasLoginAccount: false,
          projectCount: 0,
          paymentStats: { totalAmount: 0, paidAmount: 0, dueAmount: 0 }
        };
      }
    }));

    console.log('✅ Successfully fetched clients:', clientsWithStats.length);

    res.json({
      success: true,
      clients: clientsWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total: total,
        limit: parseInt(limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Get all clients error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch clients', 
      error: error.message 
    });
  }
};

// Get client by ID with complete details
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Getting client by ID:', id);

    // Find client
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }

    // Check if client has login account
    const hasLoginAccount = await User.exists({ 
      role: 'client', 
      clientId: client._id 
    });

    // Get client's projects with employee details
    const projects = await Project.find({ client: client._id })
      .populate('assignedEmployees.employee', 'name designation email phone')
      .sort({ createdAt: -1 });
    
    // Get client's payments
    const payments = await Payment.find({ client: client._id })
      .populate('project', 'projectName')
      .sort({ createdAt: -1 });

    console.log('✅ Successfully fetched client details');

    res.json({
      success: true,
      client: {
        ...client.toObject(),
        hasLoginAccount: !!hasLoginAccount
      },
      projects,
      payments,
      stats: {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'in-progress').length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        totalDomains: client.domains?.length || 0,
        totalHosting: client.hosting?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ Get client by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch client details', 
      error: error.message 
    });
  }
};

// Create new client - FIXED VERSION
const createClient = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      companyName,
      contactPerson,
      email,
      phone,
      address,
      notes,
      domains = [],
      hosting = [],
      // User creation data
      userName,
      userPassword
    } = req.body;

    console.log('🔄 Creating new client with user account...');
    console.log('Client data:', { companyName, contactPerson, email, phone });
    console.log('User data:', { userName, userPassword: userPassword ? '[PROVIDED]' : '[NOT PROVIDED]' });

    // Validation
    if (!companyName || !contactPerson || !email || !phone) {
      throw new Error('Company name, contact person, email, and phone are required');
    }

    if (!userName || !userPassword) {
      throw new Error('User name and password are required for client account');
    }

    // Check if email already exists
    const existingClient = await Client.findOne({ email: email.toLowerCase() }).session(session);
    if (existingClient) {
      throw new Error('Client with this email already exists');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() }).session(session);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Step 1: Create User first (without clientId)
    const userData = {
      name: userName.trim(),
      email: email.toLowerCase().trim(),
      password: userPassword,
      role: 'client'
      // Don't set clientId yet - will update after client creation
    };

    const user = new User(userData);
    const savedUser = await user.save({ session });
    console.log('✅ Step 1: User created with ID:', savedUser._id);

    // Step 2: Create Client with user reference
    const clientData = {
      user: savedUser._id, // Reference to user
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address?.trim() || '',
      notes: notes?.trim() || '',
      domains: domains || [],
      hosting: hosting || []
    };

    const client = new Client(clientData);
    const savedClient = await client.save({ session });
    console.log('✅ Step 2: Client created with ID:', savedClient._id, 'ClientID:', savedClient.clientId);

    // Step 3: Update user with client information
    await User.findByIdAndUpdate(
      savedUser._id,
      {
        clientId: savedClient._id,
        clientInfo: {
          _id: savedClient._id,
          companyName: savedClient.companyName,
          clientId: savedClient.clientId
        }
      },
      { session }
    );
    console.log('✅ Step 3: User updated with client information');

    // Commit transaction
    await session.commitTransaction();
    console.log('✅ Transaction committed successfully');

    // Fetch complete client data
    const populatedClient = await Client.findById(savedClient._id)
      .populate('user', 'name email role isActive');

    res.status(201).json({
      success: true,
      message: 'Client and user account created successfully',
      client: populatedClient
    });

  } catch (error) {
    // Rollback transaction
    await session.abortTransaction();
    console.error('❌ Client creation failed:', error.message);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create client',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    session.endSession();
  }
};

// Update client
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log('🔄 Updating client with ID:', id, 'Data:', updateData);

    // Find existing client
    const existingClient = await Client.findById(id);
    if (!existingClient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }

    // Check if email is being changed and if new email already exists
    if (updateData.email && updateData.email.toLowerCase() !== existingClient.email) {
      const emailExists = await Client.findOne({ 
        email: updateData.email.toLowerCase(), 
        _id: { $ne: id } 
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Client with this email already exists'
        });
      }
    }

    // Prepare update data
    const sanitizedUpdateData = {};
    if (updateData.companyName) sanitizedUpdateData.companyName = updateData.companyName.trim();
    if (updateData.contactPerson) sanitizedUpdateData.contactPerson = updateData.contactPerson.trim();
    if (updateData.email) sanitizedUpdateData.email = updateData.email.toLowerCase().trim();
    if (updateData.phone) sanitizedUpdateData.phone = updateData.phone.trim();
    if (updateData.address !== undefined) sanitizedUpdateData.address = updateData.address.trim();
    if (updateData.notes !== undefined) sanitizedUpdateData.notes = updateData.notes.trim();
    if (updateData.status) sanitizedUpdateData.status = updateData.status;
    if (updateData.domains) sanitizedUpdateData.domains = updateData.domains;
    if (updateData.hosting) sanitizedUpdateData.hosting = updateData.hosting;

    // Update client
    const client = await Client.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query' 
      }
    );

    console.log('✅ Client updated successfully');

    res.json({ 
      success: true,
      message: 'Client updated successfully', 
      client 
    });
  } catch (error) {
    console.error('❌ Update client error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: validationErrors,
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update client', 
      error: error.message 
    });
  }
};

// Delete client
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Deleting client with ID:', id);

    // Find client
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }

    // Check if client has active projects
    const activeProjects = await Project.countDocuments({ 
      client: id, 
      status: { $in: ['planning', 'in-progress'] } 
    });
    
    if (activeProjects > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete client with active projects. Please complete or cancel projects first.'
      });
    }

    // Delete associated user account
    await User.findOneAndDelete({ clientId: client._id });
    console.log('✅ Associated user account deleted');

    // Delete client
    await Client.findByIdAndDelete(id);
    console.log('✅ Client deleted successfully');

    res.json({ 
      success: true,
      message: 'Client deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete client error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete client', 
      error: error.message 
    });
  }
};

// Get upcoming domain/hosting expiries
const getUpcomingExpiries = async (req, res) => {
  try {
    const { days = 30, type = '' } = req.query;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + parseInt(days));

    console.log('🔄 Getting upcoming expiries for', days, 'days');

    // Build query based on type
    let matchQuery = {};
    if (type === 'domain') {
      matchQuery = { 'domains.expiryDate': { $lte: targetDate, $gte: new Date() } };
    } else if (type === 'hosting') {
      matchQuery = { 'hosting.expiryDate': { $lte: targetDate, $gte: new Date() } };
    } else {
      matchQuery = {
        $or: [
          { 'domains.expiryDate': { $lte: targetDate, $gte: new Date() } },
          { 'hosting.expiryDate': { $lte: targetDate, $gte: new Date() } }
        ]
      };
    }

    const clients = await Client.find(matchQuery);
    const expiries = [];
    const currentDate = new Date();

    clients.forEach(client => {
      // Process domains
      if (client.domains && client.domains.length > 0) {
        client.domains.forEach(domain => {
          const expiryDate = new Date(domain.expiryDate);
          if (expiryDate <= targetDate && expiryDate >= currentDate) {
            const daysLeft = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
            expiries.push({
              client: {
                id: client._id,
                name: client.companyName,
                email: client.email,
                contactPerson: client.contactPerson
              },
              type: 'domain',
              name: domain.domainName,
              provider: domain.provider || 'N/A',
              expiryDate: domain.expiryDate,
              daysLeft,
              status: daysLeft <= 0 ? 'expired' : daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'urgent' : 'warning'
            });
          }
        });
      }
      
      // Process hosting
      if (client.hosting && client.hosting.length > 0) {
        client.hosting.forEach(hosting => {
          const expiryDate = new Date(hosting.expiryDate);
          if (expiryDate <= targetDate && expiryDate >= currentDate) {
            const daysLeft = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
            expiries.push({
              client: {
                id: client._id,
                name: client.companyName,
                email: client.email,
                contactPerson: client.contactPerson
              },
              type: 'hosting',
              name: hosting.provider,
              plan: hosting.plan || 'N/A',
              expiryDate: hosting.expiryDate,
              daysLeft,
              status: daysLeft <= 0 ? 'expired' : daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'urgent' : 'warning'
            });
          }
        });
      }
    });

    // Sort by expiry date (most urgent first)
    expiries.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    console.log('✅ Successfully fetched expiries:', expiries.length);

    res.json({
      success: true,
      expiries,
      summary: {
        total: expiries.length,
        expired: expiries.filter(e => e.status === 'expired').length,
        critical: expiries.filter(e => e.status === 'critical').length,
        urgent: expiries.filter(e => e.status === 'urgent').length,
        warning: expiries.filter(e => e.status === 'warning').length
      }
    });
  } catch (error) {
    console.error('❌ Get upcoming expiries error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch upcoming expiries', 
      error: error.message 
    });
  }
};

// Get client statistics
const getClientStats = async (req, res) => {
  try {
    console.log('🔄 Getting client statistics');

    const totalClients = await Client.countDocuments();
    const activeClients = await Client.countDocuments({ status: 'active' });
    const inactiveClients = await Client.countDocuments({ status: 'inactive' });
    const suspendedClients = await Client.countDocuments({ status: 'suspended' });

    // Get growth statistics
    const currentDate = new Date();
    const newThisMonth = await Client.countDocuments({
      createdAt: { $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1) }
    });

    console.log('✅ Successfully fetched client statistics');

    res.json({
      success: true,
      stats: {
        clients: {
          total: totalClients,
          active: activeClients,
          inactive: inactiveClients,
          suspended: suspendedClients
        },
        growth: {
          newThisMonth
        }
      }
    });
  } catch (error) {
    console.error('❌ Get client stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch client statistics', 
      error: error.message 
    });
  }
};

// Debug: Log all functions being exported
console.log('🔍 Exporting Client Controller Functions:');
console.log('getAllClients:', typeof getAllClients);
console.log('getClientById:', typeof getClientById);
console.log('createClient:', typeof createClient);
console.log('updateClient:', typeof updateClient);
console.log('deleteClient:', typeof deleteClient);
console.log('getUpcomingExpiries:', typeof getUpcomingExpiries);
console.log('getClientStats:', typeof getClientStats);

// IMPORTANT: Make sure all functions are properly exported
module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getUpcomingExpiries,
  getClientStats
};
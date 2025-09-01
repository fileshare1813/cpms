const Message = require('../models/Message');
const User = require('../models/User');
const Client = require('../models/Client');
const mongoose = require('mongoose');

// Helper function to find client user
const findClientUser = async (clientId) => {
  try {
    console.log('🔍 Finding user for client ID:', clientId);
    
    // Method 1: Client has direct user reference
    const clientWithUser = await Client.findById(clientId).populate('user', '_id');
    if (clientWithUser && clientWithUser.user) {
      console.log('✅ Method 1: Found user via client.user field');
      return clientWithUser.user._id;
    }
    
    // Method 2: Find user by clientId field  
    const userByClientId = await User.findOne({ 
      clientId: clientId,
      role: 'client'
    });
    if (userByClientId) {
      console.log('✅ Method 2: Found user via clientId field');
      return userByClientId._id;
    }
    
    // Method 3: Find user by clientInfo._id
    const userByClientInfo = await User.findOne({ 
      'clientInfo._id': mongoose.Types.ObjectId(clientId),
      role: 'client'
    });
    if (userByClientInfo) {
      console.log('✅ Method 3: Found user via clientInfo._id');
      return userByClientInfo._id;
    }
    
    // Method 4: Find by email matching
    const client = await Client.findById(clientId);
    if (client && client.email) {
      const userByEmail = await User.findOne({ 
        email: client.email, 
        role: 'client' 
      });
      if (userByEmail) {
        console.log('✅ Method 4: Found user via email matching');
        return userByEmail._id;
      }
    }
    
    console.log('❌ No user found for client ID:', clientId);
    return null;
  } catch (error) {
    console.error('❌ Error in findClientUser:', error);
    return null;
  }
};

// GET /api/messages - Get all messages with filters (ADMIN FIXED)
const getAllMessages = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      clientId = '', 
      status = '', 
      messageType = '',
      priority = '',
      search = ''
    } = req.query;

    console.log('📄 Getting all messages with params:', { 
      page, limit, clientId, status, messageType, 
      userRole: req.user.role,
      userId: req.user._id
    });

    // Build filter object
    let filter = {};
    
    // FIXED: Role-based filtering
    if (req.user.role === 'client') {
      // Client can see messages where they are sender/recipient OR related to their client record
      filter.$or = [
        { sender: req.user._id },
        { recipient: req.user._id }
      ];
      
      // Also include messages related to their client record
      if (req.user.clientId) {
        filter.$or.push({ client: req.user.clientId });
      }
    } else if (req.user.role === 'employee') {
      // Employee can see messages where they are sender/recipient
      filter.$or = [
        { sender: req.user._id },
        { recipient: req.user._id }
      ];
    }
    // ADMIN CAN SEE ALL MESSAGES - NO FILTER APPLIED FOR ADMIN
    
    // Additional filters
    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.client = clientId;
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (messageType) {
      filter.messageType = messageType;
    }
    
    if (priority) {
      filter.priority = priority;
    }
    
    if (search) {
      const searchFilter = {
        $or: [
          { subject: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } }
        ]
      };
      
      // Combine with existing filter
      if (filter.$or && Object.keys(filter).length > 1) {
        filter = { $and: [filter, searchFilter] };
      } else if (Object.keys(filter).length > 0) {
        filter = { ...filter, ...searchFilter };
      } else {
        filter = searchFilter;
      }
    }

    console.log('🔍 Final message filter for', req.user.role + ':', JSON.stringify(filter, null, 2));

    const messages = await Message.find(filter)
      .populate('sender', 'name role email')
      .populate('recipient', 'name role email')
      .populate('client', 'companyName clientId contactPerson')
      .populate('project', 'projectName projectId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments(filter);

    console.log(`✅ Successfully fetched ${messages.length} messages for ${req.user.role} (total: ${total})`);

    // Debug: Log first few messages for admin
    if (req.user.role === 'admin' && messages.length > 0) {
      console.log('📋 Sample messages for admin:');
      messages.slice(0, 3).forEach((msg, idx) => {
        console.log(`  ${idx + 1}. ${msg.subject} from ${msg.sender?.name} (${msg.sender?.role}) to ${msg.recipient?.name} (${msg.recipient?.role})`);
      });
    }

    res.json({ 
      success: true,
      messages, 
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit), 
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Get all messages error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch messages', 
      error: error.message 
    });
  }
};

// POST /api/messages - Send new message (ENHANCED FOR EMPLOYEE-CLIENT MESSAGING)
const sendMessage = async (req, res) => {
  try {
    const {
      recipient,
      client,
      project,
      subject,
      message,
      messageType = 'general',
      priority = 'medium'
    } = req.body;

    console.log('📄 Sending new message:', { 
      sender: req.user._id, 
      senderRole: req.user.role,
      recipient, 
      subject, 
      messageType,
      clientId: req.user.clientId,
      employeeId: req.user.employeeId,
      clientParam: client
    });

    // Validation
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    if (subject.trim().length === 0 || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message cannot be empty'
      });
    }

    // Auto-determine recipient if not provided
    let recipientId = recipient;
    
    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      // For CLIENT and EMPLOYEE sending to ADMIN
      if ((req.user.role === 'client' || req.user.role === 'employee') && !client) {
        console.log(`🔍 Looking for admin user for ${req.user.role}...`);
        const adminUser = await User.findOne({ 
          role: 'admin'
        }).select('_id name email');
        
        if (adminUser) {
          recipientId = adminUser._id;
          console.log('✅ Found admin recipient:', adminUser.name, adminUser._id);
        } else {
          console.log('❌ No admin user found');
          return res.status(404).json({
            success: false,
            message: 'No admin user available to receive messages'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Valid recipient is required'
        });
      }
    }

    // Handle special case where frontend couldn't find client user
    if (recipientId === 'CLIENT_USER_TO_BE_FOUND' && client) {
      console.log('🔍 Backend: Finding client user for client ID:', client);
      const clientUserId = await findClientUser(client);
      if (clientUserId) {
        recipientId = clientUserId;
        console.log('✅ Backend: Found client user:', recipientId);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Client user account not found. Please contact admin to create a user account for this client.'
        });
      }
    }

    // If client ID is provided (employee messaging client), find client's user
    if (client && mongoose.Types.ObjectId.isValid(client)) {
      console.log('🔍 Finding client user for client ID:', client);
      const clientUserId = await findClientUser(client);
      
      if (clientUserId) {
        recipientId = clientUserId;
        console.log('✅ Found client user ID:', recipientId);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Client user not found or client does not have a user account'
        });
      }
    }

    // Verify recipient exists
    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found'
      });
    }

    // Determine client ID for message
    let clientIdForMessage = client;
    if (req.user.role === 'client' && req.user.clientId) {
      clientIdForMessage = req.user.clientId;
      console.log('🏢 Using client ID from user:', clientIdForMessage);
    }

    console.log('🔨 Creating message with data:', {
      sender: req.user._id,
      senderRole: req.user.role,
      recipient: recipientId,
      recipientRole: recipientUser.role,
      client: clientIdForMessage,
      subject: subject.trim(),
      messageType,
      priority
    });

    // Create new message
    const newMessage = new Message({
      sender: req.user._id,
      recipient: recipientId,
      client: clientIdForMessage || undefined,
      project: project || undefined,
      subject: subject.trim(),
      message: message.trim(),
      messageType,
      priority,
      status: 'unread'
    });

    const savedMessage = await newMessage.save();
    console.log('✅ Message saved with ID:', savedMessage._id);
    
    // Populate the saved message
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name role email')
      .populate('recipient', 'name role email')
      .populate('client', 'companyName clientId')
      .populate('project', 'projectName projectId');

    console.log(`✅ Message sent successfully from ${req.user.role} to ${recipientUser.role}`);

    res.status(201).json({ 
      success: true, 
      message: 'Message sent successfully', 
      data: populatedMessage
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    
    // Handle specific mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message', 
      error: error.message 
    });
  }
};

// GET /api/messages/:id - Get message by ID
const getMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID format'
      });
    }

    const message = await Message.findById(id)
      .populate('sender', 'name role email')
      .populate('recipient', 'name role email')
      .populate('client', 'companyName clientId')
      .populate('project', 'projectName projectId')
      .populate('replyTo');

    if (!message) {
      return res.status(404).json({ 
        success: false, 
        message: 'Message not found' 
      });
    }

    // Check if user has permission to view this message
    const canView = req.user.role === 'admin' || 
                   message.sender._id.toString() === req.user._id.toString() ||
                   message.recipient._id.toString() === req.user._id.toString() ||
                   (req.user.role === 'client' && req.user.clientId && 
                    message.client && message.client._id.toString() === req.user.clientId.toString());

    if (!canView) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to view this message' 
      });
    }

    res.json({ 
      success: true, 
      message 
    });
  } catch (error) {
    console.error('❌ Get message by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch message', 
      error: error.message 
    });
  }
};

// PUT /api/messages/:id/read - Mark message as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID format'
      });
    }

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        message: 'Message not found' 
      });
    }

    // Check if user is the recipient or admin
    const canMarkRead = message.recipient.toString() === req.user._id.toString() || 
                        req.user.role === 'admin';

    if (!canMarkRead) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only mark your own messages as read' 
      });
    }

    if (message.status !== 'unread') {
      return res.json({ 
        success: true, 
        message: 'Message already marked as read' 
      });
    }

    await message.markAsRead();

    res.json({ 
      success: true, 
      message: 'Message marked as read' 
    });
  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark message as read', 
      error: error.message 
    });
  }
};

// POST /api/messages/:id/reply - Reply to message
const replyMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message: replyText } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID format'
      });
    }

    if (!replyText || !replyText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required'
      });
    }

    const originalMessage = await Message.findById(id);
    if (!originalMessage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Original message not found' 
      });
    }

    // Create reply
    const reply = originalMessage.createReply({
      sender: req.user._id,
      subject: `Re: ${originalMessage.subject}`,
      message: replyText.trim(),
      messageType: originalMessage.messageType,
      priority: originalMessage.priority
    });

    await reply.save();

    // Mark original message as replied
    originalMessage.status = 'replied';
    originalMessage.repliedAt = new Date();
    await originalMessage.save();

    // Populate the reply
    const populatedReply = await Message.findById(reply._id)
      .populate('sender', 'name role email')
      .populate('recipient', 'name role email')
      .populate('client', 'companyName clientId')
      .populate('project', 'projectName projectId');

    console.log('✅ Reply sent successfully');

    res.json({ 
      success: true, 
      message: 'Reply sent successfully', 
      data: populatedReply
    });
  } catch (error) {
    console.error('❌ Reply message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send reply', 
      error: error.message 
    });
  }
};

// GET /api/messages/stats - Get message statistics
const getMessageStats = async (req, res) => {
  try {
    console.log('📄 Getting message statistics for user:', req.user.role, req.user._id);

    let filter = {};
    
    // Role-based filtering for stats
    if (req.user.role === 'client') {
      filter.$or = [
        { sender: req.user._id },
        { recipient: req.user._id }
      ];
      
      if (req.user.clientId) {
        filter.$or.push({ client: req.user.clientId });
      }
    } else if (req.user.role === 'employee') {
      filter.$or = [
        { sender: req.user._id },
        { recipient: req.user._id }
      ];
    }
    // Admin sees all messages - no filter

    const [
      totalMessages,
      unreadMessages,
      sentMessages,
      receivedMessages
    ] = await Promise.all([
      Message.countDocuments(filter),
      Message.countDocuments({ 
        ...filter, 
        status: 'unread',
        recipient: req.user._id 
      }),
      Message.countDocuments({ ...filter, sender: req.user._id }),
      Message.countDocuments({ ...filter, recipient: req.user._id })
    ]);

    // Get message type distribution
    const messageTypeStats = await Message.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$messageType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log(`✅ Successfully fetched message statistics for ${req.user.role}`);

    res.json({
      success: true,
      stats: {
        total: totalMessages,
        unread: unreadMessages,
        sent: sentMessages,
        received: receivedMessages,
        messageTypes: messageTypeStats
      }
    });
  } catch (error) {
    console.error('❌ Get message stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch message statistics', 
      error: error.message 
    });
  }
};

// GET /api/messages/admin-users - Get admin users for messaging
const getAdminUsers = async (req, res) => {
  try {
    console.log('🔍 Getting admin users...');
    
    const adminUsers = await User.find({ 
      role: 'admin'
    })
    .select('_id name email')
    .limit(10);

    console.log(`✅ Found ${adminUsers.length} admin users`);

    res.json({
      success: true,
      admins: adminUsers
    });
  } catch (error) {
    console.error('❌ Get admin users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch admin users', 
      error: error.message 
    });
  }
};

// Export all functions
module.exports = { 
  getAllMessages, 
  getMessageById, 
  sendMessage, 
  markAsRead, 
  replyMessage,
  getMessageStats,
  getAdminUsers
};
const Payment = require('../models/Payment');
const Client = require('../models/Client');
const Project = require('../models/Project');
const mongoose = require('mongoose');

// GET /api/payments - Get all payments
const getAllPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      client = '',
      project = '',
      paymentMethod = ''
    } = req.query;

    console.log('🔄 Getting all payments with params:', { page, limit, search, status, client });

    // Build filter object
    let filter = {};
    
    // Role-based filtering
    if (req.user.role === 'client' && req.user.clientId) {
      filter.client = req.user.clientId;
    }
    // Admin and employee can see all payments
    
    // Additional filters
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) filter.paymentStatus = status;
    if (client && mongoose.Types.ObjectId.isValid(client)) filter.client = client;
    if (project && mongoose.Types.ObjectId.isValid(project)) filter.project = project;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const payments = await Payment.find(filter)
      .populate('client', 'companyName clientId contactPerson email')
      .populate('project', 'projectName projectId serviceType')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(filter);

    console.log('✅ Successfully fetched payments:', payments.length);

    res.json({
      success: true,
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
};

// GET /api/payments/:id - Get payment by ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format'
      });
    }

    const payment = await Payment.findById(id)
      .populate('client', 'companyName clientId contactPerson email phone')
      .populate('project', 'projectName projectId serviceType budget');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check permissions
    const canView = req.user.role === 'admin' || 
                   (req.user.role === 'client' && payment.client._id.toString() === req.user.clientId.toString());

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this payment'
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('❌ Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: error.message
    });
  }
};

// POST /api/payments - Create new payment (FIXED)
const createPayment = async (req, res) => {
  try {
    const paymentData = req.body;
    console.log('🔄 Creating new payment:', paymentData);

    // Validation
    const requiredFields = ['client', 'project', 'description', 'totalAmount', 'dueDate'];
    const missingFields = requiredFields.filter(field => !paymentData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate client exists
    if (!mongoose.Types.ObjectId.isValid(paymentData.client)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID format'
      });
    }

    const client = await Client.findById(paymentData.client);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Validate project exists
    if (!mongoose.Types.ObjectId.isValid(paymentData.project)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format'
      });
    }

    const project = await Project.findById(paymentData.project);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Validate project belongs to client
    if (project.client.toString() !== paymentData.client) {
      return res.status(400).json({
        success: false,
        message: 'Project does not belong to the selected client'
      });
    }

    // Validate amounts
    const totalAmount = Number(paymentData.totalAmount);
    const paidAmount = Number(paymentData.paidAmount || 0);

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount must be greater than 0'
      });
    }

    if (paidAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Paid amount cannot be negative'
      });
    }

    if (paidAmount > totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Paid amount cannot be greater than total amount'
      });
    }

    // Validate due date
    const dueDate = new Date(paymentData.dueDate);
    if (isNaN(dueDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid due date format'
      });
    }

    // Create payment
    const payment = new Payment({
      client: paymentData.client,
      project: paymentData.project,
      description: paymentData.description.trim(),
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      paymentMethod: paymentData.paymentMethod || 'bank-transfer',
      dueDate: dueDate,
      paidDate: paidAmount > 0 && paymentData.paidDate ? new Date(paymentData.paidDate) : undefined,
      transactionId: paymentData.transactionId?.trim() || '',
      notes: paymentData.notes?.trim() || '',
      taxAmount: Number(paymentData.taxAmount || 0),
      discountAmount: Number(paymentData.discountAmount || 0),
      gstRate: Number(paymentData.gstRate || 18)
    });

    // Add to payment history if there's an initial payment
    if (paidAmount > 0) {
      payment.paymentHistory.push({
        amount: paidAmount,
        paymentDate: paymentData.paidDate ? new Date(paymentData.paidDate) : new Date(),
        paymentMethod: paymentData.paymentMethod || 'bank-transfer',
        transactionId: paymentData.transactionId?.trim() || '',
        notes: `Initial payment: ${paymentData.notes?.trim() || ''}`
      });
    }

    const savedPayment = await payment.save();
    
    // Populate the saved payment
    const populatedPayment = await Payment.findById(savedPayment._id)
      .populate('client', 'companyName clientId contactPerson email')
      .populate('project', 'projectName projectId serviceType');

    console.log('✅ Payment created successfully with invoice:', savedPayment.invoiceNumber);

    res.status(201).json({
      success: true,
      message: 'Payment record created successfully',
      payment: populatedPayment
    });
  } catch (error) {
    console.error('❌ Create payment error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create payment record',
      error: error.message
    });
  }
};

// PUT /api/payments/:id - Update payment
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🔄 Updating payment with ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format'
      });
    }

    const existingPayment = await Payment.findById(id);
    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Validate amounts if provided
    if (updateData.totalAmount !== undefined) {
      const totalAmount = Number(updateData.totalAmount);
      if (totalAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Total amount must be greater than 0'
        });
      }
    }

    if (updateData.paidAmount !== undefined) {
      const paidAmount = Number(updateData.paidAmount);
      const totalAmount = Number(updateData.totalAmount || existingPayment.totalAmount);
      
      if (paidAmount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Paid amount cannot be negative'
        });
      }

      if (paidAmount > totalAmount) {
        return res.status(400).json({
          success: false,
          message: 'Paid amount cannot be greater than total amount'
        });
      }
    }

    // Prepare update data
    const sanitizedUpdateData = {};
    if (updateData.description) sanitizedUpdateData.description = updateData.description.trim();
    if (updateData.totalAmount !== undefined) sanitizedUpdateData.totalAmount = Number(updateData.totalAmount);
    if (updateData.paidAmount !== undefined) sanitizedUpdateData.paidAmount = Number(updateData.paidAmount);
    if (updateData.paymentMethod) sanitizedUpdateData.paymentMethod = updateData.paymentMethod;
    if (updateData.dueDate) sanitizedUpdateData.dueDate = new Date(updateData.dueDate);
    if (updateData.paidDate) sanitizedUpdateData.paidDate = new Date(updateData.paidDate);
    if (updateData.transactionId !== undefined) sanitizedUpdateData.transactionId = updateData.transactionId.trim();
    if (updateData.notes !== undefined) sanitizedUpdateData.notes = updateData.notes.trim();
    if (updateData.taxAmount !== undefined) sanitizedUpdateData.taxAmount = Number(updateData.taxAmount);
    if (updateData.discountAmount !== undefined) sanitizedUpdateData.discountAmount = Number(updateData.discountAmount);
    if (updateData.gstRate !== undefined) sanitizedUpdateData.gstRate = Number(updateData.gstRate);

    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      { new: true, runValidators: true }
    )
    .populate('client', 'companyName clientId contactPerson email')
    .populate('project', 'projectName projectId serviceType');

    console.log('✅ Payment updated successfully');

    res.json({
      success: true,
      message: 'Payment updated successfully',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('❌ Update payment error:', error);
    
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
      message: 'Failed to update payment',
      error: error.message
    });
  }
};

// DELETE /api/payments/:id - Delete payment
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format'
      });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if payment can be deleted (only if no partial payments made)
    if (payment.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete payment record with partial payments. Please update instead.'
      });
    }

    await Payment.findByIdAndDelete(id);
    console.log('✅ Payment deleted successfully');

    res.json({
      success: true,
      message: 'Payment record deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment',
      error: error.message
    });
  }
};

// GET /api/payments/client/:clientId - Get payments by client
const getPaymentsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID format'
      });
    }

    const payments = await Payment.find({ client: clientId })
      .populate('client', 'companyName clientId')
      .populate('project', 'projectName projectId serviceType')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('❌ Get payments by client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client payments',
      error: error.message
    });
  }
};

// POST /api/payments/:id/add-payment - Add payment to existing record
const addPaymentToRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, transactionId, notes, paymentDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    if (payment.paidAmount + amount > payment.totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds remaining due amount'
      });
    }

    await payment.addPayment({
      amount: Number(amount),
      paymentMethod: paymentMethod || 'bank-transfer',
      transactionId: transactionId?.trim() || '',
      notes: notes?.trim() || '',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date()
    });

    const updatedPayment = await Payment.findById(id)
      .populate('client', 'companyName clientId')
      .populate('project', 'projectName projectId');

    res.json({
      success: true,
      message: 'Payment added successfully',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('❌ Add payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add payment',
      error: error.message
    });
  }
};

// GET /api/payments/stats - Get payment statistics
const getPaymentStats = async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments();
    const paidPayments = await Payment.countDocuments({ paymentStatus: 'paid' });
    const pendingPayments = await Payment.countDocuments({ paymentStatus: 'pending' });
    const overduePayments = await Payment.countDocuments({ paymentStatus: 'overdue' });

    // Calculate amounts
    const totalAmountStats = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          dueAmount: { $sum: '$dueAmount' }
        }
      }
    ]);

    const amounts = totalAmountStats[0] || { totalAmount: 0, paidAmount: 0, dueAmount: 0 };

    res.json({
      success: true,
      stats: {
        payments: {
          total: totalPayments,
          paid: paidPayments,
          pending: pendingPayments,
          overdue: overduePayments
        },
        amounts
      }
    });
  } catch (error) {
    console.error('❌ Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentsByClient,
  addPaymentToRecord,
  getPaymentStats
};

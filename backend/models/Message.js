const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    unique: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  messageType: {
    type: String,
    enum: {
      values: ['general', 'support', 'project-update', 'payment', 'urgent'],
      message: 'Message type must be one of: general, support, project-update, payment, urgent'
    },
    default: 'general'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be low, medium, or high'
    },
    default: 'medium'
  },
  status: {
    type: String,
    enum: {
      values: ['unread', 'read', 'replied'],
      message: 'Status must be unread, read, or replied'
    },
    default: 'unread'
  },
  attachments: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true }
  }],
  readAt: {
    type: Date
  },
  repliedAt: {
    type: Date
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ client: 1, createdAt: -1 });
messageSchema.index({ status: 1 });
messageSchema.index({ messageType: 1 });

// Pre-save middleware to generate unique message ID
messageSchema.pre('save', async function(next) {
  try {
    if (!this.messageId) {
      const count = await this.constructor.countDocuments();
      this.messageId = `MSG${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for message thread
messageSchema.virtual('isReply').get(function() {
  return !!this.replyTo;
});

// Virtual for formatted date
messageSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN');
});

// Static method to get unread count for user
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ 
    recipient: userId, 
    status: 'unread' 
  });
};

// Static method to get conversation between two users
messageSchema.statics.getConversation = function(user1Id, user2Id, limit = 50) {
  return this.find({
    $or: [
      { sender: user1Id, recipient: user2Id },
      { sender: user2Id, recipient: user1Id }
    ]
  })
  .populate('sender', 'name role')
  .populate('recipient', 'name role')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Instance method to mark as read
messageSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Instance method to reply
messageSchema.methods.createReply = function(replyData) {
  const Message = this.constructor;
  return new Message({
    ...replyData,
    replyTo: this._id,
    recipient: this.sender,
    client: this.client,
    project: this.project
  });
};

module.exports = mongoose.model('Message', messageSchema);
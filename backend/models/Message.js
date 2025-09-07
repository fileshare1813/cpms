const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
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
  subject: { 
    type: String, 
    required: [true, 'Subject is required'],
    trim: true,
    minlength: [3, 'Subject must be at least 3 characters'],
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: { 
    type: String, 
    required: [true, 'Message content is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters'],
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  messageType: { 
    type: String, 
    enum: {
      values: ['general', 'support', 'project-update', 'leave-request', 'project-status', 'clarification', 'delivery', 'urgent'],
      message: 'Invalid message type'
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
      message: 'Invalid message status'
    },
    default: 'unread' 
  },
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client'
    // Made optional - not required for all messages
  },
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project'
    // Made optional - not required for all messages
  },
  replyTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Message' 
  },
  readAt: { 
    type: Date 
  },
  repliedAt: { 
    type: Date 
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

// REMOVED: Pre-save middleware that was causing the duplicate key error
// The MongoDB _id field already serves as a unique identifier

// Virtual for message thread
messageSchema.virtual('isReply').get(function() {
  return !!this.replyTo;
});

// Virtual for formatted date
messageSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN');
});

// Virtual for display ID (using the MongoDB _id instead of custom messageId)
messageSchema.virtual('displayId').get(function() {
  return this._id.toString().slice(-6).toUpperCase();
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
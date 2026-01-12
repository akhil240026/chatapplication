const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Index for efficient sorting
  },
  socketId: {
    type: String,
    required: true
  },
  // Optional: Add room support for private chats
  room: {
    type: String,
    default: 'general',
    index: true
  },
  // Optional: Message type (text, image, file, etc.)
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries (room + timestamp)
messageSchema.index({ room: 1, timestamp: -1 });

// Virtual for formatted timestamp
messageSchema.virtual('formattedTime').get(function() {
  return this.timestamp.toLocaleTimeString();
});

// Static method to get recent messages
messageSchema.statics.getRecentMessages = function(room = 'general', limit = 50) {
  return this.find({ room })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean(); // Returns plain objects for better performance
};

// Instance method to check if message is recent (within last 5 minutes)
messageSchema.methods.isRecent = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.timestamp > fiveMinutesAgo;
};

module.exports = mongoose.model('Message', messageSchema);
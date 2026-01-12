const mongoose = require('mongoose');
const crypto = require('crypto');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Room name cannot exceed 50 characters'],
    match: [/^[a-z0-9-]+$/, 'Room name can only contain lowercase letters, numbers, and hyphens']
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  // Room privacy settings
  isPrivate: {
    type: Boolean,
    default: false
  },
  // For private rooms - invite code
  inviteCode: {
    type: String,
    sparse: true, // Only create index for non-null values
    unique: true
  },
  // For password-protected rooms
  password: {
    type: String,
    select: false // Don't include in queries by default
  },
  // Room creator
  createdBy: {
    type: String,
    required: true
  },
  // Room settings
  maxUsers: {
    type: Number,
    default: 100,
    min: 2,
    max: 500
  },
  // Room statistics
  messageCount: {
    type: Number,
    default: 0
  },
  userCount: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // Room members (for private rooms)
  members: [{
    username: String,
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin'],
      default: 'member'
    }
  }],
  // Room status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
roomSchema.index({ name: 1 });
roomSchema.index({ isPrivate: 1, isActive: 1 });
roomSchema.index({ inviteCode: 1 }, { sparse: true });
roomSchema.index({ createdBy: 1 });
roomSchema.index({ lastActivity: -1 });

// Generate invite code for private rooms
roomSchema.methods.generateInviteCode = function() {
  if (this.isPrivate) {
    this.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  return this.inviteCode;
};

// Check if user can join room
roomSchema.methods.canUserJoin = function(username, providedCode = null, providedPassword = null) {
  // Public rooms - anyone can join
  if (!this.isPrivate) {
    return { canJoin: true };
  }
  
  // Private rooms - check if user is already a member
  const isMember = this.members.some(member => member.username === username);
  if (isMember) {
    return { canJoin: true, reason: 'Already a member' };
  }
  
  // Check invite code
  if (this.inviteCode && providedCode === this.inviteCode) {
    return { canJoin: true, reason: 'Valid invite code' };
  }
  
  // Check password
  if (this.password && providedPassword === this.password) {
    return { canJoin: true, reason: 'Valid password' };
  }
  
  return { 
    canJoin: false, 
    reason: 'Private room - invite code or password required' 
  };
};

// Add user to room members
roomSchema.methods.addMember = function(username, role = 'member') {
  const existingMember = this.members.find(member => member.username === username);
  
  if (!existingMember) {
    this.members.push({
      username,
      role,
      joinedAt: new Date()
    });
    this.userCount = this.members.length;
  }
  
  return this.save();
};

// Remove user from room members
roomSchema.methods.removeMember = function(username) {
  this.members = this.members.filter(member => member.username !== username);
  this.userCount = this.members.length;
  return this.save();
};

// Update room activity
roomSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Static method to get public rooms
roomSchema.statics.getPublicRooms = function() {
  return this.find({ 
    isPrivate: false, 
    isActive: true 
  }).sort({ lastActivity: -1 });
};

// Static method to find room by invite code
roomSchema.statics.findByInviteCode = function(inviteCode) {
  return this.findOne({ 
    inviteCode: inviteCode.toUpperCase(), 
    isPrivate: true, 
    isActive: true 
  });
};

module.exports = mongoose.model('Room', roomSchema);
import mongoose from 'mongoose';

/**
 * Active Session Model for Single Active Session Management
 * Tracks active sessions for Vendor and Delivery Partner roles
 * Admin and Super Admin roles can have multiple concurrent sessions
 */
const activeSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    socketId: {
      type: String,
      default: null
    },

    // Device and browser information
    browser: {
      type: String,
      default: 'unknown'
    },

    platform: {
      type: String,
      default: 'unknown'
    },

    userAgent: {
      type: String,
      required: true
    },

    ipAddress: {
      type: String,
      required: true
    },

    // Session lifecycle tracking
    loginAt: {
      type: Date,
      default: Date.now,
      required: true
    },

    lastSeen: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },

    // Session status
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // Invalidation tracking
    invalidatedAt: {
      type: Date,
      default: null
    },

    invalidatedBy: {
      type: String,
      enum: ['new_login', 'logout', 'admin', 'system', 'security'],
      default: null
    },

    invalidationReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
activeSessionSchema.index({ userId: 1, isActive: 1 });
activeSessionSchema.index({ userId: 1, sessionId: 1 });

// TTL index to auto-cleanup old inactive sessions after 30 days
activeSessionSchema.index(
  { lastSeen: 1 },
  { 
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: { isActive: false }
  }
);

/**
 * Static Methods
 */

// Find active session by sessionId
activeSessionSchema.statics.findActiveSession = function(sessionId) {
  return this.findOne({
    sessionId,
    isActive: true
  });
};

// Find active session for user
activeSessionSchema.statics.findUserActiveSession = function(userId) {
  return this.findOne({
    userId,
    isActive: true
  }).sort({ loginAt: -1 });
};

// Get all active sessions for user (for multi-session roles like Admin)
activeSessionSchema.statics.getAllUserActiveSessions = function(userId) {
  return this.find({
    userId,
    isActive: true
  }).sort({ loginAt: -1 });
};

// Invalidate all user sessions
activeSessionSchema.statics.invalidateAllUserSessions = async function(
  userId,
  reason = 'security',
  by = 'system'
) {
  return this.updateMany(
    { userId, isActive: true },
    {
      $set: {
        isActive: false,
        invalidatedAt: new Date(),
        invalidatedBy: by,
        invalidationReason: reason
      }
    }
  );
};

// Cleanup old inactive sessions (for cron job)
activeSessionSchema.statics.cleanupOldSessions = async function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const result = await this.deleteMany({
    isActive: false,
    lastSeen: { $lt: cutoffDate }
  });
  return result.deletedCount;
};

/**
 * Instance Methods
 */

// Update last seen timestamp
activeSessionSchema.methods.updateLastSeen = function() {
  const lastSeen = new Date();
  this.lastSeen = lastSeen;

  return this.constructor.updateOne(
    { _id: this._id },
    { $set: { lastSeen } }
  );
};

// Invalidate this session
activeSessionSchema.methods.invalidate = function(
  reason = 'logout',
  by = 'user'
) {
  const update = {
    isActive: false,
    invalidatedAt: new Date(),
    invalidatedBy: by,
    invalidationReason: reason
  };

  Object.assign(this, update);

  return this.constructor.updateOne(
    { _id: this._id },
    { $set: update }
  );
};

// Update socket ID
activeSessionSchema.methods.updateSocketId = function(socketId) {
  const update = {
    socketId,
    lastSeen: new Date()
  };

  Object.assign(this, update);

  return this.constructor.updateOne(
    { _id: this._id },
    { $set: update }
  );
};

export default mongoose.model('ActiveSession', activeSessionSchema);

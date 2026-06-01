import mongoose from 'mongoose';

/**
 * Refresh Token Model for Secure Token Rotation
 * Implements OWASP token best practices
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    token: {
      type: String,
      required: true,
      unique: true, // unique already creates an index
    },

    // Token family for rotation detection
    family: {
      type: String,
      required: true,
      index: true
    },

    // Parent token for rotation chain tracking
    parentToken: {
      type: String,
      default: null
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true
    },

    // Security metadata
    deviceInfo: {
      deviceId: String,
      deviceName: String,
      browser: String,
      os: String,
      userAgent: String
    },

    ipAddress: {
      type: String,
      required: true
    },

    location: {
      country: String,
      city: String,
      region: String
    },

    // Revocation tracking
    isRevoked: {
      type: Boolean,
      default: false,
      index: true
    },

    revokedAt: {
      type: Date,
      default: null
    },

    revokedBy: {
      type: String,
      enum: ['user', 'admin', 'system', 'security', 'rotation_abuse'],
      default: null
    },

    revokedReason: {
      type: String,
      default: null
    },

    // Usage tracking for fraud detection
    lastUsedAt: {
      type: Date,
      default: null
    },

    usageCount: {
      type: Number,
      default: 0
    },

    // Reuse detection flag
    reuseDetected: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for cleanup
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for active token queries
refreshTokenSchema.index({ userId: 1, isRevoked: 1, expiresAt: 1 });

// Compound index for family-based revocation
refreshTokenSchema.index({ family: 1, isRevoked: 1 });

/**
 * Static Methods
 */

// Find active token
refreshTokenSchema.statics.findActiveToken = function(token) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  });
};

// Revoke token and entire family (rotation abuse detection)
refreshTokenSchema.statics.revokeFamily = async function(family, reason = 'rotation_abuse') {
  return this.updateMany(
    { family, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: 'security',
        revokedReason: reason
      }
    }
  );
};

// Revoke all user tokens (on password change, logout all, etc.)
refreshTokenSchema.statics.revokeAllUserTokens = async function(userId, reason = 'password_change') {
  return this.updateMany(
    { userId, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: 'user',
        revokedReason: reason
      }
    }
  );
};

// Get active tokens for user (for session management UI)
refreshTokenSchema.statics.getActiveUserTokens = function(userId) {
  return this.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  })
  .sort({ createdAt: -1 })
  .select('deviceInfo ipAddress location createdAt lastUsedAt')
  .lean();
};

// Cleanup expired tokens (run via cron)
refreshTokenSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isRevoked: true, revokedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 days old
    ]
  });
  return result.deletedCount;
};

/**
 * Instance Methods
 */

// Mark token as used
refreshTokenSchema.methods.markUsed = function() {
  this.lastUsedAt = new Date();
  this.usageCount += 1;
  return this.save();
};

// Revoke this token
refreshTokenSchema.methods.revoke = function(by = 'user', reason = 'manual_revocation') {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedBy = by;
  this.revokedReason = reason;
  return this.save();
};

export default mongoose.model('RefreshToken', refreshTokenSchema);

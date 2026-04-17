import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false, // 🔒 never return password by default
    },

    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'VENDOR', 'USER'],
      default: 'USER',
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      code: {
        type: String,
      },
      expiresAt: {
        type: Date,
      },
    },

    refreshToken: {
      type: String,
      select: false, // 🔒 do not expose refresh token
    },
  },
  {
    timestamps: true,
  }
);

/**
 * 🔥 GLOBAL QUERY FILTER
 * Automatically exclude soft-deleted users
 */
userSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

/**
 * 🔍 Indexes (Performance Optimization)
 */
userSchema.index({ email: 1 });
userSchema.index({ mobile: 1 });
userSchema.index({ companyId: 1 });

export default mongoose.model('User', userSchema);
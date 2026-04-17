import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'VENDOR', 'USER'],
      default: 'USER',
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      code: String,
      expiresAt: Date,
    },

    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
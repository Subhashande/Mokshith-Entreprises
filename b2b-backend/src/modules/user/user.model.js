import mongoose from 'mongoose';
import { ROLES } from '../../constants/roles.js';
import { USER_STATUS } from '../../constants/userStatus.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.B2B_CUSTOMER,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
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
      select: false,
    },

    addresses: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        addressLine: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],

    creditLimit: {
      type: Number,
      default: 50000,
      min: 0,
    },

    availableCredit: {
      type: Number,
      default: 50000,
      min: 0,
    },

    profileImage: String,
    phone: String,
    address: String,
    companyName: String,
    gstNumber: String,
  },
  { timestamps: true }
);

//  Soft delete filter
userSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export default mongoose.model('User', userSchema);
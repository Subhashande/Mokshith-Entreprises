import mongoose from 'mongoose';
import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../constants/paymentStatus.js';

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    totalWeight: {
      type: Number,
      default: 0,
    },

    requiresHeavyVehicle: {
      type: Boolean,
      default: false,
    },

    commissionRate: {
      type: Number,
      default: 0
    },

    commissionAmount: {
      type: Number,
      default: 0
    },

    paymentMethod: {
      type: String,
      enum: ['COD', 'ONLINE', 'CREDIT', 'RAZORPAY', 'UPI', 'CARD', 'HYBRID'],
      default: 'COD',
      required: true,
    },

    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Logistics',
    },

    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      required: true,
      index: true,
    },

    address: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },

    shippingAddress: {
      name: String,
      phone: String,
      addressLine: String,
      city: String,
      state: String,
      pincode: String,
    },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      required: true,
      index: true,
    },

    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true, // unique already creates an index
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

// 🔥 Compound indexes for common queries
orderSchema.index({ userId: 1, createdAt: -1 }); // User's orders sorted by date
orderSchema.index({ status: 1, createdAt: -1 }); // Orders by status and date
orderSchema.index({ paymentStatus: 1, status: 1 }); // Payment and order status
orderSchema.index({ userId: 1, status: 1 }); // User's orders by status

export default mongoose.model('Order', orderSchema);
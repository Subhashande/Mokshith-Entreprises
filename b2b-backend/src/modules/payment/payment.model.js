import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ['INITIATED', 'PENDING', 'SUCCESS', 'FAILED'],
      default: 'INITIATED',
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'COD', 'CREDIT', 'HYBRID'],
      default: 'ONLINE',
    },

    transactionId: {
      type: String,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true, // unique already creates an index
    },
    
    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

// 🔥 Compound indexes for payment queries
paymentSchema.index({ userId: 1, createdAt: -1 }); // User's payments sorted by date
paymentSchema.index({ status: 1, createdAt: -1 }); // Payments by status and date
paymentSchema.index({ orderId: 1, status: 1 }); // Order payments by status

export default mongoose.model('Payment', paymentSchema);
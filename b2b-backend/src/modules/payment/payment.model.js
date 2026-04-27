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
    },

    amount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ['INITIATED', 'PENDING', 'SUCCESS', 'FAILED'],
      default: 'INITIATED',
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
      sparse: true,
    },
    
    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
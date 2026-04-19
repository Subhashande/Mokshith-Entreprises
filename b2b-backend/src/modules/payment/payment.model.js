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
      enum: ['INITIATED', 'SUCCESS', 'FAILED'],
      default: 'INITIATED',
    },

    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'COD', 'CREDIT'],
      default: 'ONLINE',
    },

    transactionId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
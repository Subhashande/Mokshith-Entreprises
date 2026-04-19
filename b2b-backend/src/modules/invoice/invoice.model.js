import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // 🔥 one invoice per order
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

    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },

    fileUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Invoice', invoiceSchema);
import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    amount: Number,

    invoiceNumber: {
      type: String,
      unique: true,
    },

    fileUrl: String,
  },
  { timestamps: true }
);

export default mongoose.model('Invoice', invoiceSchema);
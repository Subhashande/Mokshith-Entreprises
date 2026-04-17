import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        quantity: Number,
      },
    ],

    totalAmount: Number,

    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
    },

    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED'],
      default: 'PENDING',
    },

    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
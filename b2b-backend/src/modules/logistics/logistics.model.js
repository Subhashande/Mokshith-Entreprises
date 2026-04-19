import mongoose from 'mongoose';

const logisticsSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },

    status: {
      type: String,
      enum: ['PENDING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'],
      default: 'PENDING',
    },

    trackingNumber: {
      type: String,
      unique: true,
    },

    estimatedDelivery: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Logistics', logisticsSchema);
import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },

    status: {
      type: String,
      enum: ['CREATED', 'IN_TRANSIT', 'DELIVERED'],
      default: 'CREATED',
    },

    trackingNumber: String,
  },
  { timestamps: true }
);

export default mongoose.model('Shipment', shipmentSchema);
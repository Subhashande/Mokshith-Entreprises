import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema(
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
      required: true,
    },

    status: {
      type: String,
      enum: ['CREATED', 'IN_TRANSIT', 'DELIVERED'],
      default: 'CREATED',
      index: true,
    },

    trackingNumber: {
      type: String,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Shipment', shipmentSchema);
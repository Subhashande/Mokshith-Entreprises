import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    version: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// 🔥 Prevent duplicate product in same warehouse
inventorySchema.index(
  { productId: 1, warehouseId: 1 },
  { unique: true }
);

export default mongoose.model('Inventory', inventorySchema);
import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    location: {
      address: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Warehouse', warehouseSchema);
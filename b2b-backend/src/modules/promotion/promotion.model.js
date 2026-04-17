import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },

    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
    },

    value: Number,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Promotion', promotionSchema);
import mongoose from 'mongoose';

const creditSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    creditLimit: {
      type: Number,
      default: 0,
    },

    usedCredit: {
      type: Number,
      default: 0,
    },

    availableCredit: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'BLOCKED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Credit', creditSchema);
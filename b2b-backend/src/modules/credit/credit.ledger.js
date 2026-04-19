import mongoose from 'mongoose';

const creditLedgerSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,

    type: {
      type: String,
      enum: ['DEBIT', 'CREDIT'],
    },

    amount: Number,

    description: String,
  },
  { timestamps: true }
);

export default mongoose.model('CreditLedger', creditLedgerSchema);
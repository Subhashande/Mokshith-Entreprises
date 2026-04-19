import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    entity: {
      type: String,
      required: true,
    },
    entityId: mongoose.Schema.Types.ObjectId,
    data: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model('Audit', auditSchema);
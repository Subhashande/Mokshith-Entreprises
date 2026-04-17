import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    action: String,
    entity: String,
    entityId: mongoose.Schema.Types.ObjectId,
    data: Object,
  },
  { timestamps: true }
);

export default mongoose.model('Audit', auditSchema);
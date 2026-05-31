import mongoose from 'mongoose';

/**
 * 🔒 PHASE 4: Refund tracking model
 * Tracks all refund operations with audit trail and idempotency
 */
const refundSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    refundType: {
      type: String,
      enum: ['FULL', 'PARTIAL'],
      required: true,
    },

    status: {
      type: String,
      enum: ['INITIATED', 'PROCESSING', 'SUCCESS', 'FAILED'],
      default: 'INITIATED',
      index: true,
    },

    razorpayRefundId: {
      type: String,
      unique: true,
      sparse: true, // unique already creates an index
    },

    razorpayPaymentId: {
      type: String,
      required: true,
      index: true,
    },

    reason: {
      type: String,
      maxlength: 500,
    },

    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Inventory restoration tracking
    inventoryRestored: {
      type: Boolean,
      default: false,
    },

    restoredItems: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      quantity: Number,
      restoredAt: Date,
    }],

    // Gateway response
    gatewayResponse: {
      type: Object,
      default: {},
    },

    // Error tracking
    errorDetails: {
      message: String,
      code: String,
      timestamp: Date,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'refunds',
  }
);

// Indexes for performance and idempotency
refundSchema.index({ orderId: 1, status: 1 });
refundSchema.index({ razorpayPaymentId: 1, status: 1 });
refundSchema.index({ createdAt: -1 });

// Virtual for checking if refund is complete
refundSchema.virtual('isComplete').get(function () {
  return this.status === 'SUCCESS' || this.status === 'FAILED';
});

// Method to mark as success
refundSchema.methods.markSuccess = function (razorpayRefundId, gatewayResponse) {
  this.status = 'SUCCESS';
  this.razorpayRefundId = razorpayRefundId;
  this.gatewayResponse = gatewayResponse;
  return this.save();
};

// Method to mark as failed
refundSchema.methods.markFailed = function (errorDetails) {
  this.status = 'FAILED';
  this.errorDetails = {
    message: errorDetails.message || 'Refund failed',
    code: errorDetails.code || 'REFUND_ERROR',
    timestamp: new Date(),
  };
  return this.save();
};

// Method to mark inventory as restored
refundSchema.methods.markInventoryRestored = function (restoredItems) {
  this.inventoryRestored = true;
  this.restoredItems = restoredItems.map(item => ({
    ...item,
    restoredAt: new Date(),
  }));
  return this.save();
};

const Refund = mongoose.model('Refund', refundSchema);

export default Refund;

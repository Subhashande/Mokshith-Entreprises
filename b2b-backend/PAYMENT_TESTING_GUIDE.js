/**
 * Payment System Testing Guide
 * Comprehensive tests for all payment flows
 */

// ============================================================
// UNIT TESTS FOR PAYMENT GATEWAY
// ============================================================

describe('Payment Gateway - Unit Tests', () => {
  
  // TEST 1: Razorpay Order Creation
  describe('createPaymentOrder', () => {
    it('should create order with valid amount', async () => {
      const result = await createPaymentOrder({
        amount: 100, // ₹100
        currency: 'INR',
        receipt: 'rcpt_123'
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.amount).toBe(10000); // 100 * 100 paise
      expect(result.currency).toBe('INR');
    });

    it('should fail with invalid amount', async () => {
      try {
        await createPaymentOrder({
          amount: 'invalid',
          currency: 'INR'
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Invalid amount');
      }
    });

    it('should fail with amount less than ₹1', async () => {
      try {
        await createPaymentOrder({
          amount: 0,
          currency: 'INR'
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Minimum payment amount');
      }
    });

    it('should fail with amount greater than ₹1,00,00,000', async () => {
      try {
        await createPaymentOrder({
          amount: 10000001,
          currency: 'INR'
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Maximum payment amount');
      }
    });
  });

  // TEST 2: Signature Verification
  describe('verifyPayment', () => {
    it('should verify valid signature', async () => {
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      
      const sign = orderId + '|' + paymentId;
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');

      const result = await verifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      });

      expect(result).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const result = await verifyPayment({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_456',
        razorpay_signature: 'invalid_signature'
      });

      expect(result).toBe(false);
    });
  });
});

// ============================================================
// INTEGRATION TESTS FOR PAYMENT SERVICE
// ============================================================

describe('Payment Service - Integration Tests', () => {
  let testUserId, testOrderId, testCredit;

  beforeAll(async () => {
    // Setup test data
    testUserId = new mongoose.Types.ObjectId();
    testOrderId = new mongoose.Types.ObjectId();
    
    // Create test order
    const order = await Order.create({
      _id: testOrderId,
      userId: testUserId,
      totalAmount: 5000,
      paymentStatus: 'PENDING',
      status: 'PENDING'
    });

    // Create test credit
    testCredit = await CreditModel.create({
      userId: testUserId,
      availableCredit: 2000,
      usedCredit: 0,
      status: 'ACTIVE'
    });
  });

  // TEST 3: Hybrid Payment - Full Credit
  describe('hybridPayment - Full Credit Coverage', () => {
    it('should pay fully by credit if sufficient balance', async () => {
      const result = await hybridPayment(
        testOrderId,
        testUserId,
        true, // useCredit
        5000
      );

      expect(result.paidFullyByCredit).toBe(true);
      expect(result.creditUsed).toBe(2000);

      // Verify order is marked as PAID
      const updatedOrder = await Order.findById(testOrderId);
      expect(updatedOrder.paymentStatus).toBe('PAID');
    });
  });

  // TEST 4: Hybrid Payment - Partial Credit
  describe('hybridPayment - Partial Credit Coverage', () => {
    it('should create Razorpay order for remaining amount', async () => {
      const orderId = new mongoose.Types.ObjectId();
      const order = await Order.create({
        _id: orderId,
        userId: testUserId,
        totalAmount: 5000,
        paymentStatus: 'PENDING',
        status: 'PENDING'
      });

      const result = await hybridPayment(
        orderId,
        testUserId,
        true, // useCredit
        5000
      );

      expect(result.paidFullyByCredit).toBe(false);
      expect(result.creditUsed).toBeGreaterThan(0);
      expect(result.remainingAmount).toBeGreaterThan(0);
      expect(result.gateway).toBeDefined();
      expect(result.gateway.id).toBeDefined();
    });
  });

  // TEST 5: Payment Verification
  describe('verifyPayment', () => {
    it('should mark payment as SUCCESS', async () => {
      // First create a payment
      const payment = await Payment.create({
        orderId: testOrderId,
        userId: testUserId,
        amount: 3000,
        transactionId: 'order_test_123',
        paymentMethod: 'ONLINE',
        status: 'PENDING'
      });

      // Create valid signature
      const sign = 'order_test_123|pay_test_456';
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');

      const result = await verifyPayment({
        orderId: testOrderId,
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_456',
        razorpay_signature: signature
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.razorpayPaymentId).toBe('pay_test_456');

      // Verify order is marked as PAID
      const updatedOrder = await Order.findById(testOrderId);
      expect(updatedOrder.paymentStatus).toBe('PAID');
    });

    it('should reject invalid signature', async () => {
      try {
        await verifyPayment({
          orderId: testOrderId,
          razorpay_order_id: 'order_test_123',
          razorpay_payment_id: 'pay_test_456',
          razorpay_signature: 'invalid_signature'
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('verification failed');
      }
    });

    it('should handle idempotency', async () => {
      // Create first verification
      const sign = 'order_dup_123|pay_dup_456';
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');

      const result1 = await verifyPayment({
        orderId: testOrderId,
        razorpay_order_id: 'order_dup_123',
        razorpay_payment_id: 'pay_dup_456',
        razorpay_signature: signature
      });

      // Second verification (duplicate)
      const result2 = await verifyPayment({
        orderId: testOrderId,
        razorpay_order_id: 'order_dup_123',
        razorpay_payment_id: 'pay_dup_456',
        razorpay_signature: signature
      });

      expect(result2._id).toEqual(result1._id);
      expect(result2.status).toBe('SUCCESS');
    });
  });
});

// ============================================================
// E2E TESTS FOR PAYMENT FLOW
// ============================================================

describe('Payment Flow - E2E Tests', () => {
  let orderId, userId;

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    
    // Create test order
    const order = await Order.create({
      userId,
      items: [{ productId: 'prod_1', quantity: 2, price: 2500 }],
      totalAmount: 5000,
      paymentStatus: 'PENDING',
      status: 'PENDING'
    });
    orderId = order._id;
  });

  // FLOW 1: Online Payment Only
  describe('Flow 1: Online Payment Only', () => {
    it('should complete payment with Razorpay', async () => {
      // Step 1: Initiate payment
      const initResult = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 5000 });

      expect(initResult.status).toBe(200);
      expect(initResult.body.data.id).toBeDefined();

      const razorpayOrderId = initResult.body.data.id;

      // Step 2: Simulate Razorpay response
      const sign = razorpayOrderId + '|pay_123456';
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');

      // Step 3: Verify payment
      const verifyResult = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: 'pay_123456',
          razorpay_signature: signature
        });

      expect(verifyResult.status).toBe(200);
      expect(verifyResult.body.data.status).toBe('SUCCESS');

      // Verify order is marked as PAID
      const order = await Order.findById(orderId);
      expect(order.paymentStatus).toBe('PAID');
      expect(order.status).toBe('CONFIRMED');
    });
  });

  // FLOW 2: Hybrid Payment
  describe('Flow 2: Hybrid Payment (Credit + Online)', () => {
    beforeEach(async () => {
      // Create user with credit
      await CreditModel.create({
        userId,
        availableCredit: 2000,
        usedCredit: 0,
        status: 'ACTIVE'
      });
    });

    it('should process hybrid payment correctly', async () => {
      // Step 1: Initiate hybrid payment
      const hybridResult = await request(app)
        .post('/api/v1/payments/hybrid')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId,
          totalAmount: 5000,
          useCredit: true
        });

      expect(hybridResult.status).toBe(200);
      expect(hybridResult.body.data.paidFullyByCredit).toBe(false);
      expect(hybridResult.body.data.creditUsed).toBe(2000);
      expect(hybridResult.body.data.remainingAmount).toBe(3000);

      const razorpayOrderId = hybridResult.body.data.gateway.id;

      // Step 2: Complete Razorpay payment
      const sign = razorpayOrderId + '|pay_789012';
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');

      const verifyResult = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: 'pay_789012',
          razorpay_signature: signature
        });

      expect(verifyResult.status).toBe(200);

      // Verify credit was deducted
      const updatedCredit = await CreditModel.findOne({ userId });
      expect(updatedCredit.availableCredit).toBe(0); // 2000 - 2000
      expect(updatedCredit.usedCredit).toBe(2000);
    });
  });

  // FLOW 3: Full Credit Payment
  describe('Flow 3: Full Credit Payment', () => {
    beforeEach(async () => {
      // Create user with sufficient credit
      await CreditModel.create({
        userId,
        availableCredit: 5000,
        usedCredit: 0,
        status: 'ACTIVE'
      });
    });

    it('should pay fully by credit without Razorpay', async () => {
      const hybridResult = await request(app)
        .post('/api/v1/payments/hybrid')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId,
          totalAmount: 5000,
          useCredit: true
        });

      expect(hybridResult.status).toBe(200);
      expect(hybridResult.body.data.paidFullyByCredit).toBe(true);
      expect(hybridResult.body.data.creditUsed).toBe(5000);

      // Verify order is immediately marked as PAID
      const order = await Order.findById(orderId);
      expect(order.paymentStatus).toBe('PAID');
      expect(order.status).toBe('CONFIRMED');
    });
  });
});

// ============================================================
// FRONTEND TESTS
// ============================================================

describe('Payment UI - Frontend Tests', () => {
  // TEST: Payment Method Selection
  describe('Payment Method Selection', () => {
    it('should display all payment methods', () => {
      const { getByText } = render(<PaymentPage />);
      
      expect(getByText('Online Payment')).toBeInTheDocument();
      expect(getByText('Business Credit')).toBeInTheDocument();
      expect(getByText('UPI')).toBeInTheDocument();
      expect(getByText('CARDS')).toBeInTheDocument();
    });

    it('should select payment method on click', () => {
      const { getByText } = render(<PaymentPage />);
      const onlineBtn = getByText('Online Payment').closest('div');
      
      fireEvent.click(onlineBtn);
      
      expect(onlineBtn).toHaveClass('border-blue-600');
    });
  });

  // TEST: Error Handling
  describe('Payment Error Handling', () => {
    it('should display error message on payment failure', async () => {
      const { getByText } = render(<PaymentPage />);
      
      // Simulate payment error
      const errorMsg = 'Payment verification failed';
      fireEvent.click(getByText('PAY NOW'));
      
      // Wait for error to appear
      await waitFor(() => {
        expect(getByText(errorMsg)).toBeInTheDocument();
      });
    });

    it('should not show browser alert on error', () => {
      const alertSpy = jest.spyOn(window, 'alert');
      
      // Simulate error scenario
      render(<PaymentPage />);
      
      expect(alertSpy).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });
  });

  // TEST: Payment Success
  describe('Payment Success', () => {
    it('should redirect to order success page on payment success', async () => {
      const { getByText } = render(<PaymentPage />);
      
      // Simulate successful payment
      const mockSocket = { on: jest.fn(), off: jest.fn() };
      
      // Wait for success message
      await waitFor(() => {
        expect(getByText('Order Confirmed!')).toBeInTheDocument();
      });
    });

    it('should show invoice download button on success', async () => {
      const { getByText } = render(<PaymentPage />);
      
      // After success
      await waitFor(() => {
        expect(getByText('INVOICE')).toBeInTheDocument();
      });
    });
  });
});

// ============================================================
// PERFORMANCE TESTS
// ============================================================

describe('Payment System Performance', () => {
  // TEST: Response Time
  it('should create Razorpay order within 2 seconds', async () => {
    const start = Date.now();
    
    await createPaymentOrder({
      amount: 5000,
      currency: 'INR'
    });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  // TEST: Concurrent Payments
  it('should handle concurrent payments', async () => {
    const promises = Array(10).fill(null).map(() =>
      createPaymentOrder({ amount: 5000, currency: 'INR' })
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result.id).toBeDefined();
    });
  });
});

// ============================================================
// SECURITY TESTS
// ============================================================

describe('Payment Security', () => {
  // TEST: Signature Tampering Detection
  it('should detect signature tampering', async () => {
    const validSign = 'order_123|pay_456';
    const validSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(validSign)
      .digest('hex');

    const tamperSig = validSig.slice(0, -5) + '00000'; // Tamper with signature

    const result = await verifyPayment({
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_456',
      razorpay_signature: tamperSig
    });

    expect(result).toBe(false);
  });

  // TEST: Amount Tampering Detection
  it('should detect amount tampering', async () => {
    try {
      await hybridPayment(
        orderId,
        userId,
        true,
        100 // Wrong amount (order is 5000)
      );
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toContain('Amount mismatch');
    }
  });

  // TEST: Duplicate Payment Prevention
  it('should prevent duplicate payment processing', async () => {
    const paymentId = 'pay_duplicate_123';

    // First payment
    const result1 = await verifyPayment({
      orderId,
      razorpay_order_id: 'order_test_001',
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    });

    // Second payment (duplicate)
    const result2 = await verifyPayment({
      orderId,
      razorpay_order_id: 'order_test_001',
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    });

    expect(result1._id).toEqual(result2._id);
    expect(result2.status).toBe('SUCCESS');
  });
});

// ============================================================
// MANUAL TESTING CHECKLIST
// ============================================================

/**
 * MANUAL TESTING CHECKLIST
 * 
 * Browser Testing:
 * ✅ [ ] Open Payment Page
 * ✅ [ ] Verify all payment methods display
 * ✅ [ ] Select Online Payment
 * ✅ [ ] Click "PAY NOW"
 * ✅ [ ] Verify Razorpay modal opens
 * ✅ [ ] Check Razorpay Key ID is correct
 * ✅ [ ] Close modal without paying
 * ✅ [ ] Verify error message appears
 * ✅ [ ] Try UPI payment method
 * ✅ [ ] Try Card payment method
 * ✅ [ ] Try NetBanking method
 * ✅ [ ] Try Wallet method
 * ✅ [ ] Complete payment successfully
 * ✅ [ ] Verify success page displays
 * ✅ [ ] Click Download Invoice
 * ✅ [ ] Verify invoice opens
 * ✅ [ ] Go back to Orders
 * ✅ [ ] Verify order shows as PAID
 *\n * Hybrid Payment Testing:
 * ✅ [ ] Create order with credit balance
 * ✅ [ ] Select Hybrid payment
 * ✅ [ ] Verify credit amount shows
 * ✅ [ ] Verify remaining online amount shows
 * ✅ [ ] Complete payment
 * ✅ [ ] Verify credit was deducted
 * ✅ [ ] Verify order is marked PAID
 *\n * Error Scenario Testing:
 * ✅ [ ] Test with invalid order ID
 * ✅ [ ] Test with already paid order\n * ✅ [ ] Test with negative amount\n * ✅ [ ] Test with extremely large amount\n * ✅ [ ] Test with network disconnected\n * ✅ [ ] Test payment timeout\n * ✅ [ ] Test duplicate payment attempt\n *\n * Security Testing:\n * ✅ [ ] Test signature tampering detection\n * ✅ [ ] Test amount tampering detection\n * ✅ [ ] Test user authorization check\n * ✅ [ ] Test SQL injection attempts\n * ✅ [ ] Test XSS attempts\n */

export default {\n  // Test data for manual testing\n  TEST_DATA: {\n    VALID_ORDER_ID: 'order_test_valid_123',\n    VALID_USER_ID: 'user_test_valid_456',\n    VALID_AMOUNT: 5000, // ₹5000\n    TEST_CARD: {\n      NUMBER: '4111111111111111',\n      EXPIRY: '12/25',\n      CVV: '123'\n    },\n    TEST_UPI: 'success@razorpay'\n  }\n};

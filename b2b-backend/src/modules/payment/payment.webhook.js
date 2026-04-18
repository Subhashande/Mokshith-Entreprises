import { verifyPayment } from './payment.service.js';

export const paymentWebhook = async (req, res) => {
  try {
    const payload = req.body;

    await verifyPayment(payload);

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};
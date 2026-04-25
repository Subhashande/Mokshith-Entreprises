import Razorpay from "razorpay";
import { env } from "./env.js";

// 🔐 VALIDATE RAZORPAY CREDENTIALS
if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
  console.error('❌ ERROR: Razorpay credentials not configured!');
  console.error('   Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  throw new Error('Razorpay credentials missing in environment variables');
}

console.log('✅ Razorpay initialized:', {
  keyId: env.RAZORPAY_KEY_ID.substring(0, 10) + '***',
  env: process.env.NODE_ENV
});

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

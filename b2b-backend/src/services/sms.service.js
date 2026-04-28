import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

// SMS service configuration
const SMS_ENABLED = env.SMS_ENABLED === 'true' || false;
const TWILIO_ACCOUNT_SID = env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

// Initialize Twilio if configured
if (SMS_ENABLED && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    const twilio = await import('twilio');
    twilioClient = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    logger.info('SMS service initialized with Twilio');
  } catch (err) {
    logger.error('Failed to initialize Twilio:', err.message);
  }
}

export const sendSMS = async ({ phone, message }) => {
  if (!SMS_ENABLED) {
    logger.warn('SMS service disabled - SMS_ENABLED not set');
    return { success: false, message: 'SMS service disabled' };
  }

  if (!twilioClient) {
    logger.error('SMS service not configured - missing Twilio credentials');
    throw new Error('SMS service not configured');
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: phone,
    });

    logger.info(`SMS sent to ${phone}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    logger.error('SMS send failed:', { phone, error: error.message });
    throw error;
  }
};
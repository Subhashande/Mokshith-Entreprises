import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { logger } from '../config/logger.js';

// Initialize Twilio client (only if credentials exist)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// Initialize SendGrid (email fallback)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Send OTP via SMS using Twilio
 * @param {string} mobile - Phone number with country code (e.g., +919876543210)
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<{success: boolean, provider: string}>}
 */
export const sendOTPViaSMS = async (mobile, otp) => {
  if (!twilioClient) {
    logger.warn('Twilio not configured, cannot send SMS OTP');
    throw new Error('SMS service not configured');
  }

  try {
    // Ensure mobile has country code
    const formattedMobile = mobile.startsWith('+') ? mobile : `+91${mobile}`;

    await twilioClient.messages.create({
      body: `Your verification code is: ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      to: formattedMobile,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    logger.info('OTP sent via SMS', { mobile: formattedMobile });
    return { success: true, provider: 'twilio' };
  } catch (error) {
    logger.error('Failed to send OTP via SMS', { 
      mobile, 
      error: error.message,
      code: error.code 
    });
    throw new Error(`SMS delivery failed: ${error.message}`);
  }
};

/**
 * Send OTP via Email using SendGrid
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<{success: boolean, provider: string}>}
 */
export const sendOTPViaEmail = async (email, otp) => {
  if (!process.env.SENDGRID_API_KEY) {
    logger.warn('SendGrid not configured, cannot send email OTP');
    throw new Error('Email service not configured');
  }

  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourapp.com',
      subject: 'Your Verification Code',
      text: `Your verification code is: ${otp}. Valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Verification Code</h2>
          <p>Use the following code to verify your account:</p>
          <h1 style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px;">
            ${otp}
          </h1>
          <p>This code will expire in 5 minutes.</p>
          <p><strong>Do not share this code with anyone.</strong></p>
        </div>
      `
    };

    await sgMail.send(msg);
    logger.info('OTP sent via email', { email });
    return { success: true, provider: 'sendgrid' };
  } catch (error) {
    logger.error('Failed to send OTP via email', { email, error: error.message });
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

/**
 * Smart OTP delivery - tries SMS first, falls back to email
 * @param {Object} user - User object with mobile and email
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<{success: boolean, provider: string, method: string}>}
 */
export const sendOTP = async (user, otp) => {
  const { mobile, email } = user;

  // Try SMS first if mobile exists and Twilio is configured
  if (mobile && twilioClient) {
    try {
      const result = await sendOTPViaSMS(mobile, otp);
      return { ...result, method: 'sms' };
    } catch (error) {
      logger.warn('SMS delivery failed, trying email fallback', { error: error.message });
    }
  }

  // Fallback to email if SMS failed or not available
  if (email) {
    try {
      const result = await sendOTPViaEmail(email, otp);
      return { ...result, method: 'email' };
    } catch (error) {
      logger.error('Both SMS and email OTP delivery failed', { error: error.message });
      throw new Error('Failed to deliver OTP via SMS or email');
    }
  }

  throw new Error('No valid mobile or email found for user');
};

/**
 * Check if OTP service is configured
 * @returns {Object} Service availability status
 */
export const getOTPServiceStatus = () => {
  return {
    sms: {
      available: !!twilioClient,
      provider: 'twilio'
    },
    email: {
      available: !!process.env.SENDGRID_API_KEY,
      provider: 'sendgrid'
    }
  };
};

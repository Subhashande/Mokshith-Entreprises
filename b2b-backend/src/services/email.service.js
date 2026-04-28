import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

// Email service configuration
const EMAIL_ENABLED = env.EMAIL_ENABLED === 'true' || false;
const SENDGRID_API_KEY = env.SENDGRID_API_KEY;

let sgMail = null;

// Initialize SendGrid if configured
if (EMAIL_ENABLED && SENDGRID_API_KEY) {
  try {
    const sendgrid = await import('@sendgrid/mail');
    sgMail = sendgrid.default;
    sgMail.setApiKey(SENDGRID_API_KEY);
    logger.info('Email service initialized with SendGrid');
  } catch (err) {
    logger.error('Failed to initialize SendGrid:', err.message);
  }
}

export const sendEmail = async ({ to, subject, message, html }) => {
  if (!EMAIL_ENABLED) {
    logger.warn('Email service disabled - EMAIL_ENABLED not set');
    return { success: false, message: 'Email service disabled' };
  }

  if (!sgMail) {
    logger.error('Email service not configured - missing SendGrid credentials');
    throw new Error('Email service not configured');
  }

  try {
    const msg = {
      to,
      from: env.EMAIL_FROM || 'noreply@b2b-platform.com',
      subject,
      text: message,
      html: html || message,
    };

    await sgMail.send(msg);
    logger.info(`Email sent to ${to}: ${subject}`);
    return { success: true };
  } catch (error) {
    logger.error('Email send failed:', { to, subject, error: error.message });
    throw error;
  }
};
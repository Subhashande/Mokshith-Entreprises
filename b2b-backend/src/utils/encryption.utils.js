import crypto from 'crypto';

export const hash = (data) =>
  crypto.createHash('sha256').update(data).digest('hex');
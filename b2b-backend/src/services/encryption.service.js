import crypto from 'crypto';

export const encrypt = (text) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.SECRET);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
};

export const decrypt = (text) => {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.SECRET);
  return decipher.update(text, 'hex', 'utf8') + decipher.final('utf8');
};
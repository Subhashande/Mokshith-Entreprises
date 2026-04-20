import bcrypt from 'bcryptjs';

export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
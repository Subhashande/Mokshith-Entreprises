import User from '../user/user.model.js';

export const findAllUsers = async () => {
  return User.find();
};

export const updateUserStatus = async (userId, status) => {
  return User.findByIdAndUpdate(
    userId,
    { status },
    { new: true }
  );
};
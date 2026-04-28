import Credit from './credit.model.js';

export const checkCreditLimits = async () => {
  const users = await Credit.find({
    availableCredit: { $lt: 100 },
  });

  users.forEach((u) => {
    console.log(` Low credit for user ${u.userId}`);
  });
};
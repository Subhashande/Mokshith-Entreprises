export const createQueue = (name) => {
  return {
    name,
    add: async (job) => {
      console.log(`Job added to ${name}`, job);
    },
  };
};
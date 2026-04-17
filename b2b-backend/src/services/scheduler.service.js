export const runJob = async (jobFn, interval) => {
  setInterval(async () => {
    try {
      await jobFn();
    } catch (err) {
      console.error('Scheduler error:', err.message);
    }
  }, interval);
};
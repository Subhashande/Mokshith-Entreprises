export const runScheduler = (jobFn, interval) => {
  setInterval(async () => {
    try {
      await jobFn();
    } catch (err) {
      console.error('Scheduler error:', err.message);
    }
  }, interval);
};
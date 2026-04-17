// Toggle this later when you add BullMQ
const USE_REAL_QUEUE = false;

let Queue;
let connection;

if (USE_REAL_QUEUE) {
  const bullmq = await import('bullmq');
  const redis = (await import('./redis.js')).default;

  Queue = bullmq.Queue;
  connection = redis;
}

export const createQueue = (name) => {
  // 🔥 DEV MODE (your current behavior)
  if (!USE_REAL_QUEUE) {
    return {
      name,
      add: async (job) => {
        console.log(`🧪 [DEV QUEUE] ${name}`, job);
      },
    };
  }

  // 🚀 PRODUCTION MODE (future)
  return new Queue(name, { connection });
};
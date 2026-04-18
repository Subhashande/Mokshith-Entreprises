const store = new Map();

export const idempotencyMiddleware = (req, res, next) => {
  const key = req.headers['idempotency-key'];

  if (!key) return next();

  if (store.has(key)) {
    return res.json(store.get(key));
  }

  const originalSend = res.json.bind(res);

  res.json = (body) => {
    store.set(key, body);
    return originalSend(body);
  };

  next();
};
import request from 'supertest';
import app from '../../src/app.js';

describe('Order API', () => {
  it('should create order', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', 'Bearer token');

    expect(res.statusCode).toBe(200);
  });
});
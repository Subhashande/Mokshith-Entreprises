import { mongoSanitizeMiddleware } from '../../src/middlewares/mongoSanitize.middleware.js';
import { jest } from '@jest/globals';

describe('mongoSanitizeMiddleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      originalUrl: '/test'
    };
    res = {};
    next = jest.fn();
  });

  test('should remove keys starting with $ from req.body', () => {
    req.body = {
      username: 'test',
      password: { $ne: null }
    };
    mongoSanitizeMiddleware(req, res, next);
    expect(req.body.username).toBe('test');
    expect(req.body.password.$ne).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  test('should remove keys containing . from req.query', () => {
    req.query = {
      'user.email': 'test@example.com',
      sort: 'name'
    };
    mongoSanitizeMiddleware(req, res, next);
    expect(req.query.sort).toBe('name');
    expect(req.query['user.email']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  test('should remove keys starting with $ from req.params', () => {
    req.params = {
      id: { $gt: 1 }
    };
    mongoSanitizeMiddleware(req, res, next);
    expect(req.params.id.$gt).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  test('should handle nested objects and arrays', () => {
    req.body = {
      filters: [
        { field: 'name', op: { $regex: '.*' } },
        { field: 'email', value: 'test@example.com' }
      ],
      nested: {
        attack: { $where: '1 == 1' },
        safe: 'data'
      }
    };
    mongoSanitizeMiddleware(req, res, next);
    expect(req.body.filters[0].op.$regex).toBeUndefined();
    expect(req.body.filters[1].value).toBe('test@example.com');
    expect(req.body.nested.attack.$where).toBeUndefined();
    expect(req.body.nested.safe).toBe('data');
    expect(next).toHaveBeenCalled();
  });

  test('should not remove valid keys', () => {
    req.body = {
      email: 'test@example.com',
      profile: {
        bio: 'Hello',
        tags: ['web', 'dev']
      }
    };
    const originalBody = JSON.parse(JSON.stringify(req.body));
    mongoSanitizeMiddleware(req, res, next);
    expect(req.body).toEqual(originalBody);
    expect(next).toHaveBeenCalled();
  });
});

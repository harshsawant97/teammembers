import request from 'supertest';
import { app } from '../src/app';

describe('Auth Endpoints', () => {
  it('should fail login with empty body', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toBe('Email and password are required');
  });

  // More tests would require mocking Prisma
  it('should return 401 for unauthorized /me route', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toEqual(401);
  });
});

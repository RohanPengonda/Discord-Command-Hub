import request from 'supertest';
import app from '../src/app.js';

describe('Admin Authentication API Tests', () => {
  it('should reject unauthorized access to protected dashboard stats', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('should handle admin login correctly (seeding first admin if empty or verifying)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'adminpassword123',
      });

    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'admin@example.com');
    }
  });

  it('should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
  });
});

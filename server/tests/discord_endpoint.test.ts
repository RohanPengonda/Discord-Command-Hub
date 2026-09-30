import request from 'supertest';
import app from '../src/app.js';

describe('Discord Interaction Endpoint Tests (/api/discord/interactions)', () => {
  it('should respond to PING (Type 1) with PONG ({ type: 1 })', async () => {
    const res = await request(app)
      .post('/api/discord/interactions')
      .set('x-bypass-signature', 'true')
      .send({
        id: 'test_ping_' + Date.now(),
        type: 1,
        token: 'test_token',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: 1 });
  });

  it('should execute /status command (Type 2) and return immediate Type 4 inline response', async () => {
    const res = await request(app)
      .post('/api/discord/interactions')
      .set('x-bypass-signature', 'true')
      .send({
        id: 'test_status_' + Date.now(),
        type: 2,
        token: 'test_token',
        data: { name: 'status' },
        member: { user: { id: '123', username: 'test_user' } },
      });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe(4);
    expect(res.body.data.content).toContain('System Operational');
  });

  it('should execute /report command with issue (Type 2) and return Type 5 deferred response', async () => {
    const res = await request(app)
      .post('/api/discord/interactions')
      .set('x-bypass-signature', 'true')
      .send({
        id: 'test_report_' + Date.now(),
        type: 2,
        token: 'test_token',
        data: {
          name: 'report',
          options: [{ name: 'issue', value: 'Payment page crashed when submitting form' }],
        },
        member: { user: { id: '456', username: 'reporter_user' } },
      });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe(5); // Deferred response
  });

  it('should return modal response (Type 9) for /report without inline arguments', async () => {
    const res = await request(app)
      .post('/api/discord/interactions')
      .set('x-bypass-signature', 'true')
      .send({
        id: 'test_modal_trigger_' + Date.now(),
        type: 2,
        token: 'test_token',
        data: { name: 'report' },
        member: { user: { id: '789', username: 'modal_user' } },
      });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe(9); // Modal trigger
    expect(res.body.data.custom_id).toBe('report_modal_submit');
  });

  it('should detect duplicate interaction ID and reject duplicate processing (Idempotency)', async () => {
    const interactionId = 'duplicate_id_' + Date.now();

    // First call
    const res1 = await request(app)
      .post('/api/discord/interactions')
      .set('x-bypass-signature', 'true')
      .send({
        id: interactionId,
        type: 1,
        token: 'test_token',
      });
    expect(res1.status).toBe(200);

    // Second call with same interactionId
    const res2 = await request(app)
      .post('/api/discord/interactions')
      .set('x-bypass-signature', 'true')
      .send({
        id: interactionId,
        type: 2,
        token: 'test_token',
        data: { name: 'status' },
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.content).toContain('already processed');
  });
});

import request from 'supertest';
import nacl from 'tweetnacl';
import app from '../src/app.js';
import { env } from '../src/config/env.js';

describe('Discord Ed25519 Signature Verification Tests', () => {
  it('should return 401 when signature headers are missing', async () => {
    const res = await request(app)
      .post('/api/discord/interactions')
      .send({ type: 1 });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Missing required signature');
  });

  it('should return 401 when an invalid signature is provided', async () => {
    const keyPair = nacl.sign.keyPair();
    const publicKeyHex = Buffer.from(keyPair.publicKey).toString('hex');
    const originalKey = env.DISCORD_PUBLIC_KEY;
    (env as any).DISCORD_PUBLIC_KEY = publicKeyHex;

    const res = await request(app)
      .post('/api/discord/interactions')
      .set(
        'x-signature-ed25519',
        '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
      )
      .set('x-signature-timestamp', Math.floor(Date.now() / 1000).toString())
      .send({ type: 1 });

    (env as any).DISCORD_PUBLIC_KEY = originalKey;

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid');
  });

  it('should accept a request with a valid Ed25519 signature generated with secret key', async () => {
    // Generate temporary nacl keypair
    const keyPair = nacl.sign.keyPair();
    const publicKeyHex = Buffer.from(keyPair.publicKey).toString('hex');
    const secretKey = keyPair.secretKey;

    // Temporarily set env DISCORD_PUBLIC_KEY
    const originalKey = env.DISCORD_PUBLIC_KEY;
    (env as any).DISCORD_PUBLIC_KEY = publicKeyHex;

    const bodyObj = { type: 1 };
    const bodyString = JSON.stringify(bodyObj);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = Buffer.from(timestamp + bodyString);
    const signature = nacl.sign.detached(message, secretKey);
    const signatureHex = Buffer.from(signature).toString('hex');

    const res = await request(app)
      .post('/api/discord/interactions')
      .set('x-signature-ed25519', signatureHex)
      .set('x-signature-timestamp', timestamp)
      .send(bodyObj);

    // Restore original key
    (env as any).DISCORD_PUBLIC_KEY = originalKey;

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: 1 }); // PONG response
  });
});

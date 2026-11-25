import assert from 'node:assert/strict';
import test from 'node:test';
import { assertIdentityEncryptionKey, decryptSecret, encryptSecret } from '../lib/security/secret';

test('approval configuration fails closed when the identity encryption key is absent', () => {
  const previous = process.env.DISPATCH_IDENTITY_ENCRYPTION_KEY;
  delete process.env.DISPATCH_IDENTITY_ENCRYPTION_KEY;
  assert.throws(() => assertIdentityEncryptionKey(), /DISPATCH_IDENTITY_ENCRYPTION_KEY is required/);
  if (previous === undefined) delete process.env.DISPATCH_IDENTITY_ENCRYPTION_KEY;
  else process.env.DISPATCH_IDENTITY_ENCRYPTION_KEY = previous;
});

test('configured identity encryption round-trips without exposing plaintext in storage', () => {
  const previous = process.env.DISPATCH_IDENTITY_ENCRYPTION_KEY;
  process.env.DISPATCH_IDENTITY_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  const ciphertext = encryptSecret('synthetic-enrollment-secret');
  assert.notEqual(ciphertext, 'synthetic-enrollment-secret');
  assert.equal(decryptSecret(ciphertext), 'synthetic-enrollment-secret');
  if (previous === undefined) delete process.env.DISPATCH_IDENTITY_ENCRYPTION_KEY;
  else process.env.DISPATCH_IDENTITY_ENCRYPTION_KEY = previous;
});

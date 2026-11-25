import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function key(): Buffer {
  const configured = process.env.DISPATCH_IDENTITY_ENCRYPTION_KEY;
  if (!configured) throw new Error('DISPATCH_IDENTITY_ENCRYPTION_KEY is required');
  const value = Buffer.from(configured, 'base64');
  if (value.length !== 32) throw new Error('DISPATCH_IDENTITY_ENCRYPTION_KEY must be a base64 32-byte key');
  return value;
}

export function assertIdentityEncryptionKey(): void {
  key();
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(payload: string): string {
  const [ivText, tagText, encryptedText] = payload.split('.');
  if (!ivText || !tagText || !encryptedText) throw new Error('Invalid encrypted identity secret');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8');
}

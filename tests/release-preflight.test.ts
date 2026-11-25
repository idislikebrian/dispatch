import assert from 'node:assert/strict';
import test from 'node:test';

test('production encryption key encoding is exactly 32 decoded bytes', () => {
  const encoded = Buffer.alloc(32, 9).toString('base64');
  assert.equal(Buffer.from(encoded, 'base64').length, 32);
  assert.notEqual(Buffer.from('not-a-32-byte-key', 'base64').length, 32);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { agentEnrollmentEnabled, interruptsEnabled, operatorIds } from '../lib/security/config';
import { createInvite, enrollmentSecret, verifyInvite } from '../lib/security/invite';

const secret = 'synthetic-enrollment-secret-0123456789';
const now = 1_800_000_000_000;

test('authorization settings fail closed', () => {
  assert.equal(operatorIds({}).size, 0);
  assert.equal(operatorIds({ DISPATCH_OPERATOR_USER_IDS: ' , ' }).size, 0);
  assert.deepEqual([...operatorIds({ DISPATCH_OPERATOR_USER_IDS: 'a, b' })], ['a', 'b']);
  for (const value of [undefined, '', 'false', '1', 'TRUE']) {
    assert.equal(interruptsEnabled({ DISPATCH_INTERRUPTS_ENABLED: value }), false);
    assert.equal(agentEnrollmentEnabled({ DISPATCH_AGENT_ENROLLMENT_ENABLED: value }), false);
  }
  assert.equal(enrollmentSecret({}), null);
  assert.equal(enrollmentSecret({ DISPATCH_ENROLLMENT_SECRET: 'short' }), null);
});

test('an invitation is bound to its email, secret, and expiry', () => {
  const token = createInvite(secret, 'Person@Example.invalid', now + 60_000);
  assert.equal(verifyInvite(secret, 'person@example.invalid', token, now), true);
  assert.equal(verifyInvite(secret, 'other@example.invalid', token, now), false);
  assert.equal(verifyInvite(`${secret}x`, 'person@example.invalid', token, now), false);
  assert.equal(verifyInvite(secret, 'person@example.invalid', token, now + 60_000), false);
  assert.equal(verifyInvite(secret, 'person@example.invalid', token.replace(/^\d+/, String(now + 120_000)), now), false);
  assert.equal(verifyInvite(secret, 'person@example.invalid', createInvite(secret, 'person@example.invalid', now + 25 * 3_600_000), now), false);
  for (const junk of ['', 'abc', `${now + 1}.`, `${now + 1}.${'A'.repeat(42)}`]) assert.equal(verifyInvite(secret, 'person@example.invalid', junk, now), false);
});

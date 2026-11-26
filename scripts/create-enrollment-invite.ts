// Owner-run. Usage:
//   DISPATCH_ENROLLMENT_SECRET=... npm run enroll:invite -- person@example.com [hours]
// The secret is read from the environment only, never from an argument.
import { createInvite, enrollmentSecret, MAX_INVITE_LIFETIME_MS } from '../lib/security/invite';

const [email, hoursText = '1'] = process.argv.slice(2);
const secret = enrollmentSecret();
const lifetime = Number(hoursText) * 60 * 60 * 1000;
if (!secret) throw new Error('DISPATCH_ENROLLMENT_SECRET (32+ characters) is required');
if (!email?.includes('@')) throw new Error('usage: npm run enroll:invite -- <email> [hours]');
if (!(lifetime > 0 && lifetime <= MAX_INVITE_LIFETIME_MS)) throw new Error('hours must be greater than 0 and at most 24');
console.log(createInvite(secret, email, Date.now() + lifetime));

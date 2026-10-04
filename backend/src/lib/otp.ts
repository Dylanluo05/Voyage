import { randomInt, createHash, timingSafeEqual } from 'crypto';
import { EmailOtp, EmailOtpDoc, OtpPurpose } from '../models/EmailOtp';
import { HttpError } from '../middleware/error';
import { sendOtpEmail } from './mailer';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function assertCooldown(lastSentAt?: Date): void {
  if (lastSentAt && Date.now() - lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new HttpError(429, 'Please wait before requesting another code');
  }
}

export async function issueOtp(
  email: string,
  purpose: OtpPurpose,
  pending?: { name: string; passwordHash: string }
): Promise<void> {
  const existing = await EmailOtp.findOne({ email, purpose });
  assertCooldown(existing?.lastSentAt);

  const code = generateCode();
  const now = new Date();

  await EmailOtp.findOneAndUpdate(
    { email, purpose },
    {
      codeHash: hashCode(code),
      attempts: 0,
      lastSentAt: now,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      ...(pending ? { pendingName: pending.name, pendingPasswordHash: pending.passwordHash } : {}),
    },
    { upsert: true }
  );

  try {
    await sendOtpEmail(email, code, purpose);
  } catch (err) {
    console.error('[otp email]', err);
  }
}

export async function resendOtp(email: string, purpose: OtpPurpose): Promise<void> {
  const existing = await EmailOtp.findOne({ email, purpose });
  if (!existing) throw new HttpError(404, 'No pending code to resend');
  assertCooldown(existing.lastSentAt);

  const code = generateCode();
  existing.codeHash = hashCode(code);
  existing.attempts = 0;
  existing.lastSentAt = new Date();
  existing.expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await existing.save();

  try {
    await sendOtpEmail(email, code, purpose);
  } catch (err) {
    console.error('[otp email]', err);
  }
}

export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<EmailOtpDoc> {
  const doc = await EmailOtp.findOne({ email, purpose });
  if (!doc || doc.expiresAt.getTime() < Date.now()) {
    if (doc) await doc.deleteOne();
    throw new HttpError(404, 'Code expired or not found');
  }

  if (doc.attempts >= MAX_ATTEMPTS) {
    await doc.deleteOne();
    throw new HttpError(429, 'Too many attempts — request a new code');
  }

  const providedHash = Buffer.from(hashCode(code));
  const storedHash = Buffer.from(doc.codeHash);
  const match = providedHash.length === storedHash.length && timingSafeEqual(providedHash, storedHash);

  if (!match) {
    doc.attempts += 1;
    await doc.save();
    throw new HttpError(401, 'Invalid code');
  }

  await doc.deleteOne();
  return doc;
}

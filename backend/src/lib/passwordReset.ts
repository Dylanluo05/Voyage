import { randomBytes, createHash } from 'crypto';
import { PasswordReset } from '../models/PasswordReset';
import { User, UserDoc, hashPassword } from '../models/User';
import { HttpError } from '../middleware/error';
import { sendPasswordResetEmail } from './mailer';

const RESET_TTL_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function issuePasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email });
  // Stay quiet about whether this email has an account — the caller
  // always responds with the same generic message either way.
  if (!user) return;

  const existing = await PasswordReset.findOne({ userId: user._id });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new HttpError(429, 'Please wait before requesting another reset email');
  }

  const token = randomBytes(32).toString('hex');
  const now = new Date();

  await PasswordReset.findOneAndUpdate(
    { userId: user._id },
    { tokenHash: hashToken(token), lastSentAt: now, expiresAt: new Date(now.getTime() + RESET_TTL_MS) },
    { upsert: true }
  );

  try {
    await sendPasswordResetEmail(user.email, token);
  } catch (err) {
    console.error('[password reset email]', err);
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<UserDoc> {
  const doc = await PasswordReset.findOne({ tokenHash: hashToken(token) });
  if (!doc || doc.expiresAt.getTime() < Date.now()) {
    if (doc) await doc.deleteOne();
    throw new HttpError(400, 'This reset link is invalid or has expired');
  }

  const user = await User.findById(doc.userId);
  if (!user) {
    await doc.deleteOne();
    throw new HttpError(400, 'This reset link is invalid or has expired');
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await doc.deleteOne();

  return user;
}

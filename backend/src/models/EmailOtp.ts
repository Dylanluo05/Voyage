import { Schema, model, Document } from 'mongoose';

export type OtpPurpose = 'login' | 'register';

export interface EmailOtpDoc extends Document {
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  attempts: number;
  pendingName?: string;
  pendingPasswordHash?: string;
  lastSentAt: Date;
  expiresAt: Date;
}

const emailOtpSchema = new Schema<EmailOtpDoc>({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ['login', 'register'], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  pendingName: { type: String },
  pendingPasswordHash: { type: String },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

emailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
// Auto-cleanup only; verification logic checks expiresAt itself rather than
// relying on the timing of Mongo's TTL sweep.
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailOtp = model<EmailOtpDoc>('EmailOtp', emailOtpSchema);

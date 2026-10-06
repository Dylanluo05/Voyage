import { Schema, model, Document, Types } from 'mongoose';

export interface PasswordResetDoc extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  lastSentAt: Date;
  expiresAt: Date;
}

const passwordResetSchema = new Schema<PasswordResetDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  tokenHash: { type: String, required: true, unique: true },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// Auto-cleanup only; reset logic checks expiresAt itself rather than
// relying on the timing of Mongo's TTL sweep.
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = model<PasswordResetDoc>('PasswordReset', passwordResetSchema);

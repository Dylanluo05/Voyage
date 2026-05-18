import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface UserDoc extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  badges: BadgeData[];
  comparePassword(plain: string): Promise<boolean>;
}

export interface BadgeData {
  _id?: Types.ObjectId;
  destination: string;
  countryCode?: string;
  awardedAt: Date;
  source: 'auto' | 'manual';
  tripId?: Types.ObjectId;
}

const badgeSchema = new Schema(
  {
    destination: { type: String, required: true },
    countryCode: { type: String },
    awardedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['auto', 'manual'], required: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip' },
  },
  { _id: true }
);

const userSchema = new Schema<UserDoc>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    badges: { type: [badgeSchema], default: [] }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export const User = model<UserDoc>('User', userSchema);

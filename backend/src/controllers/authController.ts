import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User, hashPassword } from '../models/User';
import { signToken } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { linkPendingInvites } from '../lib/pendingInvites';
import { issueOtp, resendOtp, verifyOtp } from '../lib/otp';
import type { OtpPurpose } from '../models/EmailOtp';
import { env } from '../config/env';

const googleClient = new OAuth2Client();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1),
});

const googleAuthScheme = z.object({
  accessToken: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const otpPurposeSchema = z.enum(['login', 'register']);

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  purpose: otpPurposeSchema,
});

const resendOtpSchema = z.object({
  email: z.string().email(),
  purpose: otpPurposeSchema,
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const lowerEmail = email.toLowerCase();
    const existing = await User.findOne({ email: lowerEmail });
    if (existing) throw new HttpError(409, 'Email already registered');

    const passwordHash = await hashPassword(password);

    if (!env.requireEmailOtp) {
      const user = await User.create({ email: lowerEmail, passwordHash, name });
      await linkPendingInvites(user._id, user.email).catch((err) => console.error('[linkPendingInvites]', err));
      const token = signToken({ sub: user.id, email: user.email });
      res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
      return;
    }

    await issueOtp(lowerEmail, 'register', { name, passwordHash });
    res.json({ pending: true, email: lowerEmail });
  } catch (err) {
    next(err);
  }
}

export async function googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accessToken } = googleAuthScheme.parse(req.body);
    googleClient.setCredentials({ access_token: accessToken });
    const userinfoResp = await googleClient.request<{ sub: string; email: string; name: string }>({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo',
    });
    if (userinfoResp.status !== 200) throw new HttpError(401, 'Invalid Google access token');
    const { sub, email, name } = userinfoResp.data;
    if (!email) throw new HttpError(401, 'Google account has no email');
    let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });
    if (!user) {
      user = await User.create({ email, name, googleId: sub });
      await linkPendingInvites(user._id, user.email).catch((err) => console.error('[linkPendingInvites]', err));
    } else if (!user.googleId) {
      await User.updateOne({ _id: user._id }, { $set: { googleId: sub } });
    }
    const token = signToken({ sub: user.id, email: user.email });
    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const lowerEmail = email.toLowerCase();
    const user = await User.findOne({ email: lowerEmail });
    if (!user) throw new HttpError(401, 'Invalid email or password');

    const match = await user.comparePassword(password);
    if (!match) throw new HttpError(401, 'Invalid email or password');

    if (!env.requireEmailOtp) {
      const token = signToken({ sub: user.id, email: user.email });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
      return;
    }

    await issueOtp(user.email, 'login');
    res.json({ pending: true, email: user.email });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtpHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code, purpose } = verifyOtpSchema.parse(req.body);
    const lowerEmail = email.toLowerCase();
    const doc = await verifyOtp(lowerEmail, purpose as OtpPurpose, code);

    let user;
    if (purpose === 'register') {
      user = await User.create({
        email: lowerEmail,
        name: doc.pendingName,
        passwordHash: doc.pendingPasswordHash,
      });
      await linkPendingInvites(user._id, user.email).catch((err) => console.error('[linkPendingInvites]', err));
    } else {
      user = await User.findOne({ email: lowerEmail });
      if (!user) throw new HttpError(404, 'User not found');
    }

    const token = signToken({ sub: user.id, email: user.email });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
}

export async function resendOtpHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, purpose } = resendOtpSchema.parse(req.body);
    const lowerEmail = email.toLowerCase();
    await resendOtp(lowerEmail, purpose as OtpPurpose);
    res.json({ pending: true, email: lowerEmail });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    const user = await User.findById(req.user.sub);
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    next(err);
  }
}

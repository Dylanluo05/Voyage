import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User, hashPassword } from '../models/User';
import { signToken } from '../middleware/auth';
import { HttpError } from '../middleware/error';

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

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const existing = await User.findOne({ email });
    if (existing) throw new HttpError(409, 'Email already registered');

    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash, name });
    const token = signToken({ sub: user.id, email: user.email });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
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
    } else if (!user.googleId) {
      user.googleId = sub;
      await user.save();
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
    const user = await User.findOne({ email });
    if (!user) throw new HttpError(401, 'Invalid email or password');

    const match = await user.comparePassword(password);
    if (!match) throw new HttpError(401, 'Invalid email or password');

    const token = signToken({ sub: user.id, email: user.email });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
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

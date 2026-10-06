import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { HttpError } from '../middleware/error';
import { User } from '../models/User';
import { deleteAccount as deleteAccountData } from '../lib/accountDeletion';

function ownerId(req: Request): Types.ObjectId {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    return new Types.ObjectId(req.user.sub);
}


export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await User.findById(ownerId(req)).select('name email bio wishlist avatarUrl badges xp sidequestHistory createdAt passwordHash');
        if (!user) throw new HttpError(404, 'User not found');
        const { passwordHash, ...rest } = user.toObject();
        res.status(200).json({ ...rest, hasPassword: !!passwordHash });
    } catch (err) {
        next(err);
    }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { bio, wishlist, avatarUrl } = z.object({
            bio: z.string().max(300).optional(),
            wishlist: z.array(z.string().min(1)).optional(),
            avatarUrl: z.string().url().optional().or(z.literal('')),
        }).parse(req.body);
        const user = await User.findById(ownerId(req)).select('name email bio wishlist avatarUrl badges xp sidequestHistory createdAt');
        if (!user) throw new HttpError(404, 'User not found');
        if (bio !== undefined) user.bio = bio || undefined;
        if (wishlist !== undefined) user.wishlist = wishlist;
        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl || undefined;
        await user.save();
        res.status(200).json(user);
    } catch (err) {
        next(err);
    }
}

const deleteAccountSchema = z.object({ password: z.string().optional() });

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await User.findById(ownerId(req));
        if (!user) throw new HttpError(404, 'User not found');

        const { password } = deleteAccountSchema.parse(req.body);
        if (user.passwordHash) {
            if (!password) throw new HttpError(400, 'Password is required to delete your account');
            const match = await user.comparePassword(password);
            if (!match) throw new HttpError(401, 'Incorrect password');
        }

        await deleteAccountData(user);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
}


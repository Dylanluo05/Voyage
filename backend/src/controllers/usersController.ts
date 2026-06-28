import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { HttpError } from '../middleware/error';
import { User } from '../models/User';

function ownerId(req: Request): Types.ObjectId {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    return new Types.ObjectId(req.user.sub);
}

function ensureValidObjectId(id: string, label = 'id'): void {
    if (!Types.ObjectId.isValid(id)) throw new HttpError(400, `Invalid ${label}`);
}

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await User.findById(ownerId(req)).select('name email bio wishlist avatarUrl badges xp sidequestHistory createdAt');
        if (!user) throw new HttpError(404, 'User not found');
        res.status(200).json(user);
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

export async function addBadge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await User.findById(ownerId(req)).select('name email badges createdAt');
        if (!user) throw new HttpError(404, 'User not found');
        const badge = z.object({
            destination: z.string().min(1),
            countryCode: z.string().length(2).optional(),
        }).parse(req.body);
        user.badges.push({ ...badge, source: 'manual', awardedAt: new Date() });
        await user.save();
        res.status(200).json(user);
    } catch (err) {
        next(err);
    }
}

export async function removeBadge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        ensureValidObjectId(req.params.badgeId, 'badge id');
        const user = await User.findById(ownerId(req)).select('name email badges createdAt');
        if (!user) throw new HttpError(404, 'User not found');
        const before = user.badges.length;
        user.badges = user.badges.filter(b => b._id?.toString() !== req.params.badgeId) as typeof user.badges;
        if (before === user.badges.length) throw new HttpError(404, 'Badge not found');
        await user.save();
        res.status(200).json(user);
    } catch (err) {
        next(err);
    }
}

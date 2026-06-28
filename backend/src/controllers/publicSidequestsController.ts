import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { HttpError } from "../middleware/error";
import { PublicSidequest } from "../models/PublicSidequest";
import z from "zod";
import { User } from "../models/User";
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Per-user cooldown: userId:sidequestId -> last attempt timestamp (ms)
const completionCooldowns = new Map<string, number>();
const COMPLETION_COOLDOWN_MS = 60_000;

// Per-user daily completion limit: userId -> { count, date (YYYY-MM-DD) }
const dailyCompletions = new Map<string, { count: number; date: string }>();
const DAILY_COMPLETION_LIMIT = 10;

function todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
}

function checkDailyCompletionLimit(userId: string): void {
    const today = todayUtc();
    const entry = dailyCompletions.get(userId);
    if (!entry || entry.date !== today) {
        dailyCompletions.set(userId, { count: 0, date: today });
        return;
    }
    if (entry.count >= DAILY_COMPLETION_LIMIT) {
        throw new HttpError(429, 'Daily sidequest completion limit reached. Try again tomorrow.');
    }
}

function incrementDailyCompletion(userId: string): void {
    const today = todayUtc();
    const entry = dailyCompletions.get(userId);
    if (!entry || entry.date !== today) {
        dailyCompletions.set(userId, { count: 1, date: today });
    } else {
        entry.count += 1;
    }
}

function computeXp(cardSuit: 'spades' | 'hearts' | 'diamonds' | 'clubs', cardRank: 'J' | 'Q' | 'K' | 'A'): number {
    const BASE_XP = { 'J': 250, 'Q': 500, 'K': 750, 'A': 1000 };
    const MULTIPLIER = { 'spades': 1.5, 'hearts': 1.0, 'diamonds': 1.2, 'clubs': 1.1 };
    return Math.round(BASE_XP[cardRank] * MULTIPLIER[cardSuit] / 5) * 5;
}

function ownerId(req: Request): Types.ObjectId {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    return new Types.ObjectId(req.user.sub);
}

export async function listPublicSidequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { location } = req.query;
        const publicSidequests = await PublicSidequest.find({ ...(location && { location: new RegExp(location as string, 'i') }) });
        res.json(publicSidequests);
    } catch (err) {
        next(err);
    }
}

export async function listClaimedSidequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const uid = ownerId(req);
        const claimedSidequests = await PublicSidequest.find({ 'claims.userId': uid });
        res.json(claimedSidequests);
    } catch (err) {
        next(err);
    }
}

export async function createPublicSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const publicSidequestSchema = z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            location: z.string().optional(),
            cardSuit: z.enum(['spades', 'hearts', 'diamonds', 'clubs']),
            cardRank: z.enum(['J', 'Q', 'K', 'A']),
            event: z.object({ date: z.string(), maxParticipants: z.number().min(1).optional() }).optional(),
        }).parse(req.body);
        const uid = ownerId(req);
        const user = await User.findById(uid).select('name');
        if (!user) throw new HttpError(404, 'User not found');
        const publicSidequest = await PublicSidequest.create({
            title: publicSidequestSchema.title,
            description: publicSidequestSchema.description,
            location: publicSidequestSchema.location,
            createdBy: {
                userId: uid,
                userName: user.name,
            },
            claims: [],
            completions: [],
            cardSuit: publicSidequestSchema.cardSuit,
            cardRank: publicSidequestSchema.cardRank,
            xpReward: computeXp(publicSidequestSchema.cardSuit, publicSidequestSchema.cardRank),
            ...(publicSidequestSchema.event &&
            {
                event: {
                    ...publicSidequestSchema.event, enrollments: []
                }
            })
        });
        res.status(201).json(publicSidequest);
    } catch (err) {
        next(err);
    }
}

export async function claimPublicSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const publicSidequest = await PublicSidequest.findById(req.params.id);
        if (!publicSidequest) throw new HttpError(404, 'Public sidequest not found');
        const uid = ownerId(req);
        const alreadyClaimed = publicSidequest.claims.some(c => c.userId.equals(uid));
        if (alreadyClaimed) throw new HttpError(400, 'Public sidequest already claimed');
        const user = await User.findById(uid).select('name');
        if (!user) throw new HttpError(404, 'User not found');
        publicSidequest.claims.push({
            userId: uid,
            userName: user.name,
            claimedAt: new Date(),
        });
        await publicSidequest.save();
        res.status(200).json(publicSidequest);
    } catch (err) {
        next(err);
    }
}

export async function completePublicSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { photoUrl } = z.object({
            photoUrl: z.string().min(1)
        }).parse(req.body);
        const publicSidequest = await PublicSidequest.findById(req.params.id);
        if (!publicSidequest) throw new HttpError(404, 'Public sidequest not found');
        const uid = ownerId(req);
        checkDailyCompletionLimit(uid.toString());
        const cooldownKey = `${uid}:${req.params.id}`;
        const lastAttempt = completionCooldowns.get(cooldownKey);
        if (lastAttempt && Date.now() - lastAttempt < COMPLETION_COOLDOWN_MS) {
            throw new HttpError(429, 'Please wait 60 seconds before trying again');
        }
        completionCooldowns.set(cooldownKey, Date.now());
        const alreadyCompleted = publicSidequest.completions.some(c => c.userId.equals(uid));
        if (alreadyCompleted) throw new HttpError(400, 'Public sidequest already completed by user');
        const user = await User.findById(uid).select('name');
        if (!user) throw new HttpError(404, 'User not found');
        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'url', url: photoUrl } },
                    { type: 'text', text: `Sidequest: "${publicSidequest.title}"\nDescription: ${publicSidequest.description ?? 'No description'}\n\nDoes this photo show that the sidequest was completed? Be lenient — if the photo plausibly shows the activity, accept it.\n\nRespond in exactly this format:\nLine 1: YES or NO (one word only)\nLine 2: One sentence explaining your verdict.` },
                ],
            }],
        });
        const textBlock = response.content.find(b => b.type === 'text');
        if (!textBlock || textBlock.type !== 'text') throw new HttpError(500, 'AI returned unexpected response');
        const lines = textBlock.text.trim().split('\n').map(l => l.trim()).filter(Boolean);
        const verdict = lines[0] ?? '';
        const explanation = lines.slice(1).join(' ') || 'No explanation provided';
        if (!verdict.toUpperCase().startsWith('YES')) throw new HttpError(400, `AI could not verify completion: ${explanation}`);
        incrementDailyCompletion(uid.toString());
        publicSidequest.completions.push({
            userId: uid,
            userName: user.name,
            photoUrl: photoUrl,
            completedAt: new Date(),
        });
        const sidequestHistoryData = {
            sidequestId: publicSidequest._id,
            title: publicSidequest.title,
            cardSuit: publicSidequest.cardSuit,
            cardRank: publicSidequest.cardRank,
            xpEarned: publicSidequest.xpReward,
            completedAt: new Date(),
        };
        await user.updateOne({ $inc: { xp: publicSidequest.xpReward }, $push: { sidequestHistory: sidequestHistoryData } });
        await publicSidequest.save();
        res.status(200).json(publicSidequest);
    } catch (err) {
        next(err);
    }
}

export async function enrollInSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const uid = ownerId(req);
        const [user, publicSidequest] = await Promise.all([
            User.findById(uid),
            PublicSidequest.findById(req.params.id),
        ]);
        if (!publicSidequest) throw new HttpError(404, 'Public sidequest not found');
        if (!user) throw new HttpError(404, 'User not found');
        if (!publicSidequest.event) throw new HttpError(400, 'Public sidequest does not have an active event');
        if (publicSidequest.event.enrollments.some((e) => e.userId.equals(uid))) throw new HttpError(400, 'User already enrolled in public sidequest event');
        if (publicSidequest.event.maxParticipants && publicSidequest.event.maxParticipants === publicSidequest.event.enrollments.length) throw new HttpError(400, 'Sidequest enrollment limit already reached');
        publicSidequest.event.enrollments.push({ userId: uid, userName: user.name, enrolledAt: new Date() });
        if (!publicSidequest.claims.some(c => c.userId.equals(uid))) {
            publicSidequest.claims.push({ userId: uid, userName: user.name, claimedAt: new Date() });
        }
        await publicSidequest.save();
        res.status(200).json(publicSidequest);
    } catch (err) {
        next(err);
    }
}

export async function leaveEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const uid = ownerId(req);
        const publicSidequest = await PublicSidequest.findById(req.params.id);
        if (!publicSidequest) throw new HttpError(404, 'Public sidequest not found');
        if (!publicSidequest.event) throw new HttpError(400, 'Public sidequest does not have an active event');
        if (!publicSidequest.event.enrollments.some(e => e.userId.equals(uid))) throw new HttpError(400, 'User is not enrolled in this event');
        const updated = await PublicSidequest.findByIdAndUpdate(
            req.params.id,
            { $pull: { 'event.enrollments': { userId: uid }, claims: { userId: uid } } },
            { new: true }
        );
        res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
}

export async function unclaimPublicSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const uid = ownerId(req);
        const publicSidequest = await PublicSidequest.findById(req.params.id);
        if (!publicSidequest) throw new HttpError(404, 'Public sidequest not found');
        if (!publicSidequest.claims.some(c => c.userId.equals(uid))) throw new HttpError(400, 'Sidequest not claimed by user');
        if (publicSidequest.completions.some(c => c.userId.equals(uid))) throw new HttpError(400, 'Cannot unclaim a completed sidequest');
        const updated = await PublicSidequest.findByIdAndUpdate(
            req.params.id,
            { $pull: { claims: { userId: uid } } },
            { new: true }
        );
        res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
}

export async function getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const leaderboard = await User.find({}).select('name xp').sort({ xp: -1 }).limit(50);
        res.status(200).json(leaderboard);
    } catch (err) {
        next(err);
    }
}

export async function assignClaimToTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { tripId } = z.object({ tripId: z.string().min(1) }).parse(req.body);
        const uid = ownerId(req);
        const sq = await PublicSidequest.findById(req.params.id);
        if (!sq) throw new HttpError(404, 'Sidequest not found');
        const claim = sq.claims.find(c => c.userId.equals(uid));
        if (!claim) throw new HttpError(400, 'You have not claimed this sidequest');
        claim.tripId = new Types.ObjectId(tripId);
        await sq.save();
        res.status(200).json(sq);
    } catch (err) {
        next(err);
    }
}

export async function unassignClaimFromTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const uid = ownerId(req);
        const sq = await PublicSidequest.findById(req.params.id);
        if (!sq) throw new HttpError(404, 'Sidequest not found');
        const claim = sq.claims.find(c => c.userId.equals(uid));
        if (!claim) throw new HttpError(400, 'You have not claimed this sidequest');
        claim.tripId = undefined;
        await sq.save();
        res.status(200).json(sq);
    } catch (err) {
        next(err);
    }
}

export async function listSidequestsByTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const uid = ownerId(req);
        const tripId = new Types.ObjectId(req.params.tripId);
        const sidequests = await PublicSidequest.find({
            claims: { $elemMatch: { userId: uid, tripId } },
        });
        res.status(200).json(sidequests);
    } catch (err) {
        next(err);
    }
}
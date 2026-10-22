import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { HttpError } from "../middleware/error";
import { PublicSidequest } from "../models/PublicSidequest";
import z from "zod";
import { User } from "../models/User";
import { checkAndIncrementQuota } from '../lib/aiQuota';
import { env } from '../config/env';
import { sendReviewRequestEmail } from '../lib/mailer';
import Anthropic from '@anthropic-ai/sdk';
import { recordAiCost } from '../lib/aiCost';
import { uploadedPhotoUrl } from '../lib/urls';
import { sidequestView, sidequestViews } from '../lib/sidequestView';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

// Per-user cooldown: userId:sidequestId -> last attempt timestamp (ms)
const completionCooldowns = new Map<string, number>();
const COMPLETION_COOLDOWN_MS = 60_000;

// Per-user daily completion limit: userId -> { count, date (YYYY-MM-DD) }
const dailyCompletions = new Map<string, { count: number; date: string }>();
const DAILY_COMPLETION_LIMIT = 10;
const MAX_QUESTS_CREATED_PER_DAY = 5;
const USER_QUEST_RANK = 'J' as const;

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

function isAdmin(req: Request): boolean {
    return !!req.user && env.adminEmails.has(req.user.email);
}

function viewerOf(req: Request) {
    return { id: req.user?.sub, isAdmin: isAdmin(req) };
}

function ownerId(req: Request): Types.ObjectId {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    return new Types.ObjectId(req.user.sub);
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listPublicSidequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { location } = req.query;
        const publicSidequests = await PublicSidequest.find(
            { ...(location && { location: new RegExp(escapeRegex(location as string), 'i') }) }
        ).lean();
        res.json(sidequestViews(publicSidequests as never[], viewerOf(req)));
    } catch (err) {
        next(err);
    }
}

export async function listClaimedSidequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const uid = ownerId(req);
        const claimedSidequests = await PublicSidequest.find({ 'claims.userId': uid });
        res.json(sidequestViews(claimedSidequests, viewerOf(req)));
    } catch (err) {
        next(err);
    }
}

export async function createPublicSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const publicSidequestSchema = z.object({
            title: z.string().trim().min(1).max(120),
            description: z.string().max(1000).optional(),
            location: z.string().max(200).optional(),
            cardSuit: z.enum(['spades', 'hearts', 'diamonds', 'clubs']),
            // Accepted for client compatibility, but user-created quests are always
            // the lowest rank so they can't be used to farm XP.
            cardRank: z.enum(['J', 'Q', 'K', 'A']).optional(),
        }).parse(req.body);
        const uid = ownerId(req);
        const createdToday = await PublicSidequest.countDocuments({
            'createdBy.userId': uid,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });
        if (createdToday >= MAX_QUESTS_CREATED_PER_DAY) throw new HttpError(429, 'You can create up to 5 sidequests per day');
        const user = await User.findById(uid).select('name');
        if (!user) throw new HttpError(404, 'User not found');
        const publicSidequest = await PublicSidequest.create({
            title: publicSidequestSchema.title,
            description: publicSidequestSchema.description,
            location: publicSidequestSchema.location,
            createdBy: { userId: uid, userName: user.name },
            claims: [],
            completions: [],
            cardSuit: publicSidequestSchema.cardSuit,
            cardRank: USER_QUEST_RANK,
            xpReward: computeXp(publicSidequestSchema.cardSuit, USER_QUEST_RANK),
        });
        res.status(201).json(sidequestView(publicSidequest, viewerOf(req)));
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
        res.status(200).json(sidequestView(publicSidequest, viewerOf(req)));
    } catch (err) {
        next(err);
    }
}

export async function completePublicSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { photoUrl, isPublic } = z.object({
            photoUrl: uploadedPhotoUrl,
            isPublic: z.boolean().default(false),
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
        if (publicSidequest.createdBy?.userId?.equals(uid) && !isAdmin(req)) throw new HttpError(400, 'You cannot complete a sidequest you created');
        const user = await User.findById(uid).select('name');
        if (!user) throw new HttpError(404, 'User not found');
        const photoReused = await PublicSidequest.exists({ 'completions.photoUrl': photoUrl });
        if (photoReused) throw new HttpError(400, 'That photo has already been used. Take a new one for this sidequest.');
        // Every attempt costs a vision call, so every attempt counts toward both the
        // daily attempt cap and the user's AI quota (not just successes).
        incrementDailyCompletion(uid.toString());
        await checkAndIncrementQuota(req.user!.sub);
        const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 200,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'url', url: photoUrl } },
                    { type: 'text', text: `Sidequest: "${publicSidequest.title}"\nDescription: ${publicSidequest.description ?? 'No description'}\n\nDoes this photo show that the sidequest was completed? Be lenient — if the photo plausibly shows the activity, accept it.\n\nRespond in exactly this format:\nLine 1: YES or NO (one word only)\nLine 2: One sentence explaining your verdict.` },
                ],
            }],
        });
        await recordAiCost(MODEL, 'sidequest', response.usage);
        const textBlock = response.content.find(b => b.type === 'text');
        if (!textBlock || textBlock.type !== 'text') throw new HttpError(500, 'AI returned unexpected response');
        const lines = textBlock.text.trim().split('\n').map(l => l.trim()).filter(Boolean);
        const verdict = lines[0] ?? '';
        const explanation = lines.slice(1).join(' ') || 'No explanation provided';
        if (!verdict.toUpperCase().startsWith('YES')) {
            // Keep the rejected photo so the user can ask the quest creator (or an admin) to
            // approve it by hand instead of just losing their attempt. Replaces any earlier request.
            publicSidequest.reviewRequests = publicSidequest.reviewRequests.filter((r) => !r.userId.equals(uid)) as typeof publicSidequest.reviewRequests;
            publicSidequest.reviewRequests.push({
                userId: uid, userName: user.name, photoUrl, isPublic, aiReason: explanation.slice(0, 500),
                status: 'ai_rejected', createdAt: new Date(),
            });
            await publicSidequest.save();
            res.status(400).json({ error: `AI could not verify completion: ${explanation}`, canRequestReview: true });
            return;
        }
        await recordCompletion(publicSidequest._id, uid, { photoUrl, isPublic });
        const fresh = await PublicSidequest.findById(publicSidequest._id);
        res.status(200).json(sidequestView(fresh!, viewerOf(req)));
    } catch (err) {
        next(err);
    }
}

/**
 * Adds the completion and awards XP, once. Shared by the AI path and by human approval so both
 * pay the same XP. Atomic on "this user has no completion yet", so a double submit or double
 * approval can't award twice. Returns false if the user had already completed it.
 */
async function recordCompletion(
    questId: Types.ObjectId,
    userId: Types.ObjectId,
    data: { photoUrl: string; isPublic: boolean; reviewedBy?: { userId: Types.ObjectId; userName: string } },
): Promise<boolean> {
    const user = await User.findById(userId).select('name');
    if (!user) throw new HttpError(404, 'User not found');
    const quest = await PublicSidequest.findOneAndUpdate(
        { _id: questId, 'completions.userId': { $ne: userId } },
        {
            $push: {
                completions: {
                    userId, userName: user.name, photoUrl: data.photoUrl, completedAt: new Date(),
                    isPublic: data.isPublic, ...(data.reviewedBy && { reviewedBy: data.reviewedBy }),
                },
            },
            $pull: { reviewRequests: { userId } },
        },
        { new: true },
    );
    if (!quest) return false;
    await user.updateOne({
        $inc: { xp: quest.xpReward },
        $push: {
            sidequestHistory: {
                sidequestId: quest._id, title: quest.title, cardSuit: quest.cardSuit,
                cardRank: quest.cardRank, xpEarned: quest.xpReward, completedAt: new Date(),
            },
        },
    });
    return true;
}

export async function requestReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const uid = ownerId(req);
        const sq = await PublicSidequest.findById(req.params.id);
        if (!sq) throw new HttpError(404, 'Public sidequest not found');
        if (sq.completions.some((c) => c.userId.equals(uid))) throw new HttpError(400, 'You already completed this sidequest');
        const request = sq.reviewRequests.find((r) => r.userId.equals(uid));
        if (!request || request.status === 'pending') {
            throw new HttpError(400, request ? 'Review already requested' : 'Submit a photo first; review is only for photos the AI rejected');
        }
        if (request.status === 'rejected') throw new HttpError(400, 'This photo was reviewed and declined. Submit a new photo to try again.');
        request.status = 'pending';
        request.createdAt = new Date();
        await sq.save();

        // Best effort: nudge the creator by email. Voyage-made quests are created by an admin account.
        User.findById(sq.createdBy.userId).select('email').then((creator) => {
            if (creator) return sendReviewRequestEmail(creator.email, request.userName, sq.title);
        }).catch((err) => console.error('[review request email]', err));

        res.status(200).json(sidequestView(sq, viewerOf(req)));
    } catch (err) {
        next(err);
    }
}

/** Quests with photos waiting on this person: their own quests, or every quest for admins. */
export async function listReviewQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const uid = ownerId(req);
        const filter = isAdmin(req)
            ? { 'reviewRequests.status': 'pending' }
            : { 'createdBy.userId': uid, 'reviewRequests.status': 'pending' };
        const quests = await PublicSidequest.find(filter);
        res.status(200).json(sidequestViews(quests, viewerOf(req)));
    } catch (err) {
        next(err);
    }
}

export async function reviewCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { decision, note } = z.object({
            decision: z.enum(['approve', 'reject']),
            note: z.string().trim().max(300).optional(),
        }).parse(req.body);
        const reviewerId = ownerId(req);
        const sq = await PublicSidequest.findById(req.params.id);
        if (!sq) throw new HttpError(404, 'Public sidequest not found');
        if (!sq.createdBy.userId.equals(reviewerId) && !isAdmin(req)) {
            throw new HttpError(403, 'Only the quest creator or an admin can review submissions');
        }
        const request = sq.reviewRequests.find((r) => r._id?.toString() === req.params.requestId);
        if (!request || request.status !== 'pending') throw new HttpError(404, 'No pending review request found');
        if (request.userId.equals(reviewerId)) throw new HttpError(403, 'You cannot review your own submission');

        if (decision === 'approve') {
            const reviewer = await User.findById(reviewerId).select('name');
            const recorded = await recordCompletion(sq._id, request.userId, {
                photoUrl: request.photoUrl,
                isPublic: request.isPublic,
                reviewedBy: { userId: reviewerId, userName: reviewer?.name ?? 'Voyage' },
            });
            if (!recorded) {
                // They completed it in the meantime; drop the stale request.
                await PublicSidequest.updateOne({ _id: sq._id }, { $pull: { reviewRequests: { _id: request._id } } });
                throw new HttpError(409, 'This user has already completed the sidequest');
            }
        } else {
            request.status = 'rejected';
            request.reviewNote = note;
            await sq.save();
        }
        const fresh = await PublicSidequest.findById(sq._id);
        res.status(200).json(sidequestView(fresh!, viewerOf(req)));
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
        res.status(200).json(sidequestView(publicSidequest, viewerOf(req)));
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
        res.status(200).json(sidequestView(updated!, viewerOf(req)));
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
        res.status(200).json(sidequestView(updated!, viewerOf(req)));
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

export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { text } = z.object({ text: z.string().min(1).max(500) }).parse(req.body);
        const uid = ownerId(req);
        const [sq, user] = await Promise.all([
            PublicSidequest.findById(req.params.id),
            User.findById(uid).select('name avatarUrl'),
        ]);
        if (!sq) throw new HttpError(404, 'Sidequest not found');
        if (!user) throw new HttpError(404, 'User not found');
        sq.comments.push({
            userId: uid,
            userName: user.name,
            avatarUrl: (user as any).avatarUrl,
            text,
            createdAt: new Date(),
        });
        await sq.save();
        res.status(201).json(sidequestView(sq, viewerOf(req)));
    } catch (err) {
        next(err);
    }
}

export async function removeComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const uid = ownerId(req);
        const sq = await PublicSidequest.findById(req.params.id);
        if (!sq) throw new HttpError(404, 'Sidequest not found');
        const comment = sq.comments.find(c => c._id?.toString() === req.params.commentId);
        if (!comment) throw new HttpError(404, 'Comment not found');
        if (!comment.userId.equals(uid)) throw new HttpError(403, 'Cannot delete another user\'s comment');
        sq.comments = sq.comments.filter(c => c._id?.toString() !== req.params.commentId) as typeof sq.comments;
        await sq.save();
        res.status(200).json(sidequestView(sq, viewerOf(req)));
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
        res.status(200).json(sidequestView(sq, viewerOf(req)));
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
        res.status(200).json(sidequestView(sq, viewerOf(req)));
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
        res.status(200).json(sidequestViews(sidequests, viewerOf(req)));
    } catch (err) {
        next(err);
    }
}

export async function createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { date, maxParticipants } = z.object({
            date: z.string().min(1),
            maxParticipants: z.number().min(1).optional(),
        }).parse(req.body);
        const uid = ownerId(req);
        const sq = await PublicSidequest.findById(req.params.id);
        if (!sq) throw new HttpError(404, 'Sidequest not found');
        if (!sq.claims.some(c => c.userId.equals(uid))) throw new HttpError(403, 'You must claim this sidequest before scheduling an event');
        if (sq.event) throw new HttpError(400, 'This sidequest already has an event');
        sq.event = { date: new Date(date), enrollments: [], ...(maxParticipants && { maxParticipants }) };
        await sq.save();
        res.status(201).json(sidequestView(sq, viewerOf(req)));
    } catch (err) {
        next(err);
    }
}
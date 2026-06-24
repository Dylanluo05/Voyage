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
            difficulty: z.enum(['easy', 'medium', 'hard', 'legendary']),
        }).parse(req.body);
        const uid = ownerId(req);
        const user = await User.findById(uid).select('name');
        if (!user) throw new HttpError(404, 'User not found');
        const XP_BY_DIFFICULTY = { easy: 50, medium: 100, hard: 200, legendary: 500 }
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
            difficulty: publicSidequestSchema.difficulty,
            xpReward: XP_BY_DIFFICULTY[publicSidequestSchema.difficulty],
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
            max_tokens: 150,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'url', url: photoUrl } },
                    { type: 'text', text: `here is a sidequest called ${publicSidequest.title} with description ${publicSidequest.description}; does the provided photo effectively show that it was completed? Answer only YES or NO on the first line, and give a single sentence explaining your verdict on the second line` },
                ],
            }],
        });
        const textBlock = response.content.find(b => b.type === 'text');
        if (!textBlock || textBlock.type !== 'text') throw new HttpError(500, 'AI returned unexpected response');
        const lines = textBlock.text.split(`\n`).map(l => l.trim());
        const verdict = lines[0]
        const explanation = lines[1] ?? 'No explanation provided';
        if (!verdict.includes('YES')) throw new HttpError(400, `AI could not verify sidequest and has the following explanation: ${explanation}`);
        incrementDailyCompletion(uid.toString());
        publicSidequest.completions.push({
            userId: uid,
            userName: user.name,
            photoUrl: photoUrl,
            completedAt: new Date(),
        });
        await publicSidequest.save();
        res.status(200).json(publicSidequest);
    } catch (err) {
        next(err);
    }
}
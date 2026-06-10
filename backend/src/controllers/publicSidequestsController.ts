import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { HttpError } from "../middleware/error";
import { PublicSidequest } from "../models/PublicSidequest";
import z from "zod";
import { User } from "../models/User";

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

export async function createPublicSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const publicSidequestSchema = z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            location: z.string().optional(),
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
            completions: [],
        });
        res.status(201).json(publicSidequest);
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
        const alreadyCompleted = publicSidequest.completions.some(c => c.userId.equals(uid));
        if (alreadyCompleted) throw new HttpError(400, 'Public sidequest already completed by user');
        const user = await User.findById(uid).select('name');
        if (!user) throw new HttpError(404, 'User not found');
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
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Report, ReportDoc } from '../models/Report';
import { Trip } from '../models/Trip';
import { PublicSidequest } from '../models/PublicSidequest';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';

function ensureValidObjectId(id: string, label = 'id'): void {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, `Invalid ${label}`);
}

const createReportSchema = z.object({
  targetType: z.enum(['trip', 'sidequest', 'sidequestCompletion', 'sidequestComment']),
  targetId: z.string(),
  subTargetId: z.string().optional(),
  reason: z.string().min(1, 'Please describe the issue').max(300),
});

export async function createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    const { targetType, targetId, subTargetId, reason } = createReportSchema.parse(req.body);
    ensureValidObjectId(targetId, 'target id');
    if (subTargetId) ensureValidObjectId(subTargetId, 'sub-target id');

    const reporter = await User.findById(req.user.sub).select('name');
    if (!reporter) throw new HttpError(404, 'User not found');

    await Report.create({
      targetType,
      targetId,
      subTargetId,
      reporterId: reporter._id,
      reporterName: reporter.name,
      reason,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

type ReportPreview = { exists: boolean; summary?: string; imageUrl?: string };

async function resolvePreview(report: ReportDoc): Promise<ReportPreview> {
  if (report.targetType === 'trip') {
    const trip = await Trip.findById(report.targetId).select('title destination owner').populate('owner', 'name');
    if (!trip) return { exists: false };
    const ownerName = (trip.owner as unknown as { name?: string } | undefined)?.name;
    return { exists: true, summary: `"${trip.title}" (${trip.destination})${ownerName ? ` by ${ownerName}` : ''}` };
  }

  const quest = await PublicSidequest.findById(report.targetId).select('title completions comments');
  if (!quest) return { exists: false };

  if (report.targetType === 'sidequest') {
    return { exists: true, summary: quest.title };
  }

  if (report.targetType === 'sidequestCompletion') {
    const completion = quest.completions.find((c) => c._id?.toString() === report.subTargetId?.toString());
    if (!completion) return { exists: false };
    return { exists: true, summary: `Completion photo by ${completion.userName} on "${quest.title}"`, imageUrl: completion.photoUrl };
  }

  if (report.targetType === 'sidequestComment') {
    const comment = quest.comments.find((c) => c._id?.toString() === report.subTargetId?.toString());
    if (!comment) return { exists: false };
    return { exists: true, summary: `${comment.userName}: "${comment.text}" (on "${quest.title}")` };
  }

  return { exists: false };
}

const listReportsSchema = z.object({
  status: z.enum(['pending', 'resolved', 'dismissed']).optional(),
});

export async function listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = listReportsSchema.parse(req.query);
    const reports = await Report.find({ status: status ?? 'pending' }).sort({ createdAt: -1 }).limit(100);
    const withPreviews = await Promise.all(
      reports.map(async (report) => ({ ...report.toObject(), preview: await resolvePreview(report) }))
    );
    res.json(withPreviews);
  } catch (err) {
    next(err);
  }
}

const updateStatusSchema = z.object({ status: z.enum(['resolved', 'dismissed']) });

export async function updateReportStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'report id');
    const { status } = updateStatusSchema.parse(req.body);
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!report) throw new HttpError(404, 'Report not found');
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function removeReportedContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'report id');
    const report = await Report.findById(req.params.id);
    if (!report) throw new HttpError(404, 'Report not found');

    switch (report.targetType) {
      case 'trip':
        await Trip.deleteOne({ _id: report.targetId });
        break;
      case 'sidequest':
        await PublicSidequest.deleteOne({ _id: report.targetId });
        break;
      case 'sidequestCompletion':
        await PublicSidequest.updateOne({ _id: report.targetId }, { $pull: { completions: { _id: report.subTargetId } } });
        break;
      case 'sidequestComment':
        await PublicSidequest.updateOne({ _id: report.targetId }, { $pull: { comments: { _id: report.subTargetId } } });
        break;
    }

    report.status = 'resolved';
    await report.save();
    res.json(report);
  } catch (err) {
    next(err);
  }
}

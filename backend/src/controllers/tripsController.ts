import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { Trip, ItineraryItemData, DebateOptionData, DebateCommentData } from '../models/Trip';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';
import { searchTracks, getSpotifyAuthUrl } from '../lib/spotify';
import { interpretVibe } from '../lib/vibeInterpreter';
import { checkTripQuota, checkAndIncrementQuota } from '../lib/aiQuota';
import { addTripClient, removeTripClient } from '../lib/tripEvents';
import { createSseToken, consumeSseToken } from '../lib/sseTokens';
import { env } from '../config/env';
import { PublicSidequest } from '../models/PublicSidequest';

const locationSchema = z
  .object({
    name: z.string().optional(),
    address: z.string().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .optional();

const itemSchema = z.object({
  day: z.number().int().min(1),
  position: z.number().int().min(0).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  location: locationSchema,
  imageUrl: z.string().url().optional(),
  cost: z.number().min(0).max(1_000_000).optional(),
  category: z.enum(['food', 'activity', 'attraction']).optional(),
});

const reorderSchema = z.object({
  items: z
    .array(z.object({ itemId: z.string(), day: z.number().int().min(1), position: z.number().int().min(0) }))
    .min(0),
  groups: z
    .array(z.object({ groupId: z.string(), day: z.number().int().min(1), position: z.number().int().min(0) }))
    .optional(),
  debates: z
    .array(z.object({ debateId: z.string(), day: z.number().int().min(1), position: z.number().int().min(0) }))
    .optional(),
});

const tripBaseSchema = z.object({
  title: z.string().min(1).max(200),
  destination: z.string().min(1).max(200),
  startDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid startDate'),
  endDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid endDate'),
  description: z.string().max(1000).optional(),
});

const tripCreateSchema = tripBaseSchema.refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'endDate must be on or after startDate', path: ['endDate'] }
);

const tripUpdateSchema = tripBaseSchema.partial();

function ownerId(req: Request): Types.ObjectId {
  if (!req.user) throw new HttpError(401, 'Unauthenticated');
  return new Types.ObjectId(req.user.sub);
}

// Filter matching trips the current user owns OR collaborates on
function accessFilter(req: Request, id: string) {
  const uid = ownerId(req);
  return { _id: id, $or: [{ owner: uid }, { collaborators: uid }] };
}

function ensureValidObjectId(id: string, label = 'id'): void {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, `Invalid ${label}`);
}

const COLLAB_POPULATE = [{ path: 'collaborators', select: 'name email' }, { path: 'owner', select: 'name email' }];

export async function listTrips(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uid = ownerId(req);
    const trips = await Trip.find({ $or: [{ owner: uid }, { collaborators: uid }] })
      .sort({ startDate: 1 })
      .populate(COLLAB_POPULATE);
    res.json(trips);
  } catch (err) {
    next(err);
  }
}

export async function createTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await checkTripQuota(req.user!.sub);
    const data = tripCreateSchema.parse(req.body);
    const trip = await Trip.create({
      owner: ownerId(req),
      title: data.title,
      destination: data.destination,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      description: data.description,
      items: [],
      collaborators: [],
    });
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function getTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id)).populate(COLLAB_POPULATE);
    if (!trip) throw new HttpError(404, 'Trip not found');
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function updateTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const data = tripUpdateSchema.parse(req.body);
    const update: Record<string, unknown> = { ...data };
    if (data.startDate) update.startDate = new Date(data.startDate);
    if (data.endDate) update.endDate = new Date(data.endDate);

    const trip = await Trip.findOneAndUpdate(
      accessFilter(req, req.params.id),
      update,
      { new: true }
    ).populate(COLLAB_POPULATE);
    if (!trip) throw new HttpError(404, 'Trip not found');
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function deleteTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    // Only the owner can delete
    const result = await Trip.deleteOne({ _id: req.params.id, owner: ownerId(req) });
    if (result.deletedCount === 0) throw new HttpError(404, 'Trip not found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const data = itemSchema.parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');

    const sameDayCount = trip.items.filter((i) => i.day === data.day).length;
    const newItem: ItineraryItemData = {
      ...data,
      position: data.position ?? sameDayCount,
    };
    trip.items.push(newItem);
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.itemId, 'item id');
    const data = itemSchema.partial().parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const item = trip.items.find((i) => i._id?.toString() === req.params.itemId);
    if (!item) throw new HttpError(404, 'Item not found');
    Object.assign(item, data);
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.itemId, 'item id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const before = trip.items.length;
    trip.items = trip.items.filter((i) => i._id?.toString() !== req.params.itemId);
    if (trip.items.length === before) throw new HttpError(404, 'Item not found');
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function reorderItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { items, groups, debates } = reorderSchema.parse(req.body);

    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');

    const moveById = new Map(items.map((m) => [m.itemId, m]));
    for (const item of trip.items) {
      const move = moveById.get(item._id!.toString());
      if (move) {
        item.day = move.day;
        item.position = move.position;
      }
    }
    if (groups?.length) {
      const moveGroupById = new Map(groups.map((m) => [m.groupId, m]));
      for (const group of trip.groups) {
        const move = moveGroupById.get(group._id!.toString());
        if (move) {
          group.day = move.day;
          group.position = move.position;
          trip.items.forEach((item) => {
            if (item.groupId === group._id!.toString()) item.day = move.day;
          });
        }
      }
    }
    if (debates?.length) {
      const moveDebateById = new Map(debates.map((m) => [m.debateId, m]));
      for (const debate of trip.debates) {
        const move = moveDebateById.get(debate._id!.toString());
        if (move) {
          debate.day = move.day;
          debate.position = move.position;
        }
      }
    }
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { title, day, itemIds } = z.object({
      title: z.string().min(1),
      day: z.number().int().min(1),
      itemIds: z.array(z.string()).min(1),
    }).parse(req.body);

    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');

    const dayTopCount = trip.groups.filter((g) => g.day === day).length +
      trip.items.filter((i) => i.day === day && !i.groupId).length;

    const groupEntry = { title, day, position: dayTopCount } as ItineraryItemData;
    trip.groups.push(groupEntry as never);
    await trip.save();

    const createdGroup = trip.groups[trip.groups.length - 1];
    const groupId = createdGroup._id!.toString();

    itemIds.forEach((itemId, idx) => {
      const item = trip.items.find((i) => i._id?.toString() === itemId);
      if (item) { item.groupId = groupId; item.position = idx; item.day = day; }
    });

    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) { next(err); }
}

export async function renameGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.groupId, 'group id');
    const { title } = z.object({ title: z.string().min(1) }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const group = trip.groups.find((g) => g._id?.toString() === req.params.groupId);
    if (!group) throw new HttpError(404, 'Group not found');
    group.title = title;
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) { next(err); }
}

export async function dissolveGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.groupId, 'group id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const groupIdx = trip.groups.findIndex((g) => g._id?.toString() === req.params.groupId);
    if (groupIdx === -1) throw new HttpError(404, 'Group not found');
    const gid = trip.groups[groupIdx]._id!.toString();
    trip.groups.splice(groupIdx, 1);
    trip.items.forEach((item) => { if (item.groupId === gid) { item.groupId = undefined; } });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) { next(err); }
}

const ALLOWED_EMOJIS = new Set(['👍', '👎', '❤️', '🔥', '😂']);

export async function toggleReaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.itemId, 'item id');
    const { emoji } = z.object({ emoji: z.string().min(1) }).parse(req.body);
    if (!ALLOWED_EMOJIS.has(emoji)) throw new HttpError(400, 'Invalid emoji');

    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const item = trip.items.find((i) => i._id?.toString() === req.params.itemId);
    if (!item) throw new HttpError(404, 'Item not found');

    const uid = ownerId(req);
    const uidStr = uid.toString();
    if (!item.reactions) item.reactions = [];
    let reaction = item.reactions.find((r) => r.emoji === emoji);
    if (!reaction) {
      item.reactions.push({ emoji, userIds: [uid] });
    } else {
      const idx = reaction.userIds.findIndex((v) => v.toString() === uidStr);
      if (idx !== -1) {
        reaction.userIds.splice(idx, 1);
      } else {
        reaction.userIds.push(uid);
      }
    }
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function inviteCollaborator(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    // Only owner can invite
    const trip = await Trip.findOne({ _id: req.params.id, owner: ownerId(req) });
    if (!trip) throw new HttpError(404, 'Trip not found');

    const invitee = await User.findOne({ email: email.toLowerCase() });
    if (!invitee) throw new HttpError(404, 'No account found with that email');

    if (invitee._id.equals(trip.owner)) {
      throw new HttpError(400, 'That user is already the trip owner');
    }
    if (trip.collaborators.some((c) => c.equals(invitee._id))) {
      throw new HttpError(400, 'That user is already a collaborator');
    }

    trip.collaborators.push(invitee._id);
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function removeCollaborator(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.userId, 'user id');

    // Only owner can remove
    const trip = await Trip.findOne({ _id: req.params.id, owner: ownerId(req) });
    if (!trip) throw new HttpError(404, 'Trip not found');

    const before = trip.collaborators.length;
    trip.collaborators = trip.collaborators.filter(
      (c) => !c.equals(new Types.ObjectId(req.params.userId))
    ) as Types.DocumentArray<Types.ObjectId>;
    if (trip.collaborators.length === before) throw new HttpError(404, 'Collaborator not found');

    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function createDebate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { title, day, options } = z.object({
      title: z.string().min(1),
      day: z.number().int().min(1),
      options: z.array(z.object({ title: z.string().min(1) })).min(2).max(6),
    }).parse(req.body);

    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');

    const maxPos = Math.max(
      -1,
      ...trip.items.filter((i) => i.day === day && !i.groupId).map((i) => i.position),
      ...trip.groups.filter((g) => g.day === day).map((g) => g.position),
      ...trip.debates.filter((d) => d.day === day).map((d) => d.position),
    );
    trip.debates.push({
      title,
      day,
      position: maxPos + 1,
      options: options.map((o) => ({ title: o.title, pros: [], cons: [], votes: [] })),
      comments: [],
    });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function deleteDebate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const before = trip.debates.length;
    trip.debates = trip.debates.filter((d) => d._id?.toString() !== req.params.debateId) as typeof trip.debates;
    if (trip.debates.length === before) throw new HttpError(404, 'Debate not found');
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function addDebateOption(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { title } = z.object({ title: z.string().min(1) }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const debate = trip.debates.find((d) => d._id?.toString() === req.params.debateId);
    if (!debate) throw new HttpError(404, 'Debate not found');
    debate.options.push({ title, pros: [], cons: [], votes: [] });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function updateDebateOption(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const patch = z.object({
      title: z.string().min(1).optional(),
      pros: z.array(z.string()).optional(),
      cons: z.array(z.string()).optional(),
    }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const debate = trip.debates.find((d) => d._id?.toString() === req.params.debateId);
    if (!debate) throw new HttpError(404, 'Debate not found');
    const option = debate.options.find((o) => o._id?.toString() === req.params.optionId);
    if (!option) throw new HttpError(404, 'Option not found');
    if (patch.title !== undefined) option.title = patch.title;
    if (patch.pros !== undefined) option.pros = patch.pros;
    if (patch.cons !== undefined) option.cons = patch.cons;
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function deleteDebateOption(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const debate = trip.debates.find((d) => d._id?.toString() === req.params.debateId);
    if (!debate) throw new HttpError(404, 'Debate not found');
    const before = debate.options.length;
    debate.options = debate.options.filter((o: DebateOptionData) => o._id?.toString() !== req.params.optionId) as typeof debate.options;
    if (debate.options.length === before) throw new HttpError(404, 'Option not found');
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function voteDebateOption(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const uid = ownerId(req);
    const uidStr = uid.toString();
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const debate = trip.debates.find((d) => d._id?.toString() === req.params.debateId);
    if (!debate) throw new HttpError(404, 'Debate not found');
    const option = debate.options.find((o) => o._id?.toString() === req.params.optionId);
    if (!option) throw new HttpError(404, 'Option not found');

    const wasVotingForThis = option.votes.some((v: Types.ObjectId) => v.toString() === uidStr);
    for (const opt of debate.options) {
      opt.votes = opt.votes.filter((v: Types.ObjectId) => v.toString() !== uidStr) as typeof opt.votes;
    }
    if (!wasVotingForThis) option.votes.push(uid);
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function addDebateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { text } = z.object({ text: z.string().min(1).max(2000) }).parse(req.body);
    const uid = ownerId(req);

    const [trip, user] = await Promise.all([
      Trip.findOne(accessFilter(req, req.params.id)),
      User.findById(uid).select('name'),
    ]);
    if (!trip) throw new HttpError(404, 'Trip not found');
    if (!user) throw new HttpError(401, 'User not found');

    const debate = trip.debates.find((d) => d._id?.toString() === req.params.debateId);
    if (!debate) throw new HttpError(404, 'Debate not found');
    debate.comments.push({ userId: uid, userName: user.name, text, createdAt: new Date() });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function deleteDebateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const uid = ownerId(req);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const debate = trip.debates.find((d) => d._id?.toString() === req.params.debateId);
    if (!debate) throw new HttpError(404, 'Debate not found');
    const comment = debate.comments.find((c) => c._id?.toString() === req.params.commentId);
    if (!comment) throw new HttpError(404, 'Comment not found');
    if (!trip.owner.equals(uid) && !comment.userId.equals(uid)) throw new HttpError(403, 'Not allowed');
    debate.comments = debate.comments.filter((c: DebateCommentData) => c._id?.toString() !== req.params.commentId) as typeof debate.comments;
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function searchSpotify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q } = z.object({ q: z.string().min(1) }).parse(req.query);
    const tracks = await searchTracks(q);
    const results = tracks.map((t) => ({
      spotifyId: t.id,
      title: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      albumArt: t.album.images[0]?.url,
    }));
    res.json(results);
  } catch (err) {
    next(err);
  }
}

export async function addTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const track = z.object({
      spotifyId: z.string().min(1),
      title: z.string().min(1),
      artist: z.string().min(1),
      albumArt: z.string().optional(),
    }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const alreadyAdded = trip.playlist.some((t) => t.spotifyId === track.spotifyId);
    if (alreadyAdded) throw new HttpError(409, 'Track already in playlist');
    trip.playlist.push({ ...track, addedBy: ownerId(req) });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function removeTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const before = trip.playlist.length;
    trip.playlist = trip.playlist.filter(
      (t) => t._id?.toString() !== req.params.trackId
    ) as typeof trip.playlist;
    if (trip.playlist.length === before) throw new HttpError(404, 'Track not found');
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function recommendByVibe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    await checkAndIncrementQuota(req.user!.sub);
    const { vibes } = z.object({ vibes: z.string().min(1).max(200) }).parse(req.query);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const suggestions = await interpretVibe(vibes, trip.destination);
    const settled = await Promise.allSettled(
      suggestions.map((s) => searchTracks(`${s.title} ${s.artist}`))
    );
    const results = settled
      .flatMap((r) => (r.status === 'fulfilled' ? r.value.slice(0, 1) : []))
      .map((t) => ({
        spotifyId: t.id,
        title: t.name,
        artist: t.artists.map((a) => a.name).join(', '),
        albumArt: t.album.images[0]?.url,
      }));
    res.json({ results });
  } catch (err) {
    next(err);
  }
}

// ── Share ──────────────────────────────────────────────────────────────────

export async function getPublicTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const trip = await Trip.findOne({ shareToken: req.params.token }).populate(COLLAB_POPULATE);
    if (!trip) throw new HttpError(404, 'Trip not found');
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

// ── Trip log ───────────────────────────────────────────────────────────────

function extractCountryCode(destination: string): string | undefined {
  const last = destination.split(',').at(-1)?.trim().toLowerCase();
  const map: Record<string, string> = {
    'usa': 'US', 'united states': 'US', 'japan': 'JP', 'france': 'FR',
    'italy': 'IT', 'spain': 'ES', 'uk': 'GB', 'united kingdom': 'GB',
    'germany': 'DE', 'australia': 'AU', 'canada': 'CA', 'mexico': 'MX',
    'brazil': 'BR', 'china': 'CN', 'india': 'IN', 'thailand': 'TH',
    'indonesia': 'ID', 'portugal': 'PT', 'greece': 'GR', 'netherlands': 'NL',
    'switzerland': 'CH', 'austria': 'AT', 'sweden': 'SE', 'norway': 'NO',
    'denmark': 'DK', 'new zealand': 'NZ', 'south korea': 'KR', 'singapore': 'SG',
    'vietnam': 'VN', 'turkey': 'TR', 'egypt': 'EG', 'morocco': 'MA',
    'argentina': 'AR', 'peru': 'PE', 'colombia': 'CO', 'cuba': 'CU',
  };
  return last ? map[last] : undefined;
}

export async function markCompleted(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { isCompleted } = z.object({ isCompleted: z.boolean() }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const memberIds = [trip.owner._id, ...trip.collaborators.map(c => c._id)];
    if (isCompleted && !trip.isCompleted) {
      await User.updateMany(
        { _id: { $in: memberIds } },
        { $push: { badges: { destination: trip.title, countryCode: extractCountryCode(trip.destination), source: 'auto', tripId: trip._id, awardedAt: new Date() } } }
      );
    }
    trip.isCompleted = isCompleted;
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function addLogPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { url, day, caption } = z.object({
      url: z.string().min(1),
      day: z.number().int().min(1).optional(),
      caption: z.string().max(300).optional(),
    }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    trip.log.photos.push({ url, day, caption, uploadedBy: ownerId(req), uploadedAt: new Date() });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function removeLogPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const before = trip.log.photos.length;
    trip.log.photos = trip.log.photos.filter(
      (p) => p._id?.toString() !== req.params.photoId
    ) as typeof trip.log.photos;
    if (trip.log.photos.length === before) throw new HttpError(404, 'Photo not found');
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function rateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { rating } = z.object({ rating: z.number().int().min(1).max(5) }).parse(req.body);
    const uid = ownerId(req);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const itemId = new Types.ObjectId(req.params.itemId);
    const existing = trip.log.ratings.find(
      (r) => r.itemId.equals(itemId) && r.userId.equals(uid)
    );
    if (existing) {
      existing.rating = rating;
    } else {
      trip.log.ratings.push({ itemId, rating, userId: uid });
    }
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function addGuestPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url, day, caption } = z.object({
      url: z.string().min(1),
      day: z.number().int().min(1).optional(),
      caption: z.string().max(300).optional()
    }).parse(req.body);
    const trip = await Trip.findOne({ shareToken: req.params.shareToken });
    if (!trip) throw new HttpError(404, 'Trip not found');
    trip.log.photos.push({ url, day, caption, uploadedAt: new Date() });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function updateBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { budget } = z.object({ budget: z.number().min(0) }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    trip.budget = budget;
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

// ── Hotels and Flights ──────────────────────────────────────────────────────────────────
export async function addHotel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const hotel = z.object({
      name: z.string().min(1),
      type: z.enum(["hotel", "airbnb", "hostel", "other"]),
      location: z.string().min(1),
      checkIn: z.string().min(1),
      checkOut: z.string().min(1),
      pricePerNight: z.number().min(0),
      guests: z.number().min(1),
      confirmationNumber: z.string().min(1).optional(),
      notes: z.string().min(1).max(300).optional(),
    }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    trip.hotels.push(hotel);
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function removeHotel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const before = trip.hotels.length;
    trip.hotels = trip.hotels.filter(
      (h) => h._id?.toString() !== req.params.hotelId
    ) as typeof trip.hotels;
    if (trip.hotels.length === before) throw new HttpError(404, 'Hotel not found');
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function updateDayAnchor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const { day, startAddress, endAddress } = z.object({
      day: z.number().int().min(1),
      startAddress: z.string().max(300).optional(),
      endAddress: z.string().max(300).optional(),
    }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const idx = trip.dayAnchors.findIndex((a) => a.day === day);
    if (idx !== -1) {
      trip.dayAnchors[idx].startAddress = startAddress;
      trip.dayAnchors[idx].endAddress = endAddress;
    } else {
      trip.dayAnchors.push({ day, startAddress, endAddress });
    }
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function addFlight(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const flight = z.object({
      tripType: z.enum(["one-way", "round-trip"]),
      airline: z.string().min(1),
      flightNumber: z.string().min(1),
      departureAirport: z.string().min(1),
      arrivalAirport: z.string().min(1),
      departureTime: z.string().min(1),
      arrivalTime: z.string().min(1),
      returnDepartureTime: z.string().min(1).optional(),
      returnArrivalTime: z.string().min(1).optional(),
      passengers: z.number().min(1),
      cabinClass: z.enum(["economy", "premium-economy", "business", "first-class"]),
      price: z.number().min(0),
      confirmationNumber: z.string().min(1),
      notes: z.string().min(1).max(300).optional(),
    }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    trip.flights.push(flight);
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function removeFlight(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const before = trip.flights.length;
    trip.flights = trip.flights.filter(
      (f) => f._id?.toString() !== req.params.flightId
    ) as typeof trip.flights;
    if (trip.flights.length === before) throw new HttpError(404, 'Flight not found');
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}


// ── Expenses ──────────────────────────────────────────────────────────────────
export async function addExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const expense = z.object({
      title: z.string().min(1),
      amount: z.number().min(0),
      paidBy: z.object({ userId: z.string(), userName: z.string().min(1) }),
      splits: z.array(z.object({ userId: z.string(), userName: z.string().min(1), amount: z.number().min(0) })),
    }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    trip.expenses.push({
      title: expense.title,
      amount: expense.amount,
      paidBy: {
        userId: new Types.ObjectId(expense.paidBy.userId),
        userName: expense.paidBy.userName,
      },
      splits: expense.splits.map(s => ({
        userId: new Types.ObjectId(s.userId),
        userName: s.userName,
        amount: s.amount,
        settled: false,
      })),
    });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function removeExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const before = trip.expenses.length;
    trip.expenses = trip.expenses.filter(
      (e) => e._id?.toString() !== req.params.expenseId
    ) as typeof trip.expenses;
    if (trip.expenses.length === before) throw new HttpError(404, 'Expense not found');
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function settleSplit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const expense = trip.expenses.find((e) => e._id?.toString() === req.params.expenseId);
    if (!expense) throw new HttpError(404, 'Expense not found');
    const split = expense.splits.find((s) => s.userId.toString() === req.params.userId);
    if (!split) throw new HttpError(404, 'Split not found');
    const currentUid = ownerId(req).toString();
    const isDebtor = currentUid === req.params.userId;
    const isCreditor = currentUid === expense.paidBy.userId.toString();
    if (!isDebtor && !isCreditor) throw new HttpError(403, 'Not authorized to settle this split');
    split.settled = true;
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

// ── Sidequests ──────────────────────────────────────────────────────────────────
export async function addSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const sidequest = z.object({
      title: z.string().min(1),
      description: z.string().min(1).optional(),
    }).parse(req.body);
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    trip.sidequests.push({
      title: sidequest.title,
      description: sidequest.description,
      comments: [],
      completed: false
    });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function assignSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.sidequestId, 'sidequest id');
    ensureValidObjectId(req.body.assigneeId, 'assignee id');
    const [trip, assigneeUser, assignerUser] = await Promise.all([
      Trip.findOne(accessFilter(req, req.params.id)),
      User.findById(req.body.assigneeId).select('name'),
      User.findById(ownerId(req)).select('name'),
    ]);
    if (!trip) throw new HttpError(404, 'Trip not found');
    if (!assigneeUser) throw new HttpError(404, 'Assignee user not found');
    if (!assignerUser) throw new HttpError(404, 'Assigner user not found');
    const sidequest = trip.sidequests.find(s => String(s._id) === req.params.sidequestId);
    if (!sidequest) throw new HttpError(404, 'Sidequest not found');
    const isMember = trip.owner.equals(assigneeUser._id) || trip.collaborators.some(c => c.equals(assigneeUser._id));
    if (!isMember) throw new HttpError(400, 'Assignee is not a trip member');
    if (assigneeUser._id.equals(assignerUser._id)) throw new HttpError(400, 'Cannot assign a sidequest to yourself');
    sidequest.assignee = { userId: assigneeUser._id, userName: assigneeUser.name };
    sidequest.assigner = { userId: assignerUser._id, userName: assignerUser.name };
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(200).json(trip);
  } catch (err) {
    next(err);
  }
};

export async function completeSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.sidequestId, 'sidequest id');
    const uid = ownerId(req);
    const [trip, user] = await Promise.all([
      Trip.findOne(accessFilter(req, req.params.id)),
      User.findById(uid).select('name'),
    ]);
    if (!trip) throw new HttpError(404, 'Trip not found');
    if (!user) throw new HttpError(404, 'User not found');
    const sidequest = trip.sidequests.find(s => String(s._id) === req.params.sidequestId);
    if (!sidequest) throw new HttpError(404, 'Sidequest not found');
    if (!uid.equals(sidequest.assigner?.userId)) throw new HttpError(403, 'Only the sidequest assigner can mark the sidequest as complete');
    if (sidequest.completed) throw new HttpError(400, 'Sidequest already completed');
    sidequest.completed = true;
    sidequest.completedBy = { userId: uid, userName: user.name };
    sidequest.completedAt = new Date();
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(200).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function removeSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.sidequestId, 'sidequest id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const before = trip.sidequests.length;
    trip.sidequests = trip.sidequests.filter(
      (s) => s._id?.toString() !== req.params.sidequestId
    ) as typeof trip.sidequests;
    if (trip.sidequests.length === before) throw new HttpError(404, 'Sidequest not found');
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.sidequestId, 'sidequest id');
    const comment = z.object({
      text: z.string().min(1),
      imageUrl: z.string().optional(),
    }).parse(req.body);
    const [trip, user] = await Promise.all([
      Trip.findOne(accessFilter(req, req.params.id)),
      User.findById(ownerId(req)).select('name'),
    ]);
    if (!trip) throw new HttpError(404, 'Trip not found');
    if (!user) throw new HttpError(404, 'User not found');
    const sidequest = trip.sidequests.find(s => String(s._id) === req.params.sidequestId);
    if (!sidequest) throw new HttpError(404, 'Sidequest not found');
    sidequest.comments.push({
      userId: user._id,
      userName: user.name,
      text: comment.text,
      imageUrl: comment.imageUrl,
      createdAt: new Date(),
    });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function removeComment(req: Request, res: Response, next: NextFunction) {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.sidequestId, 'sidequest id');
    ensureValidObjectId(req.params.commentId, 'comment id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) throw new HttpError(404, 'Trip not found');
    const sidequest = trip.sidequests.find(s => String(s._id) === req.params.sidequestId);
    if (!sidequest) throw new HttpError(404, 'Sidequest not found');
    const comment = sidequest.comments.find(c => c._id?.toString() === req.params.commentId);
    if (!comment) throw new HttpError(404, 'Comment not found');
    if (!comment.userId.equals(ownerId(req))) throw new HttpError(403, 'Cannot delete another user\'s comment');
    sidequest.comments = sidequest.comments.filter(
      c => c._id?.toString() !== req.params.commentId
    ) as typeof sidequest.comments;
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function publishSidequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.sidequestId, 'sidequest id');
    const uid = ownerId(req);
    const [trip, user] = await Promise.all([
      Trip.findOne(accessFilter(req, req.params.id)),
      User.findById(uid).select('name')
    ]);
    if (!trip) throw new HttpError(404, 'Trip not found');
    if (!user) throw new HttpError(404, 'User not found');
    const sidequest = trip.sidequests.find(s => String(s._id) === req.params.sidequestId);
    if (!sidequest) throw new HttpError(404, 'Sidequest not found');
    const XP_BY_DIFFICULTY = { easy: 50, medium: 100, hard: 200, legendary: 500 } as const;
    const difficulty = 'easy' as const;
    const publicSidequest = await PublicSidequest.create({
      title: sidequest.title,
      description: sidequest.description,
      location: trip.destination,
      createdBy: {
        userId: uid,
        userName: user.name,
      },
      claims: [],
      completions: [],
      difficulty,
      xpReward: XP_BY_DIFFICULTY[difficulty],
      tripId: trip.id,
    });
    res.status(201).json(publicSidequest);
  } catch (err) {
    next(err);
  }
}

export async function addPublicSidequestToTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.publicSidequestId, 'public sidequest id');
    const [trip, publicSidequest] = await Promise.all([
      Trip.findOne(accessFilter(req, req.params.id)),
      PublicSidequest.findById(req.params.publicSidequestId)
    ]);
    if (!trip) throw new HttpError(404, 'Trip not found');
    if (!publicSidequest) throw new HttpError(404, 'Public sidequest not found');
    trip.sidequests.push({
      title: publicSidequest.title,
      description: publicSidequest.description,
      comments: [],
      completed: false
    });
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function issueSseToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) { next(new HttpError(404, 'Trip not found')); return; }
    const token = createSseToken(ownerId(req).toString(), req.params.id);
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

export async function getTripEvents(req: Request, res: Response): Promise<void> {
  const { token } = req.query as { token?: string };
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }

  ensureValidObjectId(req.params.id, 'trip id');
  const userId = consumeSseToken(token, req.params.id);
  if (!userId) { res.status(401).json({ error: 'Invalid or expired token' }); return; }

  const trip = await Trip.findOne({
    _id: req.params.id,
    $or: [{ owner: userId }, { collaborators: userId }],
  });
  if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const tripId = trip._id.toString();
  addTripClient(tripId, res);

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeTripClient(tripId, res);
  });
}

// ── Public trips feed ──────────────────────────────────────────────────────────────────
export async function publishTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const [trip, user] = await Promise.all([
      Trip.findOne(accessFilter(req, req.params.id)),
      User.findById(ownerId(req)).select('id')
    ]);
    if (!trip) throw new HttpError(404, 'Trip not found');
    if (!user) throw new HttpError(404, 'User not found');
    if (trip.owner.toString() !== user.id) throw new HttpError(400, 'Only owner can publish trip');
    trip.isPublic = !trip.isPublic;
    await trip.save();
    await trip.populate(COLLAB_POPULATE);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function listPublicTrips(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { destination } = req.query;
    const safeDestination = destination ? String(destination).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
    const trips = await Trip.find({ isPublic: true, ...(safeDestination && { destination: new RegExp(safeDestination, 'i') }) }).select('title destination startDate endDate items owner shareToken');
    res.json(trips);
  } catch (err) {
    next(err);
  }
}

export async function exportPlaylist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/spotify/callback`;
    const state = JSON.stringify({ tripId: trip._id.toString() });
    const url = getSpotifyAuthUrl(state, redirectUri);
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

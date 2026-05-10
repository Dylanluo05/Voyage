import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Trip, ItineraryItemData, DebateOptionData, DebateCommentData } from '../models/Trip';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';

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
  title: z.string().min(1),
  notes: z.string().optional(),
  location: locationSchema,
  imageUrl: z.string().optional(),
  cost: z.number().min(0).optional(),
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
  title: z.string().min(1),
  destination: z.string().min(1),
  startDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid startDate'),
  endDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid endDate'),
  description: z.string().optional(),
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

const COLLAB_POPULATE = { path: 'collaborators', select: 'name email' };

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

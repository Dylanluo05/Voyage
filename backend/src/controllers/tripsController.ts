import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Trip } from '../models/Trip';
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
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  title: z.string().min(1),
  notes: z.string().optional(),
  location: locationSchema,
});

const tripCreateSchema = z.object({
  title: z.string().min(1),
  destination: z.string().min(1),
  startDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid startDate'),
  endDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid endDate'),
  description: z.string().optional(),
});

const tripUpdateSchema = tripCreateSchema.partial();

function ownerId(req: Request): Types.ObjectId {
  if (!req.user) throw new HttpError(401, 'Unauthenticated');
  return new Types.ObjectId(req.user.sub);
}

function ensureValidObjectId(id: string, label = 'id'): void {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, `Invalid ${label}`);
}

export async function listTrips(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const trips = await Trip.find({ owner: ownerId(req) }).sort({ startDate: 1 });
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
    });
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function getTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne({ _id: req.params.id, owner: ownerId(req) });
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
      { _id: req.params.id, owner: ownerId(req) },
      update,
      { new: true }
    );
    if (!trip) throw new HttpError(404, 'Trip not found');
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function deleteTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
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
    const trip = await Trip.findOne({ _id: req.params.id, owner: ownerId(req) });
    if (!trip) throw new HttpError(404, 'Trip not found');
    trip.items.push(data);
    await trip.save();
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
    const trip = await Trip.findOne({ _id: req.params.id, owner: ownerId(req) });
    if (!trip) throw new HttpError(404, 'Trip not found');
    const item = trip.items.find((i) => i._id?.toString() === req.params.itemId);
    if (!item) throw new HttpError(404, 'Item not found');
    Object.assign(item, data);
    await trip.save();
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureValidObjectId(req.params.id, 'trip id');
    ensureValidObjectId(req.params.itemId, 'item id');
    const trip = await Trip.findOne({ _id: req.params.id, owner: ownerId(req) });
    if (!trip) throw new HttpError(404, 'Trip not found');
    const before = trip.items.length;
    trip.items = trip.items.filter((i) => i._id?.toString() !== req.params.itemId);
    if (trip.items.length === before) throw new HttpError(404, 'Item not found');
    await trip.save();
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

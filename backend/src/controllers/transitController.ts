import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getNearbyTransit } from '../lib/mta';

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function getNearbyTransitHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lat, lng } = nearbySchema.parse(req.query);
    const stations = await getNearbyTransit(lat, lng);
    res.json({ stations });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { HttpError } from '../middleware/error';

export async function searchPhotos(req: Request, res: Response, next: NextFunction) {
  const q = String(req.query.q ?? '').trim();
  if (!q) return next(new HttpError(400, 'Missing query'));

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=2&orientation=landscape`,
      { headers: { Authorization: env.pexelsApiKey } }
    );
    if (!response.ok) throw new HttpError(502, 'Pexels request failed');
    const data = await response.json() as { photos: { src: { large: string } }[] };
    const urls = data.photos.map(p => p.src.large);
    res.json({ urls });
  } catch (err) {
    next(err);
  }
}

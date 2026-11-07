import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Trip } from '../models/Trip';
import { exchangeCodeForToken, getSpotifyUserId, createPlaylistForTrip } from '../lib/spotify';
import { env } from '../config/env';
import { returnUrl } from '../lib/appLinks';

export async function spotifyCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code || !state) {
    res.redirect(`${env.clientOrigin}?spotify_error=access_denied`);
    return;
  }

  let tripId: string;
  let userId: string;
  let native = false;
  try {
    const payload = jwt.verify(state, env.jwtSecret) as { tripId: string; userId: string; native?: boolean };
    tripId = payload.tripId;
    userId = payload.userId;
    native = payload.native === true;
  } catch {
    res.redirect(`${env.clientOrigin}?spotify_error=invalid_state`);
    return;
  }

  try {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      res.redirect(returnUrl(native, '/?spotify_error=trip_not_found'));
      return;
    }
    const isMember = trip.owner.equals(userId) || trip.collaborators.some((c) => c.equals(userId));
    if (!isMember) {
      res.redirect(returnUrl(native, '/?spotify_error=forbidden'));
      return;
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/spotify/callback`;
    const accessToken = await exchangeCodeForToken(code, redirectUri);
    const spotifyUserId = await getSpotifyUserId(accessToken);
    const trackIds = trip.playlist.map((t) => t.spotifyId);
    const playlistUrl = await createPlaylistForTrip(accessToken, spotifyUserId, trip.title, trackIds);

    res.redirect(returnUrl(native, `/trips/${tripId}?playlist_exported=${encodeURIComponent(playlistUrl)}`));
  } catch {
    res.redirect(returnUrl(native, `/trips/${tripId}?spotify_error=export_failed`));
  }
}

import { Request, Response } from 'express';
import { Trip } from '../models/Trip';
import { exchangeCodeForToken, getSpotifyUserId, createPlaylistForTrip } from '../lib/spotify';
import { env } from '../config/env'; // used for clientOrigin redirect

export async function spotifyCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code || !state) {
    res.redirect(`${env.clientOrigin}?spotify_error=access_denied`);
    return;
  }

  let tripId: string;
  try {
    ({ tripId } = JSON.parse(state) as { tripId: string });
  } catch {
    res.redirect(`${env.clientOrigin}?spotify_error=invalid_state`);
    return;
  }

  try {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      res.redirect(`${env.clientOrigin}?spotify_error=trip_not_found`);
      return;
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/spotify/callback`;
    const accessToken = await exchangeCodeForToken(code, redirectUri);
    const spotifyUserId = await getSpotifyUserId(accessToken);
    const trackIds = trip.playlist.map((t) => t.spotifyId);
    const playlistUrl = await createPlaylistForTrip(accessToken, spotifyUserId, trip.title, trackIds);

    res.redirect(`${env.clientOrigin}/trips/${tripId}?playlist_exported=${encodeURIComponent(playlistUrl)}`);
  } catch {
    res.redirect(`${env.clientOrigin}/trips/${tripId}?spotify_error=export_failed`);
  }
}

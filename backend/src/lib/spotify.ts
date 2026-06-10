const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Spotify credentials not configured');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`Spotify token fetch failed: ${res.status}`);
  const data = await res.json() as { access_token: string; expires_in: number };

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  const url = `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=8`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);
  const data = await res.json() as { tracks: { items: SpotifyTrack[] } };
  return data.tracks.items;
}

export function getSpotifyAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID ?? '',
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'playlist-modify-public playlist-modify-private',
    state,
  });
  return `${SPOTIFY_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID ?? '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? '';
  const res = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }).toString(),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function getSpotifyUserId(accessToken: string): Promise<string> {
  const res = await fetch(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to get Spotify user: ${res.status}`);
  const data = await res.json() as { id: string };
  return data.id;
}

export async function createPlaylistForTrip(
  accessToken: string,
  spotifyUserId: string,
  tripTitle: string,
  trackIds: string[],
): Promise<string> {
  const createRes = await fetch(`${SPOTIFY_API_BASE}/users/${spotifyUserId}/playlists`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: tripTitle, description: 'Exported from Voyage', public: true }),
  });
  if (!createRes.ok) throw new Error(`Failed to create playlist: ${createRes.status}`);
  const playlist = await createRes.json() as { id: string; external_urls: { spotify: string } };

  if (trackIds.length > 0) {
    const uris = trackIds.map((id) => `spotify:track:${id}`);
    const addRes = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris }),
    });
    if (!addRes.ok) throw new Error(`Failed to add tracks: ${addRes.status}`);
  }

  return playlist.external_urls.spotify;
}


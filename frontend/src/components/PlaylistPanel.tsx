import { useState, useRef } from 'react';
import * as tripsApi from '../api/trips';
import type { Trip, PlaylistTrack, SpotifySearchResult } from '../types';

interface Props {
  trip: Trip;
  currentUserId?: string;
  onUpdate: (updated: Trip) => void;
}

export default function PlaylistPanel({ trip, currentUserId, onUpdate }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [vibeInput, setVibeInput] = useState('');
  const [vibeResults, setVibeResults] = useState<SpotifySearchResult[]>([]);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeError, setVibeError] = useState<string | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const tracks = await tripsApi.searchSpotify(trip._id, value.trim());
        setResults(tracks);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  async function handleVibeSearch() {
    if (!vibeInput.trim()) return;
    setVibeLoading(true);
    setVibeError(null);
    setVibeResults([]);
    try {
      const { results: tracks } = await tripsApi.recommendByVibe(trip._id, vibeInput.trim());
      setVibeResults(tracks);
    } catch {
      setVibeError('Could not get recommendations — try different keywords.');
    } finally {
      setVibeLoading(false);
    }
  }

  async function handleAdd(track: SpotifySearchResult, fromVibe = false) {
    setAddingId(track.spotifyId);
    try {
      const updated = await tripsApi.addTrack(trip._id, track);
      onUpdate(updated);
      if (fromVibe) {
        setVibeResults((prev) => prev.filter((r) => r.spotifyId !== track.spotifyId));
      } else {
        setResults((prev) => prev.filter((r) => r.spotifyId !== track.spotifyId));
      }
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(trackId: string) {
    setRemovingId(trackId);
    try {
      const updated = await tripsApi.removeTrack(trip._id, trackId);
      onUpdate(updated);
    } finally {
      setRemovingId(null);
    }
  }

  const playlistIds = new Set(trip.playlist.map((t) => t.spotifyId));

  function TrackRow({ track, fromVibe = false }: { track: SpotifySearchResult; fromVibe?: boolean }) {
    const alreadyAdded = playlistIds.has(track.spotifyId);
    return (
      <li className="playlist-result-item">
        {track.albumArt && (
          <img src={track.albumArt} alt={track.title} className="playlist-art" />
        )}
        <div className="playlist-track-info">
          <span className="playlist-track-title">{track.title}</span>
          <span className="playlist-track-artist muted small">{track.artist}</span>
        </div>
        <button
          type="button"
          className="small-btn"
          disabled={alreadyAdded || addingId === track.spotifyId}
          onClick={() => handleAdd(track, fromVibe)}
        >
          {alreadyAdded ? 'Added' : addingId === track.spotifyId ? '…' : '+ Add'}
        </button>
      </li>
    );
  }

  return (
    <div id="trip-playlist-section" className="playlist-panel">
      <h3 className="playlist-heading">🎵 Trip Playlist</h3>

      {/* Manual search */}
      <div className="playlist-search-wrap">
        <input
          className="playlist-search-input"
          placeholder="Search for a song…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        {searching && <span className="playlist-searching muted small">Searching…</span>}
      </div>

      {results.length > 0 && (
        <ul className="playlist-results">
          {results.map((track) => <TrackRow key={track.spotifyId} track={track} />)}
        </ul>
      )}

      {/* Vibe recommender */}
      <div className="vibe-recommender">
        <p className="vibe-label">✨ Recommend by vibe</p>
        <div className="vibe-input-row">
          <input
            className="playlist-search-input"
            placeholder="e.g. chill beach sunset, epic mountain hike…"
            value={vibeInput}
            onChange={(e) => setVibeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleVibeSearch(); }}
          />
          <button
            type="button"
            className="small-btn"
            disabled={vibeLoading || !vibeInput.trim()}
            onClick={handleVibeSearch}
          >
            {vibeLoading ? 'Finding…' : 'Find'}
          </button>
        </div>
        {vibeError && <p className="error small">{vibeError}</p>}
        {vibeResults.length > 0 && (
          <ul className="playlist-results">
            {vibeResults.map((track) => <TrackRow key={track.spotifyId} track={track} fromVibe />)}
          </ul>
        )}
      </div>

      {/* Current playlist */}
      {trip.playlist.length === 0 ? (
        <p className="muted small playlist-empty">No songs yet — search or use vibe recommendations above.</p>
      ) : (
        <ul className="playlist-tracks">
          {trip.playlist.map((track: PlaylistTrack) => (
            <li key={track._id} className="playlist-track-item">
              {track.albumArt && (
                <img src={track.albumArt} alt={track.title} className="playlist-art" />
              )}
              <div className="playlist-track-info">
                <a
                  href={`https://open.spotify.com/track/${track.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="playlist-track-title playlist-track-link"
                >
                  {track.title}
                </a>
                <span className="playlist-track-artist muted small">{track.artist}</span>
              </div>
              <iframe
                src={`https://open.spotify.com/embed/track/${track.spotifyId}?utm_source=generator`}
                width="100%"
                height="80"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="playlist-embed"
              />
              {currentUserId && (
                <button
                  type="button"
                  className="ghost small-btn playlist-remove-btn"
                  disabled={removingId === track._id}
                  onClick={() => handleRemove(track._id)}
                >
                  {removingId === track._id ? '…' : '✕'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

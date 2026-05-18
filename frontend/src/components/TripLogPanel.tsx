import { useRef, useState } from 'react';
import * as tripsApi from '../api/trips';
import type { Trip, LogPhoto } from '../types';
import { compressImage } from '../utils/image';

interface Props {
  trip: Trip;
  currentUserId?: string;
  onUpdate: (updated: Trip) => void;
}

const STARS = [1, 2, 3, 4, 5];

function StarRating({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="star-rating">
      {STARS.map((s) => (
        <button
          key={s}
          type="button"
          className={`star-btn${s <= (hovered || value || 0) ? ' star-btn--active' : ''}`}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          aria-label={`${s} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function TripLogPanel({ trip, currentUserId, onUpdate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [ratingItemId, setRatingItemId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | ''>('');
  const [caption, setCaption] = useState('');

  const totalDays = Math.round(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000
  ) + 1;

  const totalSpent = trip.items.reduce((s, i) => s + (i.cost ?? 0), 0);
  const itemsWithCost = trip.items.filter((i) => i.cost !== undefined).length;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const url = await compressImage(file);
      const updated = await tripsApi.addLogPhoto(trip._id, {
        url,
        day: selectedDay || undefined,
        caption: caption.trim() || undefined,
      });
      onUpdate(updated);
      setCaption('');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto(photoId: string) {
    setRemovingId(photoId);
    try {
      const updated = await tripsApi.removeLogPhoto(trip._id, photoId);
      onUpdate(updated);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRate(itemId: string, rating: number) {
    setRatingItemId(itemId);
    try {
      const updated = await tripsApi.rateItem(trip._id, itemId, rating);
      onUpdate(updated);
    } finally {
      setRatingItemId(null);
    }
  }

  function getUserRating(itemId: string) {
    return trip.log.ratings.find(
      (r) => r.itemId === itemId && r.userId === currentUserId
    )?.rating;
  }

  const photosByDay = trip.log.photos.reduce<Record<string, LogPhoto[]>>((acc, p) => {
    const key = p.day ? `Day ${p.day}` : 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="trip-log-panel">

      {/* Stats */}
      <div className="log-stats-row">
        <div className="log-stat">
          <span className="log-stat-value">{totalDays}</span>
          <span className="log-stat-label">days</span>
        </div>
        <div className="log-stat">
          <span className="log-stat-value">{trip.items.length}</span>
          <span className="log-stat-label">activities</span>
        </div>
        {totalSpent > 0 && (
          <div className="log-stat">
            <span className="log-stat-value">${totalSpent.toFixed(0)}</span>
            <span className="log-stat-label">spent</span>
          </div>
        )}
        {trip.budget && (
          <div className="log-stat">
            <span className="log-stat-value">${Math.max(0, trip.budget - totalSpent).toFixed(0)}</span>
            <span className="log-stat-label">{totalSpent <= trip.budget ? 'under budget' : 'over budget'}</span>
          </div>
        )}
        <div className="log-stat">
          <span className="log-stat-value">{trip.log.photos.length}</span>
          <span className="log-stat-label">photos</span>
        </div>
      </div>

      {/* Photo album */}
      <section className="log-section">
        <h3 className="log-section-heading">📸 Photo Album</h3>
        <div className="log-upload-row">
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value === '' ? '' : Number(e.target.value))}
            className="log-day-select"
          >
            <option value="">No day tag</option>
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>Day {d}</option>
            ))}
          </select>
          <input
            className="log-caption-input"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            type="button"
            className="small-btn"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Uploading…' : '+ Add photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        {trip.log.photos.length === 0 ? (
          <p className="muted small">No photos yet — add memories from your trip.</p>
        ) : (
          Object.entries(photosByDay).map(([label, photos]) => (
            <div key={label} className="log-album-group">
              <p className="log-album-label">{label}</p>
              <div className="log-album-grid">
                {photos.map((photo: LogPhoto) => (
                  <div key={photo._id} className="log-album-item">
                    <img
                      src={photo.url}
                      alt={photo.caption ?? 'Trip photo'}
                      className="log-album-img"
                    />
                    {photo.caption && <p className="log-album-caption">{photo.caption}</p>}
                    {currentUserId && (
                      <button
                        type="button"
                        className="ghost small-btn log-album-remove"
                        disabled={removingId === photo._id}
                        onClick={() => handleRemovePhoto(photo._id)}
                      >
                        {removingId === photo._id ? '…' : '✕'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Ratings */}
      {itemsWithCost > 0 || trip.items.length > 0 ? (
        <section className="log-section">
          <h3 className="log-section-heading">⭐ Rate Your Experiences</h3>
          <div className="log-ratings-list">
            {trip.items
              .slice()
              .sort((a, b) => a.day - b.day || a.position - b.position)
              .map((item) => (
                <div key={item._id} className="log-rating-row">
                  <div className="log-rating-info">
                    <span className="log-rating-title">{item.title}</span>
                    <span className="muted small">Day {item.day}</span>
                  </div>
                  <StarRating
                    value={getUserRating(item._id)}
                    onChange={(r) => {
                      if (ratingItemId !== item._id) handleRate(item._id, r);
                    }}
                  />
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

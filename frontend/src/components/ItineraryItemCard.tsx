import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { ItineraryItem, ItemCategory, NewItemInput } from '../types';

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: 'Food',
  activity: 'Activity',
  attraction: 'Attraction',
};
import { compressImage } from '../utils/image';
import Lightbox from './Lightbox';

interface Props {
  item: ItineraryItem;
  totalDays: number;
  saving: boolean;
  onSave: (patch: Partial<NewItemInput>) => Promise<void>;
  onDelete: () => Promise<void>;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  currentUserId?: string;
  onReact?: (emoji: string) => Promise<void>;
}

function toDraft(item: ItineraryItem): NewItemInput {

  return {
    day: item.day,
    startTime: item.startTime ?? '',
    endTime: item.endTime ?? '',
    title: item.title,
    notes: item.notes ?? '',
    imageUrl: item.imageUrl,
    cost: item.cost,
    category: item.category,
    location: {
      name: item.location?.name ?? '',
      address: item.location?.address ?? '',
      lat: item.location?.lat,
      lng: item.location?.lng,
    },
  };
}

function toPatch(draft: NewItemInput): Partial<NewItemInput> {
  const hasLocation =
    !!draft.location &&
    (draft.location.name ||
      draft.location.address ||
      draft.location.lat !== undefined ||
      draft.location.lng !== undefined);

  return {
    day: Number(draft.day),
    title: draft.title,
    startTime: draft.startTime || undefined,
    endTime: draft.endTime || undefined,
    notes: draft.notes || undefined,
    imageUrl: draft.imageUrl || undefined,
    cost: draft.cost !== undefined && !Number.isNaN(draft.cost) ? Number(draft.cost) : undefined,
    category: draft.category || undefined,
    location: hasLocation
      ? {
        name: draft.location?.name || undefined,
        address: draft.location?.address || undefined,
        lat:
          draft.location?.lat !== undefined && !Number.isNaN(draft.location.lat)
            ? Number(draft.location.lat)
            : undefined,
        lng:
          draft.location?.lng !== undefined && !Number.isNaN(draft.location.lng)
            ? Number(draft.location.lng)
            : undefined,
      }
      : undefined,
  };
}

function formatTime(time: string | undefined) {
  let formattedString: string = "";
  if (time !== undefined) {
    let hour: number = parseInt(time.substring(0, 2));
    if (hour < 12) {
      formattedString += time + " AM";
    } else if (hour == 12) {
      formattedString += time + " PM";
    } else {
      formattedString += (hour - 12) + time.substring(2) + " PM";
    }
    return formattedString;
  }
}

export default function ItineraryItemCard({
  item,
  totalDays,
  saving,
  onSave,
  onDelete,
  dragHandleProps,
  currentUserId,
  onReact,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<NewItemInput>(() => toDraft(item));
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [suggestedPhotos, setSuggestedPhotos] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleAutoRef = useRef<google.maps.places.Autocomplete | null>(null);

  const titleRefCallback = useCallback((el: HTMLInputElement | null) => {
    if (titleAutoRef.current) {
      google.maps.event.clearInstanceListeners(titleAutoRef.current);
      titleAutoRef.current = null;
    }
    if (!el) return;
    titleAutoRef.current = new google.maps.places.Autocomplete(el, {
      fields: ['name', 'formatted_address', 'geometry', 'photos'],
    });
    titleAutoRef.current.addListener('place_changed', () => {
      const place = titleAutoRef.current!.getPlace();
      if (!place.name) return;
      setDraft((prev) => ({
        ...prev,
        title: place.name!,
        location: {
          name: place.name,
          address: place.formatted_address,
          lat: place.geometry?.location?.lat(),
          lng: place.geometry?.location?.lng(),
        },
      }));
      if (place.photos?.length) {
        setSuggestedPhotos(
          place.photos.slice(0, 4).map((p) => p.getUrl({ maxWidth: 600, maxHeight: 400 }))
        );
      }
    });
  }, []);

  useEffect(() => {
    if (!editing || !draft.title) return;
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      setSuggestedPhotos([]);
      const container = document.createElement('div');
      document.body.appendChild(container);
      const service = new google.maps.places.PlacesService(container);
      service.findPlaceFromQuery(
        { query: draft.title, fields: ['photos'] },
        (results, status) => {
          if (document.body.contains(container)) document.body.removeChild(container);
          if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]?.photos) {
            setSuggestedPhotos(
              results[0].photos.slice(0, 4).map((p) => p.getUrl({ maxWidth: 600, maxHeight: 400 }))
            );
          }
        }
      );
    }, 350);
    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, draft.title]);

  const REACTION_EMOJIS = ['👍', '👎', '❤️', '🔥', '😂'] as const;
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);

  async function handleReact(emoji: string) {
    if (!onReact) return;
    setReactingEmoji(emoji);
    try {
      await onReact(emoji);
    } finally {
      setReactingEmoji(null);
    }
  }

  function startEdit() {
    setDraft(toDraft(item));
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function handleImageFile(file: File) {
    setCompressing(true);
    try {
      const url = await compressImage(file);
      setDraft((prev) => ({ ...prev, imageUrl: url }));
    } catch {
      setError('Failed to process image');
    } finally {
      setCompressing(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await onSave(toPatch(draft));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function handleDelete() {
    if (!confirm('Remove this item?')) return;
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (editing) {
    return (
      <div className="card item-card editing">
        <form onSubmit={handleSubmit} className="form grid-2">
          <label>
            Day
            <select
              value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}
            >
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              ref={titleRefCallback}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Search a place or type a title…"
              required
            />
          </label>
          <label>
            Start time
            <input
              type="time"
              value={draft.startTime ?? ''}
              onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
            />
          </label>
          <label>
            End time
            <input
              type="time"
              value={draft.endTime ?? ''}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
            />
          </label>
          <label>
            Cost ($)
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Optional"
              value={draft.cost ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, cost: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          </label>
          <label>
            Category
            <select
              value={draft.category ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, category: (e.target.value as ItemCategory) || undefined })
              }
            >
              <option value="">None</option>
              <option value="food">Food</option>
              <option value="activity">Activity</option>
              <option value="attraction">Attraction</option>
            </select>
          </label>
          <label className="full-width">
            Notes
            <textarea
              value={draft.notes ?? ''}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
            />
          </label>
          <fieldset className="full-width">
            <legend>Location</legend>
            <div className="grid-2">
              <label className="full-width">
                Address
                <input
                  value={draft.location?.address ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      location: { ...draft.location, address: e.target.value },
                    })
                  }
                  placeholder="Auto-filled when you pick from title suggestions"
                />
              </label>
              <label>
                Latitude
                <input
                  type="number"
                  step="any"
                  value={draft.location?.lat ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      location: {
                        ...draft.location,
                        lat: e.target.value === '' ? undefined : Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="any"
                  value={draft.location?.lng ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      location: {
                        ...draft.location,
                        lng: e.target.value === '' ? undefined : Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            </div>
          </fieldset>
          <fieldset className="full-width">
            <legend>Photo</legend>
            {draft.imageUrl ? (
              <div className="img-preview-wrap">
                <img src={draft.imageUrl} alt="preview" className="img-preview" />
                <button
                  type="button"
                  className="ghost img-remove-btn"
                  onClick={() => setDraft((prev) => ({ ...prev, imageUrl: undefined }))}
                >
                  Remove photo
                </button>
              </div>
            ) : (
              <div className="photo-options">
                <div className="photo-url-row">
                  <input
                    type="url"
                    placeholder="Paste image URL…"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (urlInput) { setDraft((prev) => ({ ...prev, imageUrl: urlInput })); setUrlInput(''); }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="ghost small-btn"
                    disabled={!urlInput}
                    onClick={() => { setDraft((prev) => ({ ...prev, imageUrl: urlInput })); setUrlInput(''); }}
                  >
                    Use
                  </button>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => fileRef.current?.click()}
                  disabled={compressing}
                >
                  {compressing ? 'Processing…' : '+ Upload from device'}
                </button>
                {suggestedPhotos.length > 0 && (
                  <div className="photo-suggestions-wrap">
                    <span className="small muted">Suggested</span>
                    <div className="photo-suggestions">
                      {suggestedPhotos.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt="suggestion"
                          className="photo-suggestion-thumb"
                          onClick={() => setDraft((prev) => ({ ...prev, imageUrl: url }))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
                e.target.value = '';
              }}
            />
          </fieldset>
          {error && <div className="error full-width">{error}</div>}
          <div className="row full-width">
            <button type="submit" disabled={saving || compressing}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="ghost" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card item-card">
      {lightboxOpen && item.imageUrl && (
        <Lightbox src={item.imageUrl} alt={item.title} onClose={() => setLightboxOpen(false)} />
      )}
      <div className="item-card-body">
        {dragHandleProps && (
          <button
            type="button"
            className="drag-handle"
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            ⋮⋮
          </button>
        )}
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="item-thumb"
            onClick={() => setLightboxOpen(true)}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="item-content">
          {item.category && (
            <span
              className={`rec-badge rec-badge--${item.category}`}
              style={{ marginBottom: 6, display: 'inline-block' }}
            >
              {CATEGORY_LABELS[item.category]}
            </span>
          )}
          <div>
            <strong>
              {item.startTime && item.endTime
                ? `${formatTime(item.startTime)} – ${formatTime(item.endTime)}`
                : item.startTime ?? ''}
            </strong>{' '}
            {item.title}
          </div>
          {item.location?.name && (
            <div className="muted small">
              📍 {item.location.name}
              {item.location.address ? ` · ${item.location.address}` : ''}
            </div>
          )}
          {item.cost !== undefined && (
            <div className="muted small">💰 ${item.cost.toFixed(2)}</div>
          )}
          {item.notes && <p className="small" style={{ margin: '4px 0 0' }}>{item.notes}</p>}
          {error && <div className="error">{error}</div>}
        </div>
      </div>
      <div className="item-card-actions">
        {onReact && (
          <div className="reaction-row">
            {REACTION_EMOJIS.map((emoji) => {
              const reaction = item.reactions?.find((r) => r.emoji === emoji);
              const count = reaction?.userIds.length ?? 0;
              const hasReacted = !!(currentUserId && reaction?.userIds.includes(currentUserId));
              return (
                <button
                  key={emoji}
                  type="button"
                  className={`reaction-btn${hasReacted ? ' reaction-btn--active' : ''}`}
                  onClick={() => handleReact(emoji)}
                  disabled={reactingEmoji === emoji}
                  aria-label={`${emoji} ${count}`}
                >
                  {emoji}
                  {count > 0 && <span className="reaction-count">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
        <button type="button" className="ghost small-btn" onClick={startEdit}>
          Edit
        </button>
        <button type="button" className="danger small-btn" onClick={handleDelete}>
          Remove
        </button>
      </div>
    </div>
  );
}

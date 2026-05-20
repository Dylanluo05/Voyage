import { FormEvent, useState } from 'react';
import type { Trip } from '../types';
import * as tripsApi from '../api/trips';
import { ApiError } from '../api/client';

interface Props {
  trip: Trip;
  isOwner: boolean;
  onUpdate: (trip: Trip) => void;
}

export default function CollaboratorsPanel({ trip, isOwner, onUpdate }: Props) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    try {
      const updated = await tripsApi.inviteCollaborator(trip._id, email);
      onUpdate(updated);
      setEmail('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to invite collaborator');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    setError(null);
    try {
      const updated = await tripsApi.removeCollaborator(trip._id, userId);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove collaborator');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section id="collaborators-section" className="card">
      <h2 style={{ marginBottom: 12 }}>Collaborators</h2>

      {trip.collaborators.length === 0 ? (
        <p className="muted small" style={{ margin: '0 0 12px' }}>
          {isOwner ? 'Invite a friend to edit this trip together.' : 'No collaborators yet.'}
        </p>
      ) : (
        <ul className="collab-list">
          {trip.collaborators.map((c) => (
            <li key={c._id} className="collab-item">
              <div>
                <span style={{ fontWeight: 500 }}>{c.name}</span>
                <span className="muted small"> · {c.email}</span>
              </div>
              {isOwner && (
                <button
                  type="button"
                  className="ghost small-btn"
                  onClick={() => handleRemove(c._id)}
                  disabled={removingId === c._id}
                >
                  {removingId === c._id ? 'Removing…' : 'Remove'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <form onSubmit={handleInvite} className="collab-invite-form">
          <input
            type="email"
            placeholder="Friend's email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={inviting}>
            {inviting ? 'Inviting…' : 'Invite'}
          </button>
        </form>
      )}

      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </section>
  );
}

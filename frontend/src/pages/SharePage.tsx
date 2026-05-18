import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicTrip } from '../api/trips';
import type { Trip, ItineraryItem } from '../types';

function formatTime(time: string | undefined) {
  if (!time) return '';
  const hour = parseInt(time.substring(0, 2));
  if (hour < 12) return time + ' AM';
  if (hour === 12) return time + ' PM';
  return (hour - 12) + time.substring(2) + ' PM';
}

function getDayCount(trip: Trip) {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function getDayLabel(trip: Trip, day: number) {
  const date = new Date(trip.startDate);
  date.setDate(date.getDate() + day - 1);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

const CATEGORY_LABELS = { food: 'Food', activity: 'Activity', attraction: 'Attraction' };

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getPublicTrip(token)
      .then(setTrip)
      .catch(() => setError('This trip link is invalid or no longer available.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="share-page"><p className="muted">Loading…</p></div>;
  if (error || !trip) return <div className="share-page"><p className="error">{error}</p></div>;

  const totalDays = getDayCount(trip);
  const totalCost = trip.items.reduce((sum, i) => sum + (i.cost ?? 0), 0);

  return (
    <div className="share-page">
      <header className="share-header">
        <div className="share-header-inner">
          <h1 className="share-title">{trip.title}</h1>
          <p className="share-meta">
            {trip.destination} · {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' – '}
            {new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}{totalDays} day{totalDays !== 1 ? 's' : ''}
          </p>
          {trip.description && <p className="share-description">{trip.description}</p>}
          <div className="share-stats">
            <span>{trip.items.length} activities</span>
            {totalCost > 0 && <span>~${totalCost.toFixed(0)} estimated</span>}
            {trip.budget && <span>${trip.budget} budget</span>}
          </div>
          <button type="button" className="share-print-btn" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
      </header>

      <main className="share-main">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const dayItems = trip.items
            .filter((item) => item.day === day)
            .sort((a, b) => a.position - b.position);
          if (dayItems.length === 0) return null;
          return (
            <section key={day} className="share-day">
              <h2 className="share-day-heading">
                <span className="share-day-number">Day {day}</span>
                <span className="share-day-date">{getDayLabel(trip, day)}</span>
              </h2>
              <div className="share-items">
                {dayItems.map((item: ItineraryItem) => (
                  <div key={item._id} className="share-item">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="share-item-img"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="share-item-body">
                      {item.category && (
                        <span className={`rec-badge rec-badge--${item.category}`}>
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      )}
                      <div className="share-item-title">
                        {(item.startTime || item.endTime) && (
                          <strong>
                            {item.startTime && item.endTime
                              ? `${formatTime(item.startTime)} – ${formatTime(item.endTime)}`
                              : formatTime(item.startTime)}
                            {' '}
                          </strong>
                        )}
                        {item.title}
                      </div>
                      {item.location?.name && (
                        <div className="share-item-location">
                          📍 {item.location.name}{item.location.address ? ` · ${item.location.address}` : ''}
                        </div>
                      )}
                      {item.cost !== undefined && (
                        <div className="share-item-cost">💰 ${item.cost.toFixed(2)}</div>
                      )}
                      {item.notes && <p className="share-item-notes">{item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="share-footer">
        <p>Shared via Voyage</p>
      </footer>
    </div>
  );
}

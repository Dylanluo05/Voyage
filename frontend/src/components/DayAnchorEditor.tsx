import { useState } from 'react';
import type { DayAnchor, HotelBooking, Trip } from '../types';
import * as tripsApi from '../api/trips';

interface Props {
  trip: Trip;
  day: number;
  anchor: DayAnchor | undefined;
  onUpdate: (trip: Trip) => void;
}

export default function DayAnchorEditor({ trip, day, anchor, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [startAddress, setStartAddress] = useState(anchor?.startAddress ?? '');
  const [endAddress, setEndAddress] = useState(anchor?.endAddress ?? '');
  const [saving, setSaving] = useState(false);

  const hotelsActiveOnDay = trip.hotels.filter((h) => {
    const checkIn = new Date(h.checkIn).getTime();
    const checkOut = new Date(h.checkOut).getTime();
    const dayDate = new Date(trip.startDate);
    dayDate.setDate(dayDate.getDate() + day - 1);
    const t = dayDate.getTime();
    return t >= checkIn && t < checkOut;
  });

  function pullFromHotel(hotel: HotelBooking) {
    setStartAddress(hotel.location);
    setEndAddress(hotel.location);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await tripsApi.updateDayAnchor(
        trip._id,
        day,
        startAddress.trim() || undefined,
        endAddress.trim() || undefined,
      );
      onUpdate(updated);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const hasAnchor = anchor?.startAddress || anchor?.endAddress;

  return (
    <div className="day-anchor-wrap">
      <button
        type="button"
        className="day-anchor-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        {hasAnchor ? '📍 Base location set' : '+ Set base location'}
      </button>

      {open && (
        <div className="day-anchor-editor">
          {hotelsActiveOnDay.length > 0 && (
            <div className="day-anchor-hotel-row">
              <span className="day-anchor-label">Pull from hotel:</span>
              {hotelsActiveOnDay.map((h) => (
                <button
                  key={h._id}
                  type="button"
                  className="ghost small-btn"
                  onClick={() => pullFromHotel(h)}
                >
                  {h.name}
                </button>
              ))}
            </div>
          )}
          <label className="day-anchor-field">
            <span>Start address</span>
            <input
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              placeholder="e.g. hotel address or meeting point"
            />
          </label>
          <label className="day-anchor-field">
            <span>End address</span>
            <input
              value={endAddress}
              onChange={(e) => setEndAddress(e.target.value)}
              placeholder="e.g. hotel address or final destination"
            />
          </label>
          <div className="day-anchor-actions">
            <button type="button" className="small-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="ghost small-btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

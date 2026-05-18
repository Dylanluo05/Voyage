import { useState } from 'react';
import { Trip, HotelBooking } from '../types';
import { addHotel, removeHotel, parseHotelText } from '../api/trips';

interface HotelsPanelProps {
    trip: Trip;
    onUpdate: (updated: Trip) => void;
}

const emptyHotel: Omit<HotelBooking, '_id'> = {
    name: '',
    type: 'hotel',
    location: '',
    checkIn: '',
    checkOut: '',
    pricePerNight: 0,
    guests: 1,
    confirmationNumber: '',
    notes: '',
};

const TYPE_LABELS: Record<HotelBooking['type'], string> = {
    hotel: 'Hotel',
    airbnb: 'Airbnb',
    hostel: 'Hostel',
    other: 'Other',
};

export default function HotelsPanel({ trip, onUpdate }: HotelsPanelProps) {
    const [form, setForm] = useState<Omit<HotelBooking, '_id'>>(emptyHotel);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importMode, setImportMode] = useState(false);
    const [importText, setImportText] = useState('');
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);

    function openManual() {
        setImportMode(false);
        setShowForm(true);
        setForm(emptyHotel);
        setError(null);
    }

    function openImport() {
        setShowForm(false);
        setImportMode(true);
        setImportText('');
        setParseError(null);
    }

    function cancelAll() {
        setShowForm(false);
        setImportMode(false);
        setImportText('');
        setError(null);
        setParseError(null);
    }

    async function handleParse() {
        if (!importText.trim()) return;
        setParsing(true);
        setParseError(null);
        try {
            const parsed = await parseHotelText(trip._id, importText);
            setForm({
                name: parsed.name ?? '',
                type: parsed.type ?? 'hotel',
                location: parsed.location ?? '',
                checkIn: parsed.checkIn ?? '',
                checkOut: parsed.checkOut ?? '',
                pricePerNight: parsed.pricePerNight ?? 0,
                guests: parsed.guests ?? 1,
                confirmationNumber: parsed.confirmationNumber ?? '',
                notes: parsed.notes ?? '',
            });
            setImportMode(false);
            setImportText('');
            setShowForm(true);
        } catch (err: any) {
            setParseError(err?.message ?? 'Could not parse confirmation text');
        } finally {
            setParsing(false);
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const updated = await addHotel(trip._id, {
                ...form,
                confirmationNumber: form.confirmationNumber || undefined,
                notes: form.notes || undefined,
            });
            onUpdate(updated);
            setForm(emptyHotel);
            setShowForm(false);
        } catch (err: any) {
            setError(err?.message ?? 'Failed to add hotel');
        } finally {
            setSaving(false);
        }
    }

    async function handleRemove(hotelId: string) {
        setRemoving(hotelId);
        try {
            const updated = await removeHotel(trip._id, hotelId);
            onUpdate(updated);
        } finally {
            setRemoving(null);
        }
    }

    return (
        <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Hotels</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(showForm || importMode) ? (
                        <button type="button" className="ghost small-btn" onClick={cancelAll}>Cancel</button>
                    ) : (
                        <>
                            <button type="button" className="ghost small-btn" onClick={openImport}>Import from email</button>
                            <button type="button" className="ghost small-btn" onClick={openManual}>+ Add hotel</button>
                        </>
                    )}
                </div>
            </div>

            {trip.hotels.length === 0 && !showForm && !importMode && (
                <p className="muted small">No hotels added yet.</p>
            )}

            {trip.hotels.map((hotel) => (
                <div key={hotel._id} className="booking-card">
                    <div className="booking-card-header">
                        <div>
                            <strong>{hotel.name}</strong>
                            <span className="booking-type-badge">{TYPE_LABELS[hotel.type]}</span>
                        </div>
                        <button
                            type="button"
                            className="ghost small-btn"
                            disabled={removing === hotel._id}
                            onClick={() => handleRemove(hotel._id)}
                        >
                            {removing === hotel._id ? 'Removing…' : 'Remove'}
                        </button>
                    </div>
                    <div className="booking-card-details">
                        <span>📍 {hotel.location}</span>
                        <span>📅 {hotel.checkIn} → {hotel.checkOut}</span>
                        <span>💰 ${hotel.pricePerNight}/night</span>
                        <span>👥 {hotel.guests} guest{hotel.guests !== 1 ? 's' : ''}</span>
                        {hotel.confirmationNumber && <span>🔖 #{hotel.confirmationNumber}</span>}
                    </div>
                    {hotel.notes && <p className="booking-notes muted small">{hotel.notes}</p>}
                </div>
            ))}

            {importMode && (
                <div className="import-box">
                    <p className="small muted" style={{ margin: '0 0 8px' }}>
                        Paste your hotel confirmation email below — any format works.
                    </p>
                    <textarea
                        className="import-textarea"
                        rows={8}
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        placeholder="Paste confirmation email here…"
                    />
                    {parseError && <p className="error">{parseError}</p>}
                    <button
                        type="button"
                        disabled={parsing || !importText.trim()}
                        onClick={handleParse}
                        style={{ marginTop: 8 }}
                    >
                        {parsing ? 'Parsing…' : 'Extract details'}
                    </button>
                </div>
            )}

            {showForm && (
                <form onSubmit={handleAdd} className="form grid-2" style={{ marginTop: 16 }}>
                    <label>
                        Name
                        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hotel name" />
                    </label>
                    <label>
                        Type
                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as HotelBooking['type'] })}>
                            <option value="hotel">Hotel</option>
                            <option value="airbnb">Airbnb</option>
                            <option value="hostel">Hostel</option>
                            <option value="other">Other</option>
                        </select>
                    </label>
                    <label className="full-width">
                        Location
                        <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Address or city" />
                    </label>
                    <label>
                        Check-in
                        <input required type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
                    </label>
                    <label>
                        Check-out
                        <input required type="date" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
                    </label>
                    <label>
                        Price per night ($)
                        <input required type="number" min="0" step="0.01" value={form.pricePerNight} onChange={(e) => setForm({ ...form, pricePerNight: Number(e.target.value) })} />
                    </label>
                    <label>
                        Guests
                        <input required type="number" min="1" value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })} />
                    </label>
                    <label className="full-width">
                        Confirmation number (optional)
                        <input value={form.confirmationNumber ?? ''} onChange={(e) => setForm({ ...form, confirmationNumber: e.target.value })} placeholder="e.g. ABC123" />
                    </label>
                    <label className="full-width">
                        Notes (optional)
                        <textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra details…" />
                    </label>
                    {error && <p className="error full-width">{error}</p>}
                    <button type="submit" className="full-width" disabled={saving}>
                        {saving ? 'Saving…' : 'Add hotel'}
                    </button>
                </form>
            )}
        </section>
    );
}

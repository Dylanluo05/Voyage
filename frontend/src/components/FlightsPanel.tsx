import { useState } from 'react';
import { Trip, FlightBooking } from '../types';
import { addFlight, removeFlight, parseFlightText } from '../api/trips';

interface FlightsPanelProps {
    trip: Trip;
    onUpdate: (updated: Trip) => void;
}

const emptyFlight: Omit<FlightBooking, '_id'> = {
    tripType: 'one-way',
    airline: '',
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureTime: '',
    arrivalTime: '',
    returnDepartureTime: '',
    returnArrivalTime: '',
    passengers: 1,
    cabinClass: 'economy',
    price: 0,
    confirmationNumber: '',
    notes: '',
};

const CABIN_LABELS: Record<FlightBooking['cabinClass'], string> = {
    economy: 'Economy',
    'premium-economy': 'Premium Economy',
    business: 'Business',
    'first-class': 'First Class',
};

export default function FlightsPanel({ trip, onUpdate }: FlightsPanelProps) {
    const [form, setForm] = useState<Omit<FlightBooking, '_id'>>(emptyFlight);
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
        setForm(emptyFlight);
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
            const parsed = await parseFlightText(trip._id, importText);
            setForm({
                tripType: parsed.tripType ?? 'one-way',
                airline: parsed.airline ?? '',
                flightNumber: parsed.flightNumber ?? '',
                departureAirport: parsed.departureAirport ?? '',
                arrivalAirport: parsed.arrivalAirport ?? '',
                departureTime: parsed.departureTime ?? '',
                arrivalTime: parsed.arrivalTime ?? '',
                returnDepartureTime: parsed.returnDepartureTime ?? '',
                returnArrivalTime: parsed.returnArrivalTime ?? '',
                passengers: parsed.passengers ?? 1,
                cabinClass: parsed.cabinClass ?? 'economy',
                price: parsed.price ?? 0,
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
            const payload = { ...form };
            if (payload.tripType === 'one-way') {
                delete payload.returnDepartureTime;
                delete payload.returnArrivalTime;
            }
            const updated = await addFlight(trip._id, {
                ...payload,
                notes: payload.notes || undefined,
            });
            onUpdate(updated);
            setForm(emptyFlight);
            setShowForm(false);
        } catch (err: any) {
            setError(err?.message ?? 'Failed to add flight');
        } finally {
            setSaving(false);
        }
    }

    async function handleRemove(flightId: string) {
        setRemoving(flightId);
        try {
            const updated = await removeFlight(trip._id, flightId);
            onUpdate(updated);
        } finally {
            setRemoving(null);
        }
    }

    return (
        <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Flights</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(showForm || importMode) ? (
                        <button type="button" className="ghost small-btn" onClick={cancelAll}>Cancel</button>
                    ) : (
                        <>
                            <button type="button" className="ghost small-btn" onClick={openImport}>Import from email</button>
                            <button type="button" className="ghost small-btn" onClick={openManual}>+ Add flight</button>
                        </>
                    )}
                </div>
            </div>

            {trip.flights.length === 0 && !showForm && !importMode && (
                <p className="muted small">No flights added yet.</p>
            )}

            {trip.flights.map((flight) => (
                <div key={flight._id} className="booking-card">
                    <div className="booking-card-header">
                        <div>
                            <strong>{flight.airline} {flight.flightNumber}</strong>
                            <span className="booking-type-badge">{flight.tripType === 'round-trip' ? 'Round-trip' : 'One-way'}</span>
                            <span className="booking-type-badge">{CABIN_LABELS[flight.cabinClass]}</span>
                        </div>
                        <button
                            type="button"
                            className="ghost small-btn"
                            disabled={removing === flight._id}
                            onClick={() => handleRemove(flight._id)}
                        >
                            {removing === flight._id ? 'Removing…' : 'Remove'}
                        </button>
                    </div>
                    <div className="booking-card-details">
                        <span>✈️ {flight.departureAirport} → {flight.arrivalAirport}</span>
                        <span>🛫 Departs: {flight.departureTime}</span>
                        <span>🛬 Arrives: {flight.arrivalTime}</span>
                        {flight.tripType === 'round-trip' && flight.returnDepartureTime && (
                            <span>🔄 Return: {flight.returnDepartureTime} → {flight.returnArrivalTime}</span>
                        )}
                        <span>👥 {flight.passengers} passenger{flight.passengers !== 1 ? 's' : ''}</span>
                        <span>💰 ${flight.price}</span>
                        <span>🔖 #{flight.confirmationNumber}</span>
                    </div>
                    {flight.notes && <p className="booking-notes muted small">{flight.notes}</p>}
                </div>
            ))}

            {importMode && (
                <div className="import-box">
                    <p className="small muted" style={{ margin: '0 0 8px' }}>
                        Paste your flight confirmation email below — any format works.
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
                        Trip type
                        <select value={form.tripType} onChange={(e) => setForm({ ...form, tripType: e.target.value as FlightBooking['tripType'] })}>
                            <option value="one-way">One-way</option>
                            <option value="round-trip">Round-trip</option>
                        </select>
                    </label>
                    <label>
                        Cabin class
                        <select value={form.cabinClass} onChange={(e) => setForm({ ...form, cabinClass: e.target.value as FlightBooking['cabinClass'] })}>
                            <option value="economy">Economy</option>
                            <option value="premium-economy">Premium Economy</option>
                            <option value="business">Business</option>
                            <option value="first-class">First Class</option>
                        </select>
                    </label>
                    <label>
                        Airline
                        <input required value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} placeholder="e.g. United Airlines" />
                    </label>
                    <label>
                        Flight number
                        <input required value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} placeholder="e.g. UA123" />
                    </label>
                    <label>
                        Departure airport
                        <input required value={form.departureAirport} onChange={(e) => setForm({ ...form, departureAirport: e.target.value })} placeholder="e.g. JFK" />
                    </label>
                    <label>
                        Arrival airport
                        <input required value={form.arrivalAirport} onChange={(e) => setForm({ ...form, arrivalAirport: e.target.value })} placeholder="e.g. LAX" />
                    </label>
                    <label>
                        Departure time
                        <input required type="datetime-local" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} />
                    </label>
                    <label>
                        Arrival time
                        <input required type="datetime-local" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} />
                    </label>
                    {form.tripType === 'round-trip' && (
                        <>
                            <label>
                                Return departure time
                                <input required type="datetime-local" value={form.returnDepartureTime ?? ''} onChange={(e) => setForm({ ...form, returnDepartureTime: e.target.value })} />
                            </label>
                            <label>
                                Return arrival time
                                <input required type="datetime-local" value={form.returnArrivalTime ?? ''} onChange={(e) => setForm({ ...form, returnArrivalTime: e.target.value })} />
                            </label>
                        </>
                    )}
                    <label>
                        Passengers
                        <input required type="number" min="1" value={form.passengers} onChange={(e) => setForm({ ...form, passengers: Number(e.target.value) })} />
                    </label>
                    <label>
                        Total price ($)
                        <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                    </label>
                    <label className="full-width">
                        Confirmation number
                        <input required value={form.confirmationNumber} onChange={(e) => setForm({ ...form, confirmationNumber: e.target.value })} placeholder="e.g. ABC123" />
                    </label>
                    <label className="full-width">
                        Notes (optional)
                        <textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra details…" />
                    </label>
                    {error && <p className="error full-width">{error}</p>}
                    <button type="submit" className="full-width" disabled={saving}>
                        {saving ? 'Saving…' : 'Add flight'}
                    </button>
                </form>
            )}
        </section>
    );
}

import { useState, useMemo } from "react";
import { Trip } from "../types";
import { updateBudget } from "../api/trips";
import CircularProgress from './CircularProgress';

interface BudgetPanelProps {
    trip: Trip;
    onUpdate: (updated: Trip) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    food: '#D4943A',
    activity: '#2C7A7B',
    attraction: '#0F4C5C',
    misc: '#FF6B6B',
};

function nightsBetween(checkIn: string, checkOut: string): number {
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function BudgetPanel({ trip, onUpdate }: BudgetPanelProps) {
    const [budgetInput, setBudgetInput] = useState<string>('' + (trip.budget ?? ''));
    const [saving, setSaving] = useState(false);

    const itineraryCost = useMemo(() =>
        trip.items.reduce((sum, item) => sum + (item.cost ?? 0), 0),
        [trip.items]
    );

    const hotelCost = useMemo(() =>
        trip.hotels.reduce((sum, hotel) => {
            const nights = nightsBetween(hotel.checkIn, hotel.checkOut);
            return sum + (hotel.pricePerNight * nights) / hotel.guests;
        }, 0),
        [trip.hotels]
    );

    const flightCost = useMemo(() =>
        trip.flights.reduce((sum, f) => sum + f.price, 0),
        [trip.flights]
    );

    const totalSpent = itineraryCost + hotelCost + flightCost;

    const byDay = useMemo(() => {
        const map: Record<number, number> = {};
        for (const item of trip.items) {
            map[item.day] = (map[item.day] ?? 0) + (item.cost ?? 0);
        }
        return map;
    }, [trip.items]);

    const byCategory = useMemo(() => {
        const map: Record<string, number> = {};
        for (const item of trip.items) {
            const cat = item.category ?? 'misc';
            map[cat] = (map[cat] ?? 0) + (item.cost ?? 0);
        }
        return map;
    }, [trip.items]);

    async function handleSave() {
        if (Number.isNaN(parseFloat(budgetInput))) return;
        setSaving(true);
        try {
            const updated = await updateBudget(trip._id, parseFloat(budgetInput));
            onUpdate(updated);
        } finally {
            setSaving(false);
        }
    }

    const budget = trip.budget ?? 0;
    const remaining = budget ? budget - totalSpent : null;
    const overBudget = remaining !== null && remaining < 0;
    const spentPct = budget ? Math.min(100, (totalSpent / budget) * 100) : 0;

    const sources = [
        { label: 'Itinerary', icon: '📍', cost: itineraryCost, color: '#0F4C5C' },
        { label: 'Hotels', icon: '🏨', cost: hotelCost, color: '#2C7A7B' },
        { label: 'Flights', icon: '✈️', cost: flightCost, color: '#D4943A' },
    ].filter(s => s.cost > 0);

    return (
        <section id="budget-section" className="card">
            <div className="budget-header-row">
                <h2 style={{ margin: 0 }}>Budget</h2>
                <div className="budget-set-row">
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Set budget…"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        className="budget-input"
                    />
                    <button disabled={saving} onClick={handleSave} className="budget-save-btn">
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="budget-stats-row">
                <div className="budget-stat">
                    <span className="budget-stat-label">Budget</span>
                    <span className="budget-stat-value">${budget ? budget.toLocaleString() : '—'}</span>
                </div>
                <div className="budget-stat">
                    <span className="budget-stat-label">Spent</span>
                    <span className="budget-stat-value">${totalSpent.toLocaleString()}</span>
                </div>
                <div className="budget-stat">
                    <span className="budget-stat-label">Remaining</span>
                    <span className="budget-stat-value" style={{ color: overBudget ? 'var(--coral)' : 'var(--teal)' }}>
                        {remaining === null ? '—' : overBudget
                            ? `-$${Math.abs(remaining).toLocaleString()}`
                            : `$${remaining.toLocaleString()}`}
                    </span>
                </div>
            </div>

            {budget > 0 && (
                <div className="budget-progress-wrap">
                    <div className="budget-progress-bar">
                        <div
                            className="budget-progress-fill"
                            style={{
                                width: `${spentPct}%`,
                                background: overBudget
                                    ? 'var(--coral)'
                                    : 'linear-gradient(90deg, #0F4C5C, #2C7A7B)',
                            }}
                        />
                    </div>
                    <div className="budget-progress-labels">
                        <span className="budget-pct-label">{spentPct.toFixed(1)}% used</span>
                        {overBudget && (
                            <span className="budget-over-label">Over budget by ${Math.abs(remaining!).toLocaleString()}</span>
                        )}
                    </div>
                </div>
            )}

            {sources.length > 0 && (
                <div className="budget-section">
                    <p className="budget-section-label">Cost breakdown</p>
                    <div className="budget-sources">
                        {sources.map(({ label, icon, cost, color }) => {
                            const pct = totalSpent > 0 ? (cost / totalSpent) * 100 : 0;
                            return (
                                <div key={label} className="budget-source-row">
                                    <div className="budget-source-left">
                                        <span className="budget-source-icon">{icon}</span>
                                        <span className="budget-source-label">{label}</span>
                                    </div>
                                    <div className="budget-source-bar-wrap">
                                        <div
                                            className="budget-source-bar-fill"
                                            style={{ width: `${pct}%`, background: color }}
                                        />
                                    </div>
                                    <div className="budget-source-right">
                                        <span className="budget-source-pct">{pct.toFixed(0)}%</span>
                                        <span className="budget-source-amount">${cost.toLocaleString()}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {Object.keys(byDay).length > 0 && (
                <div className="budget-section">
                    <p className="budget-section-label">Itinerary by day</p>
                    <div className="budget-circles-row">
                        {Object.entries(byDay).map(([day, cost]) => (
                            <div key={day} className="budget-circle-item">
                                <CircularProgress
                                    value={cost}
                                    max={itineraryCost || 1}
                                    label={`Day ${day}\n$${cost.toLocaleString()}`}
                                    size={120}
                                    color="#2C7A7B"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {Object.keys(byCategory).length > 0 && (
                <div className="budget-section">
                    <p className="budget-section-label">Itinerary by category</p>
                    <div className="budget-circles-row">
                        {Object.entries(byCategory).map(([category, cost]) => (
                            <div key={category} className="budget-circle-item">
                                <CircularProgress
                                    value={cost}
                                    max={itineraryCost || 1}
                                    label={`${category.charAt(0).toUpperCase() + category.slice(1)}\n$${cost.toLocaleString()}`}
                                    size={120}
                                    color={CATEGORY_COLORS[category] ?? '#2C7A7B'}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

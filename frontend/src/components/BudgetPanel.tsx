import { useState, useMemo, useEffect } from "react";
import { Trip } from "../types";
import { updateBudget } from "../api/trips";
import { useAuth } from "../context/AuthContext";
import { getMyBudget, getMySpending } from "../utils/budget";
import CircularProgress from './CircularProgress';
import { Icon, type IconName } from './Icon';
import Reveal from './Reveal';

interface BudgetPanelProps {
    trip: Trip;
    onUpdate: (updated: Trip) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    food: '#f59e0b',
    activity: '#0b76dd',
    attraction: '#0d9488',
    misc: '#6b7280',
};

export default function BudgetPanel({ trip, onUpdate }: BudgetPanelProps) {
    const { user } = useAuth();
    const budget = getMyBudget(trip, user?.id) ?? 0;
    const [budgetInput, setBudgetInput] = useState<string>('' + (budget || ''));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Keep the field in step with the saved value (e.g. after a save from another device)
    useEffect(() => {
        setBudgetInput('' + (budget || ''));
    }, [budget]);

    const spending = useMemo(() => getMySpending(trip, user?.id), [trip, user?.id]);
    const { itinerary: itineraryCost, hotels: hotelCost, flights: flightCost, expenses: expenseCost, total: totalSpent } = spending;

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
        const amount = parseFloat(budgetInput);
        if (Number.isNaN(amount) || amount < 0) {
            setError('Enter a budget of $0 or more.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const updated = await updateBudget(trip._id, amount);
            onUpdate(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save your budget.');
        } finally {
            setSaving(false);
        }
    }

    const remaining = budget ? budget - totalSpent : null;
    const overBudget = remaining !== null && remaining < 0;
    const spentPct = budget ? Math.min(100, (totalSpent / budget) * 100) : 0;

    const allSources: { label: string; icon: IconName; cost: number; color: string }[] = [
        { label: 'Itinerary', icon: 'pin', cost: itineraryCost, color: '#0b76dd' },
        { label: 'Hotels', icon: 'bed', cost: hotelCost, color: '#0d9488' },
        { label: 'Flights', icon: 'plane', cost: flightCost, color: '#22d3ee' },
        { label: 'Shared expenses', icon: 'dollar', cost: expenseCost, color: '#f59e0b' },
    ];
    const sources = allSources.filter(s => s.cost > 0);

    return (
        <Reveal as="section" id="budget-section" className="card" variant="up">
            <div className="budget-header-row">
                <h2 style={{ margin: 0 }}>Your budget</h2>
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
            {error && <p className="budget-error" role="alert" style={{ color: 'var(--coral)', margin: '8px 0 0' }}>{error}</p>}
            <p className="budget-section-label" style={{ margin: '8px 0 0' }}>
                Only your share counts here: your itinerary costs, your part of hotels and flights, and your shared-expense splits.
            </p>

            <div className="budget-stats-row">
                <div className="budget-stat">
                    <span className="budget-stat-label">Your budget</span>
                    <span className="budget-stat-value">${budget ? budget.toLocaleString() : '-'}</span>
                </div>
                <div className="budget-stat">
                    <span className="budget-stat-label">Spent</span>
                    <span className="budget-stat-value">${totalSpent.toLocaleString()}</span>
                </div>
                <div className="budget-stat">
                    <span className="budget-stat-label">Remaining</span>
                    <span className="budget-stat-value" style={{ color: overBudget ? 'var(--coral)' : 'var(--teal)' }}>
                        {remaining === null ? '-' : overBudget
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
                                    : 'linear-gradient(90deg, var(--accent-strong), var(--accent))',
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
                                        <span className="budget-source-icon"><Icon name={icon} size={15} /></span>
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
                                    color="var(--accent)"
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
                                    color={CATEGORY_COLORS[category] ?? 'var(--accent)'}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Reveal>
    );
}

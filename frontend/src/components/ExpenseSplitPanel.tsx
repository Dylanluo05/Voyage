import { useMemo, useState, useEffect } from "react";
import { Trip } from "../types";
import { addExpense, removeExpense, settleSplit } from "../api/trips";

interface ExpenseSplitPanelProps {
    trip: Trip;
    currentUserId: string | undefined;
    onUpdate: (updated: Trip) => void;
}

export default function ExpenseSplitPanel({ trip, currentUserId, onUpdate }: ExpenseSplitPanelProps) {
    const [form, setForm] = useState({
        title: '',
        amount: 0,
        splits: [] as { userId: string; userName: string; amount: number; included: boolean }[],
        tax: 0,
        tip: 0,
    });
    const [saving, setSaving] = useState(false);
    const [settlingId, setSettlingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');

    const total = form.amount + form.tax + form.tip;
    const splitSum = form.splits.filter(s => s.included).reduce((acc, s) => acc + s.amount, 0);
    const remaining = total - splitSum;

    const members = useMemo(() => {
        return [
            { userId: trip.owner._id, userName: 'You' },
            ...trip.collaborators.map(c => ({ userId: c._id, userName: c.name })),
        ];
    }, [trip]);

    useEffect(() => {
        setForm(prev => ({ ...prev, splits: members.map(m => ({ ...m, included: true, amount: 0 })) }));
    }, [members]);

    function recalculateSplits(total: number, splits: typeof form.splits) {
        const included = splits.filter(s => s.included).length;
        const share = included > 0 ? total / included : 0;
        return splits.map(s => ({ ...s, amount: s.included ? share : 0 }));
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const activeSplits = form.splits.filter(s => s.included);
            const payer = members.find(m => m.userId === currentUserId) ?? members[0];
            const updated = await addExpense(trip._id, {
                title: form.title,
                amount: total,
                paidBy: { userId: payer.userId, userName: payer.userName },
                splits: activeSplits.map(({ userId, userName, amount }) => ({ userId, userName, amount, settled: false })),
            });
            onUpdate(updated);
            setForm({ title: '', amount: 0, splits: members.map(m => ({ ...m, included: true, amount: 0 })), tax: 0, tip: 0 });
            setShowForm(false);
            setSplitMode('equal');
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    }

    async function handleSettle(expenseId: string, userId: string) {
        const key = `${expenseId}-${userId}`;
        setSettlingId(key);
        setError('');
        try {
            const updated = await settleSplit(trip._id, expenseId, userId);
            onUpdate(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSettlingId(null);
        }
    }

    async function handleRemove(expenseId: string) {
        setRemovingId(expenseId);
        setError('');
        try {
            const updated = await removeExpense(trip._id, expenseId);
            onUpdate(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setRemovingId(null);
        }
    }

    const balances = useMemo(() => {
        const acc: Record<string, number> = {};
        for (const expense of trip.expenses) {
            const payerId = expense.paidBy.userId;
            acc[payerId] = (acc[payerId] ?? 0) + expense.amount;
            for (const split of expense.splits) {
                acc[split.userId] = (acc[split.userId] ?? 0) - split.amount;
            }
        }
        const userMap = Object.fromEntries(members.map(m => [m.userId, m.userName]));
        return Object.entries(acc)
            .filter(([, net]) => Math.abs(net) > 0.01)
            .map(([userId, net]) => ({ userId, userName: userMap[userId] ?? userId, net }));
    }, [trip.expenses, members]);

    const totalSpent = useMemo(
        () => trip.expenses.reduce((sum, e) => sum + e.amount, 0),
        [trip.expenses]
    );

    return (
        <section id="expenses-section" className="card expense-panel">
            <div className="expense-header-row">
                <div>
                    <h2>Expense Split</h2>
                    {trip.expenses.length > 0 && (
                        <p className="muted small" style={{ margin: '2px 0 0' }}>
                            ${totalSpent.toFixed(2)} total · {trip.expenses.length} expense{trip.expenses.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                <button type="button" className="ghost small-btn" onClick={() => {
                    setShowForm(f => !f);
                    setSplitMode('equal');
                }}>
                    {showForm ? 'Cancel' : '+ Add Expense'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleAdd} className="expense-form">
                    <div className="expense-form-row">
                        <label>
                            Description
                            <input
                                value={form.title}
                                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Dinner, taxi, hotel…"
                                required
                            />
                        </label>
                        <label>
                            Amount ($)
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.amount || ''}
                                onChange={e => {
                                    const newAmount = Number(e.target.value) || 0;
                                    setForm(prev => ({
                                        ...prev,
                                        amount: newAmount,
                                        splits: recalculateSplits(newAmount + prev.tax + prev.tip, prev.splits),
                                    }));
                                }}
                                required
                            />
                        </label>
                    </div>
                    <div className="expense-form-row">
                        <label>
                            Tax ($)
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.tax || ''}
                                onChange={e => {
                                    const newTax = Number(e.target.value) || 0;
                                    setForm(prev => ({
                                        ...prev,
                                        tax: newTax,
                                        splits: recalculateSplits(prev.amount + newTax + prev.tip, prev.splits),
                                    }))
                                }}
                            />
                        </label>
                        <label>
                            Tip ($)
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.tip || ''}
                                onChange={e => {
                                    const newTip = Number(e.target.value) || 0;
                                    setForm(prev => ({
                                        ...prev,
                                        tip: newTip,
                                        splits: recalculateSplits(prev.amount + prev.tax + newTip, prev.splits),
                                    }))
                                }}
                            />
                        </label>
                    </div>
                    <div className="expense-split-checks">
                        <div className="split-toggle">
                            <button type="button" onClick={() => {
                                setSplitMode('equal');
                                setForm(prev => ({
                                    ...prev,
                                    splits: recalculateSplits(prev.amount + prev.tax + prev.tip, prev.splits),
                                }));
                            }} className={`split-toggle-btn ${splitMode === 'equal' ? 'active' : ''}`}>Equal</button>
                            <button type="button" onClick={() => setSplitMode('custom')} className={`split-toggle-btn ${splitMode === 'custom' ? 'active' : ''}`}>Custom</button>
                        </div>
                        <p className="small muted" style={{ margin: '0 0 8px' }}>Split between</p>
                        {splitMode === 'equal' && form.splits.map(split => (
                            <label key={split.userId} className="expense-check-row">
                                <input
                                    type="checkbox"
                                    checked={split.included}
                                    onChange={() => {
                                        setForm(prev => {
                                            const updated = prev.splits.map(s =>
                                                s.userId === split.userId ? { ...s, included: !s.included } : s
                                            );
                                            return { ...prev, splits: recalculateSplits(prev.amount + prev.tax + prev.tip, updated) };
                                        });
                                    }}
                                />
                                <span className="check-name">{split.userName}</span>
                                <span className="check-amount">${split.amount.toFixed(2)}</span>
                            </label>
                        ))}
                        {splitMode === 'custom' && form.splits.map(split => (
                            <label key={split.userId} className="expense-check-row">
                                <input
                                    type="checkbox"
                                    checked={split.included}
                                    onChange={() => {
                                        setForm(prev => {
                                            const updated = prev.splits.map(s =>
                                                s.userId === split.userId ? { ...s, included: !s.included, amount: s.included ? 0 : s.amount } : s
                                            );
                                            return {
                                                ...prev, splits: updated
                                            };
                                        });
                                    }}
                                />
                                <span className="check-name">{split.userName}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={split.amount || ''}
                                    onChange={(e) => {
                                        setForm(prev => {
                                            const updated = prev.splits.map(s => s.userId === split.userId ? { ...s, amount: Number(e.target.value) || 0 } : s);
                                            return {
                                                ...prev, splits: updated
                                            };
                                        });
                                    }}
                                />
                            </label>
                        ))}
                        {splitMode === 'custom' && (
                            <p className="small muted" style={{ color: Math.abs(remaining) > 0.01 ? 'var(--coral)' : 'var(--teal)' }}>Remaining: ${remaining.toFixed(2)}</p>
                        )}
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button type="submit" disabled={saving || !form.title || form.amount <= 0 || (splitMode === 'custom' && Math.abs(remaining) > 0.01)}>
                        {saving ? 'Adding…' : 'Add Expense'}
                    </button>
                </form>
            )
            }

            {
                balances.length > 0 && (
                    <div className="expense-balances">
                        <h3 className="expense-section-title">Balances</h3>
                        {balances.map(b => (
                            <div key={b.userId} className={`balance-row ${b.net > 0 ? 'balance-owed' : 'balance-owes'}`}>
                                <span className="balance-name">{b.userName}</span>
                                <span className="balance-amount">
                                    {b.net > 0
                                        ? `is owed $${b.net.toFixed(2)}`
                                        : `owes $${Math.abs(b.net).toFixed(2)}`}
                                </span>
                            </div>
                        ))}
                    </div>
                )
            }

            {
                trip.expenses.length > 0 ? (
                    <div className="expense-list">
                        <h3 className="expense-section-title">All Expenses</h3>
                        {trip.expenses.map(expense => (
                            <div key={expense._id} className="expense-card">
                                <div className="expense-card-header">
                                    <div>
                                        <span className="expense-title">{expense.title}</span>
                                        <span className="muted small"> · paid by {expense.paidBy.userName}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="expense-total">${expense.amount.toFixed(2)}</span>
                                        <button
                                            type="button"
                                            className="ghost small-btn expense-remove-btn"
                                            disabled={removingId === expense._id}
                                            onClick={() => handleRemove(expense._id)}
                                        >
                                            {removingId === expense._id ? '…' : '✕'}
                                        </button>
                                    </div>
                                </div>
                                <div className="expense-splits-grid">
                                    {expense.splits.map(split => {
                                        const key = `${expense._id}-${split.userId}`;
                                        return (
                                            <div key={split.userId} className={`expense-split-row ${split.settled ? 'is-settled' : ''}`}>
                                                <span className="split-member">{split.userName}</span>
                                                <span className="split-amt">${split.amount.toFixed(2)}</span>
                                                {split.settled ? (
                                                    <span className="settled-badge">Settled</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="ghost small-btn"
                                                        disabled={settlingId === key}
                                                        onClick={() => handleSettle(expense._id, split.userId)}
                                                    >
                                                        {settlingId === key ? '…' : 'Settle'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !showForm && <p className="small muted">No expenses yet. Add one to start splitting costs.</p>
                )
            }
        </section >
    );
}

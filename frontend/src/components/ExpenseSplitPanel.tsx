import { useMemo, useState, useEffect, useRef } from "react";
import { Trip, Expense } from "../types";
import { addExpense, updateExpense, removeExpense, settleSplit } from "../api/trips";
import { Icon } from "./Icon";
import Reveal from "./Reveal";

interface ExpenseSplitPanelProps {
    trip: Trip;
    currentUserId: string | undefined;
    onUpdate: (updated: Trip) => void;
}

export default function ExpenseSplitPanel({ trip, currentUserId, onUpdate }: ExpenseSplitPanelProps) {
    const [form, setForm] = useState({
        payer: currentUserId,
        title: '',
        amount: 0,
        splits: [] as { userId: string; userName: string; amount: number; base: number; included: boolean }[],
        tax: 0,
        tip: 0,
    });
    const [saving, setSaving] = useState(false);
    const [settlingId, setSettlingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
    const [editingId, setEditingId] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const total = Math.round((form.amount + form.tax + form.tip) * 100) / 100;
    const extras = form.tax + form.tip;
    const baseSum = form.splits.filter(s => s.included).reduce((acc, s) => acc + s.base, 0);
    // Custom mode: each person enters their pre-tax subtotal; tax + tip are spread proportionally.
    const remaining = form.amount - baseSum;
    const customAmounts = useMemo(() => {
        const result: Record<string, number> = {};
        const active = form.splits.filter(s => s.included);
        if (baseSum <= 0) return result;
        let allocated = 0;
        active.forEach(s => {
            result[s.userId] = Math.round((s.base + (extras * s.base) / baseSum) * 100) / 100;
            allocated += result[s.userId];
        });
        // Push any rounding drift onto the largest share so the splits sum to the total exactly.
        const target = Math.round((baseSum + extras) * 100) / 100;
        const drift = Math.round((target - allocated) * 100) / 100;
        if (drift !== 0) {
            const largest = active.reduce((a, b) => (b.base > a.base ? b : a));
            result[largest.userId] = Math.round((result[largest.userId] + drift) * 100) / 100;
        }
        return result;
    }, [form.splits, baseSum, extras]);

    const members = useMemo(() => {
        return [
            { userId: trip.owner._id, userName: trip.owner._id === currentUserId ? 'You' : trip.owner.name },
            ...trip.collaborators.map(c => ({ userId: c._id, userName: c._id === currentUserId ? 'You' : c.name })),
        ];
    }, [trip.owner, trip.collaborators, currentUserId]);

    useEffect(() => {
        // Keep any in-progress entries when the trip refreshes (e.g. a collaborator's live update).
        setForm(prev => ({
            ...prev,
            splits: members.map(m => {
                const existing = prev.splits.find(s => s.userId === m.userId);
                return existing ? { ...existing, userName: m.userName } : { ...m, included: true, amount: 0, base: 0 };
            }),
        }));
    }, [members]);

    function recalculateSplits(total: number, splits: typeof form.splits) {
        const included = splits.filter(s => s.included).length;
        if (included === 0) return splits.map(s => ({ ...s, amount: 0 }));
        const totalCents = Math.round(total * 100);
        const baseCents = Math.floor(totalCents / included);
        // Spread leftover cents one each across the first few people so the shares sum exactly to the total.
        let leftover = totalCents - baseCents * included;
        return splits.map(s => {
            if (!s.included) return { ...s, amount: 0 };
            const cents = baseCents + (leftover > 0 ? 1 : 0);
            if (leftover > 0) leftover--;
            return { ...s, amount: cents / 100 };
        });
    }

    // Stored names must never be the "You" label, since other viewers would read it as themselves.
    function realName(userId: string, fallback: string) {
        if (userId === trip.owner._id) return trip.owner.name;
        return trip.collaborators.find(c => c._id === userId)?.name ?? fallback;
    }

    function blankForm() {
        return { payer: currentUserId, title: '', amount: 0, splits: members.map(m => ({ ...m, included: true, amount: 0, base: 0 })), tax: 0, tip: 0 };
    }

    function closeForm() {
        setShowForm(false);
        setEditingId(null);
        setSplitMode('equal');
        setForm(blankForm());
        setError('');
    }

    function openNewForm() {
        setEditingId(null);
        setSplitMode('equal');
        setForm(blankForm());
        setError('');
        setShowForm(true);
    }

    function openEditForm(expense: Expense) {
        // Stored expenses only keep the final per-person totals, so edits start in custom mode with those amounts.
        setEditingId(expense._id);
        setSplitMode('custom');
        setError('');
        setForm({
            payer: expense.paidBy.userId,
            title: expense.title,
            amount: expense.amount,
            tax: 0,
            tip: 0,
            splits: members.map(m => {
                const existing = expense.splits.find(sp => sp.userId === m.userId);
                return { ...m, included: !!existing, amount: existing?.amount ?? 0, base: existing?.amount ?? 0 };
            }),
        });
        setShowForm(true);
    }

    useEffect(() => {
        if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [showForm, editingId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const activeSplits = form.splits
                .filter(s => s.included)
                .map(s => (splitMode === 'custom' ? { ...s, amount: customAmounts[s.userId] ?? 0 } : s));
            const payer = members.find(m => m.userId === form.payer) ?? members[0];
            const payload = {
                title: form.title.trim(),
                amount: total,
                paidBy: { userId: payer.userId, userName: realName(payer.userId, payer.userName) },
                splits: activeSplits.map(({ userId, userName, amount }) => ({ userId, userName: realName(userId, userName), amount, settled: false })),
            };
            const updated = editingId
                ? await updateExpense(trip._id, editingId, payload)
                : await addExpense(trip._id, payload);
            onUpdate(updated);
            closeForm();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    }

    async function handleSettle(expenseId: string, userId: string, settled = true) {
        const key = `${expenseId}-${userId}`;
        setSettlingId(key);
        setError('');
        try {
            const updated = await settleSplit(trip._id, expenseId, userId, settled);
            onUpdate(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSettlingId(null);
        }
    }

    async function handleRemove(expenseId: string, title: string) {
        if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
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

    const debts = useMemo(() => {
        const acc: Record<string, Record<string, number>> = {};
        const userMap = Object.fromEntries(members.map(m => [m.userId, m.userName]));

        for (const expense of trip.expenses) {
            const payerId = expense.paidBy.userId;
            for (const split of expense.splits) {
                if (split.userId === payerId || split.settled) continue;
                if (!acc[split.userId]) acc[split.userId] = {};
                acc[split.userId][payerId] = (acc[split.userId][payerId] ?? 0) + split.amount;
            }
        }

        const result: { fromId: string; fromName: string; toId: string; toName: string; amount: number }[] = [];
        const visited = new Set<string>();

        for (const fromId of Object.keys(acc)) {
            for (const toId of Object.keys(acc[fromId])) {
                const key = [fromId, toId].sort().join('-');
                if (visited.has(key)) continue;
                visited.add(key);

                const forward = acc[fromId]?.[toId] ?? 0;
                const backward = acc[toId]?.[fromId] ?? 0;
                const net = forward - backward;

                if (net > 0.01) {
                    result.push({ fromId, fromName: userMap[fromId] ?? fromId, toId, toName: userMap[toId] ?? toId, amount: net });
                } else if (net < -0.01) {
                    result.push({ fromId: toId, fromName: userMap[toId] ?? toId, toId: fromId, toName: userMap[fromId] ?? fromId, amount: -net });
                }
            }
        }

        return result;
    }, [trip.expenses, members]);

    const myBalance = useMemo(() => {
        let owed = 0;
        let owe = 0;
        for (const d of debts) {
            if (d.toId === currentUserId) owed += d.amount;
            if (d.fromId === currentUserId) owe += d.amount;
        }
        return { owed, owe, net: owed - owe };
    }, [debts, currentUserId]);

    const totalSpent = useMemo(
        () => trip.expenses.reduce((sum, e) => sum + e.amount, 0),
        [trip.expenses]
    );

    return (
        <Reveal as="section" id="expenses-section" className="card expense-panel" variant="up">
            <div className="expense-header-row">
                <div>
                    <h2>Expense Split</h2>
                    {trip.expenses.length > 0 && (
                        <p className="muted small" style={{ margin: '2px 0 0' }}>
                            ${totalSpent.toFixed(2)} total · {trip.expenses.length} expense{trip.expenses.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                <button type="button" className="ghost small-btn" onClick={() => (showForm ? closeForm() : openNewForm())}>
                    {showForm ? 'Cancel' : '+ Add Expense'}
                </button>
            </div>

            {showForm && (
                <form ref={formRef} onSubmit={handleSubmit} className="xf">
                    <div className="xf-head">
                        <h3 className="xf-title">{editingId ? 'Edit expense' : 'New expense'}</h3>
                        <button type="button" className="xf-icon-btn" onClick={closeForm} aria-label="Close form">
                            <Icon name="close" size={16} />
                        </button>
                    </div>

                    <div className="xf-amount">
                        <span className="xf-amount-label">{editingId ? 'Total' : 'Amount'}</span>
                        <div className="xf-amount-field">
                            <span className="xf-currency">$</span>
                            <input
                                className="xf-amount-input"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={form.amount || ''}
                                onChange={e => {
                                    const newAmount = Number(e.target.value) || 0;
                                    setForm(prev => ({
                                        ...prev,
                                        amount: newAmount,
                                        splits: splitMode === 'equal'
                                            ? recalculateSplits(newAmount + prev.tax + prev.tip, prev.splits)
                                            : prev.splits,
                                    }));
                                }}
                                required
                                autoFocus={!editingId}
                            />
                        </div>
                    </div>

                    <label className="xf-field">
                        <span className="xf-label">Description</span>
                        <input
                            value={form.title}
                            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Dinner, taxi, hotel…"
                            maxLength={80}
                            required
                        />
                    </label>

                    <div className="xf-field">
                        <span className="xf-label">Paid by</span>
                        <div className="xf-chips" role="radiogroup" aria-label="Paid by">
                            {members.map(m => (
                                <button
                                    key={m.userId}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.payer === m.userId}
                                    className={`xf-chip ${form.payer === m.userId ? 'is-on' : ''}`}
                                    onClick={() => setForm(prev => ({ ...prev, payer: m.userId }))}
                                >
                                    {m.userName}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!editingId && (
                        <div className="xf-row">
                            <label className="xf-field">
                                <span className="xf-label">Tax <span className="xf-optional">optional</span></span>
                                <div className="xf-prefixed">
                                    <span>$</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={form.tax || ''}
                                        onChange={e => {
                                            const newTax = Number(e.target.value) || 0;
                                            setForm(prev => ({
                                                ...prev,
                                                tax: newTax,
                                                splits: splitMode === 'equal'
                                                    ? recalculateSplits(prev.amount + newTax + prev.tip, prev.splits)
                                                    : prev.splits,
                                            }));
                                        }}
                                    />
                                </div>
                            </label>
                            <label className="xf-field">
                                <span className="xf-label">Tip <span className="xf-optional">optional</span></span>
                                <div className="xf-prefixed">
                                    <span>$</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={form.tip || ''}
                                        onChange={e => {
                                            const newTip = Number(e.target.value) || 0;
                                            setForm(prev => ({
                                                ...prev,
                                                tip: newTip,
                                                splits: splitMode === 'equal'
                                                    ? recalculateSplits(prev.amount + prev.tax + newTip, prev.splits)
                                                    : prev.splits,
                                            }));
                                        }}
                                    />
                                </div>
                            </label>
                        </div>
                    )}

                    <div className="xf-split">
                        <div className="xf-split-head">
                            <span className="xf-label">Split between</span>
                            <div className="xf-seg" role="tablist" aria-label="Split mode">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={splitMode === 'equal'}
                                    className={splitMode === 'equal' ? 'is-on' : ''}
                                    onClick={() => {
                                        setSplitMode('equal');
                                        setForm(prev => ({
                                            ...prev,
                                            splits: recalculateSplits(prev.amount + prev.tax + prev.tip, prev.splits),
                                        }));
                                    }}
                                >Equal</button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={splitMode === 'custom'}
                                    className={splitMode === 'custom' ? 'is-on' : ''}
                                    onClick={() => {
                                        if (splitMode === 'custom') return;
                                        setSplitMode('custom');
                                        setForm(prev => {
                                            const n = prev.splits.filter(s => s.included).length;
                                            const share = n > 0 ? Math.round((prev.amount / n) * 100) / 100 : 0;
                                            return { ...prev, splits: prev.splits.map(s => ({ ...s, base: s.included ? share : 0 })) };
                                        });
                                    }}
                                >Custom</button>
                            </div>
                        </div>

                        {splitMode === 'custom' && (
                            <p className="xf-hint">
                                {editingId
                                    ? 'Enter what each person owes. Switch to Equal to split evenly.'
                                    : 'Enter each person\u2019s share before tax and tip. Tax and tip are added in proportion.'}
                            </p>
                        )}

                        <div className="xf-members">
                            {form.splits.map(split => {
                                const toggle = () => setForm(prev => {
                                    const updated = prev.splits.map(s =>
                                        s.userId === split.userId
                                            ? { ...s, included: !s.included, base: s.included ? 0 : s.base }
                                            : s
                                    );
                                    return {
                                        ...prev,
                                        splits: splitMode === 'equal'
                                            ? recalculateSplits(prev.amount + prev.tax + prev.tip, updated)
                                            : updated,
                                    };
                                });
                                const finalAmount = splitMode === 'custom' ? (customAmounts[split.userId] ?? 0) : split.amount;
                                return (
                                    <div key={split.userId} className={`xf-member ${split.included ? 'is-on' : ''}`}>
                                        <button
                                            type="button"
                                            className="xf-member-toggle"
                                            role="checkbox"
                                            aria-checked={split.included}
                                            onClick={toggle}
                                        >
                                            <span className="xf-avatar">
                                                {split.included ? <Icon name="check" size={14} weight="bold" /> : split.userName.charAt(0).toUpperCase()}
                                            </span>
                                            <span className="xf-member-name">{split.userName}</span>
                                        </button>
                                        {splitMode === 'equal' ? (
                                            <span className="xf-member-amt">{split.included ? `$${split.amount.toFixed(2)}` : '\u2014'}</span>
                                        ) : split.included ? (
                                            <div className="xf-member-custom">
                                                <div className="xf-prefixed xf-prefixed-sm">
                                                    <span>$</span>
                                                    <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        aria-label={`${split.userName} share`}
                                                        value={split.base || ''}
                                                        onChange={e => {
                                                            const v = Number(e.target.value) || 0;
                                                            setForm(prev => ({
                                                                ...prev,
                                                                splits: prev.splits.map(s => s.userId === split.userId ? { ...s, base: v } : s),
                                                            }));
                                                        }}
                                                    />
                                                </div>
                                                {extras > 0 && baseSum > 0 && (
                                                    <span className="xf-member-final">${finalAmount.toFixed(2)} with tax &amp; tip</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="xf-member-amt">{'\u2014'}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="xf-summary">
                        {(form.tax > 0 || form.tip > 0) && (
                            <>
                                <div><span>Subtotal</span><span>${form.amount.toFixed(2)}</span></div>
                                {form.tax > 0 && <div><span>Tax</span><span>${form.tax.toFixed(2)}</span></div>}
                                {form.tip > 0 && <div><span>Tip</span><span>${form.tip.toFixed(2)}</span></div>}
                            </>
                        )}
                        <div className="xf-summary-total"><span>Total</span><span>${total.toFixed(2)}</span></div>
                        {splitMode === 'custom' && form.amount > 0 && (
                            <div className={`xf-remaining ${Math.abs(remaining) > 0.01 ? 'is-off' : 'is-ok'}`}>
                                {Math.abs(remaining) <= 0.01
                                    ? 'Fully assigned'
                                    : remaining > 0
                                        ? `$${remaining.toFixed(2)} left to assign`
                                        : `$${(-remaining).toFixed(2)} over`}
                            </div>
                        )}
                        {editingId && trip.expenses.find(x => x._id === editingId)?.splits.some(sp => sp.settled) && (
                            <p className="xf-hint" style={{ margin: '6px 0 0' }}>Settled shares are reopened if their amount changes.</p>
                        )}
                    </div>

                    {error && <p className="error">{error}</p>}
                    <div className="xf-actions">
                        <button type="button" className="xf-btn-ghost" onClick={closeForm}>Cancel</button>
                        <button
                            type="submit"
                            className="xf-btn-primary"
                            disabled={saving || !form.title.trim() || form.amount <= 0 || !form.splits.some(s => s.included) || (splitMode === 'custom' && Math.abs(remaining) > 0.01)}
                        >
                            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add expense'}
                        </button>
                    </div>
                </form>
            )}

            {
                debts.length > 0 && (
                    <div className="expense-balances">
                        <h3 className="expense-section-title">Balances</h3>
                        {currentUserId && (myBalance.owed > 0.005 || myBalance.owe > 0.005) && (
                            <p className="balance-summary">
                                {myBalance.net > 0.005 ? (
                                    <>You're owed <strong className="balance-pos">${myBalance.net.toFixed(2)}</strong> overall</>
                                ) : myBalance.net < -0.005 ? (
                                    <>You owe <strong className="balance-neg">${(-myBalance.net).toFixed(2)}</strong> overall</>
                                ) : (
                                    <>You're all square overall</>
                                )}
                                {myBalance.owed > 0.005 && myBalance.owe > 0.005 && (
                                    <span className="muted small"> (owed ${myBalance.owed.toFixed(2)}, owe ${myBalance.owe.toFixed(2)})</span>
                                )}
                            </p>
                        )}
                        {debts.map(d => (
                            <div key={`${d.fromId}-${d.toId}`} className="balance-row balance-owes">
                                <span className="balance-name">{d.fromName}</span>
                                <span className="balance-amount">owes {d.toName} ${d.amount.toFixed(2)}</span>
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
                                        {(currentUserId === expense.paidBy.userId || currentUserId === trip.owner._id) && (
                                            <button
                                                type="button"
                                                className="ghost small-btn expense-remove-btn"
                                                aria-label={`Edit ${expense.title}`}
                                                onClick={() => openEditForm(expense)}
                                            >
                                                <Icon name="pencil" size={13} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="ghost small-btn expense-remove-btn"
                                            disabled={removingId === expense._id}
                                            onClick={() => handleRemove(expense._id, expense.title)}
                                        >
                                            {removingId === expense._id ? '…' : <Icon name="close" size={13} />}
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
                                                    <>
                                                        <span className="settled-badge">Settled</span>
                                                        {(currentUserId === split.userId || currentUserId === expense.paidBy.userId) && (
                                                            <button
                                                                type="button"
                                                                className="ghost small-btn"
                                                                disabled={settlingId === key}
                                                                onClick={() => handleSettle(expense._id, split.userId, false)}
                                                            >
                                                                {settlingId === key ? '…' : 'Undo'}
                                                            </button>
                                                        )}
                                                    </>
                                                ) : split.userId === expense.paidBy.userId ? (
                                                    <span className="muted small">Paid</span>
                                                ) : (currentUserId === split.userId || currentUserId === expense.paidBy.userId) ? (
                                                    <button
                                                        type="button"
                                                        className="ghost small-btn"
                                                        disabled={settlingId === key}
                                                        onClick={() => handleSettle(expense._id, split.userId)}
                                                    >
                                                        {settlingId === key ? '…' : 'Settle'}
                                                    </button>
                                                ) : null}
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
        </Reveal>
    );
}

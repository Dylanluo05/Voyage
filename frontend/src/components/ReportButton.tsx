import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { createReport } from '../api/reports';
import { ApiError } from '../api/client';
import type { ReportTargetType } from '../types';

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  subTargetId?: string;
  /** Icon-only by default; pass a label for a text+icon button. */
  label?: string;
  className?: string;
};

export default function ReportButton({ targetType, targetId, subTargetId, label, className }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await createReport({ targetType, targetId, subTargetId, reason: reason.trim() });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    setReason('');
    setError(null);
    setDone(false);
  }

  return (
    <>
      <button
        type="button"
        className={className ?? 'report-btn'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Report"
      >
        <Icon name="warning" size={label ? 15 : 16} />
        {label}
      </button>

      {open &&
        createPortal(
          <div className="report-modal-backdrop" onClick={close}>
            <div className="report-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Report content">
              {done ? (
                <>
                  <h3>Report submitted</h3>
                  <p>Thanks — we will take a look.</p>
                  <button type="button" className="report-modal-btn" onClick={close}>
                    Close
                  </button>
                </>
              ) : (
                <>
                  <h3>Report this content</h3>
                  <p>Tell us what is wrong with it.</p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Spam, inappropriate content, harassment…"
                    autoFocus
                  />
                  {error && <div className="error">{error}</div>}
                  <div className="report-modal-actions">
                    <button type="button" className="report-modal-btn report-modal-btn--ghost" onClick={close}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="report-modal-btn"
                      disabled={!reason.trim() || submitting}
                      onClick={submit}
                    >
                      {submitting ? 'Submitting…' : 'Submit report'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

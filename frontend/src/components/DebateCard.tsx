import { FormEvent, useState } from 'react';
import type { Debate } from '../types';

interface Props {
  debate: Debate;
  currentUserId?: string;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onDelete: () => Promise<void>;
  onAddOption: (title: string) => Promise<void>;
  onUpdateOption: (optionId: string, patch: { pros?: string[]; cons?: string[] }) => Promise<void>;
  onDeleteOption: (optionId: string) => Promise<void>;
  onVoteOption: (optionId: string) => Promise<void>;
  onAddComment: (text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export default function DebateCard({
  debate,
  currentUserId,
  dragHandleProps,
  onDelete,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onVoteOption,
  onAddComment,
  onDeleteComment,
}: Props) {
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newOptionDraft, setNewOptionDraft] = useState('');
  const [addingOption, setAddingOption] = useState(false);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const [addingProFor, setAddingProFor] = useState<string | null>(null);
  const [addingConFor, setAddingConFor] = useState<string | null>(null);
  const [proDraft, setProDraft] = useState('');
  const [conDraft, setConDraft] = useState('');

  const userVotedOptionId = debate.options.find((o) =>
    currentUserId && o.votes.includes(currentUserId)
  )?._id;

  async function handleVote(optionId: string) {
    setVotingOptionId(optionId);
    try {
      await onVoteOption(optionId);
    } finally {
      setVotingOptionId(null);
    }
  }

  async function handleAddPro(optionId: string, e: FormEvent) {
    e.preventDefault();
    if (!proDraft.trim()) return;
    const option = debate.options.find((o) => o._id === optionId);
    if (!option) return;
    await onUpdateOption(optionId, { pros: [...option.pros, proDraft.trim()] });
    setProDraft('');
    setAddingProFor(null);
  }

  async function handleAddCon(optionId: string, e: FormEvent) {
    e.preventDefault();
    if (!conDraft.trim()) return;
    const option = debate.options.find((o) => o._id === optionId);
    if (!option) return;
    await onUpdateOption(optionId, { cons: [...option.cons, conDraft.trim()] });
    setConDraft('');
    setAddingConFor(null);
  }

  async function handleRemovePro(optionId: string, idx: number) {
    const option = debate.options.find((o) => o._id === optionId);
    if (!option) return;
    await onUpdateOption(optionId, { pros: option.pros.filter((_, i) => i !== idx) });
  }

  async function handleRemoveCon(optionId: string, idx: number) {
    const option = debate.options.find((o) => o._id === optionId);
    if (!option) return;
    await onUpdateOption(optionId, { cons: option.cons.filter((_, i) => i !== idx) });
  }

  async function handleAddOption(e: FormEvent) {
    e.preventDefault();
    if (!newOptionDraft.trim()) return;
    setAddingOption(true);
    try {
      await onAddOption(newOptionDraft.trim());
      setNewOptionDraft('');
    } finally {
      setAddingOption(false);
    }
  }

  async function handlePostComment(e: FormEvent) {
    e.preventDefault();
    if (!commentDraft.trim()) return;
    setSubmittingComment(true);
    try {
      await onAddComment(commentDraft.trim());
      setCommentDraft('');
    } finally {
      setSubmittingComment(false);
    }
  }

  const totalVotes = debate.options.reduce((sum, o) => sum + o.votes.length, 0);

  return (
    <div className="debate-card card">
      <div className="debate-header">
        {dragHandleProps && (
          <button type="button" className="drag-handle" aria-label="Drag debate" {...dragHandleProps}>
            ⋮⋮
          </button>
        )}
        <span className="debate-title">⚖️ {debate.title}</span>
        <button type="button" className="danger small-btn" onClick={onDelete}>
          Delete
        </button>
      </div>

      <div className="debate-options-grid">
        {debate.options.map((option) => {
          const voteCount = option.votes.length;
          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const hasMyVote = option._id === userVotedOptionId;

          return (
            <div key={option._id} className={`debate-option${hasMyVote ? ' debate-option--voted' : ''}`}>
              <div className="debate-option-header">
                <strong className="debate-option-title">{option.title}</strong>
                {debate.options.length > 2 && (
                  <button
                    type="button"
                    className="ghost small-btn"
                    onClick={() => onDeleteOption(option._id)}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="pros-cons">
                <div className="pros">
                  <span className="pros-cons-label pros-label">Pros</span>
                  <ul className="pros-cons-list">
                    {option.pros.map((pro, i) => (
                      <li key={i} className="pros-cons-item">
                        <span>{pro}</span>
                        <button
                          type="button"
                          className="ghost pros-cons-remove"
                          onClick={() => handleRemovePro(option._id, i)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                  {addingProFor === option._id ? (
                    <form onSubmit={(e) => handleAddPro(option._id, e)} className="pros-cons-add-form">
                      <input
                        autoFocus
                        value={proDraft}
                        onChange={(e) => setProDraft(e.target.value)}
                        placeholder="Add a pro…"
                        className="pros-cons-input"
                      />
                      <button type="submit" className="small-btn">Add</button>
                      <button type="button" className="ghost small-btn" onClick={() => { setAddingProFor(null); setProDraft(''); }}>✕</button>
                    </form>
                  ) : (
                    <button type="button" className="ghost small-btn pros-cons-add-btn" onClick={() => { setAddingProFor(option._id); setAddingConFor(null); }}>
                      + Add pro
                    </button>
                  )}
                </div>

                <div className="cons">
                  <span className="pros-cons-label cons-label">Cons</span>
                  <ul className="pros-cons-list">
                    {option.cons.map((con, i) => (
                      <li key={i} className="pros-cons-item">
                        <span>{con}</span>
                        <button
                          type="button"
                          className="ghost pros-cons-remove"
                          onClick={() => handleRemoveCon(option._id, i)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                  {addingConFor === option._id ? (
                    <form onSubmit={(e) => handleAddCon(option._id, e)} className="pros-cons-add-form">
                      <input
                        autoFocus
                        value={conDraft}
                        onChange={(e) => setConDraft(e.target.value)}
                        placeholder="Add a con…"
                        className="pros-cons-input"
                      />
                      <button type="submit" className="small-btn">Add</button>
                      <button type="button" className="ghost small-btn" onClick={() => { setAddingConFor(null); setConDraft(''); }}>✕</button>
                    </form>
                  ) : (
                    <button type="button" className="ghost small-btn pros-cons-add-btn" onClick={() => { setAddingConFor(option._id); setAddingProFor(null); }}>
                      + Add con
                    </button>
                  )}
                </div>
              </div>

              <div className="debate-vote-row">
                <div className="debate-vote-bar-wrap">
                  <div className="debate-vote-bar" style={{ width: `${pct}%` }} />
                </div>
                <span className="debate-vote-count">{voteCount} vote{voteCount !== 1 ? 's' : ''} · {pct}%</span>
                <button
                  type="button"
                  className={`small-btn${hasMyVote ? ' vote-btn--active' : ''}`}
                  disabled={votingOptionId === option._id}
                  onClick={() => handleVote(option._id)}
                >
                  {hasMyVote ? '✓ Voted' : 'Vote'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAddOption} className="debate-add-option-form">
        <input
          value={newOptionDraft}
          onChange={(e) => setNewOptionDraft(e.target.value)}
          placeholder="New option title…"
          className="debate-add-option-input"
        />
        <button type="submit" className="ghost small-btn" disabled={!newOptionDraft.trim() || addingOption}>
          + Add option
        </button>
      </form>

      <div className="debate-comments">
        <h4 className="debate-comments-heading">Comments ({debate.comments.length})</h4>
        {debate.comments.map((c) => (
          <div key={c._id} className="debate-comment">
            <span className="debate-comment-author">{c.userName}</span>
            <span className="debate-comment-text">{c.text}</span>
            {currentUserId && (currentUserId === c.userId) && (
              <button
                type="button"
                className="ghost pros-cons-remove"
                onClick={() => onDeleteComment(c._id)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <form onSubmit={handlePostComment} className="debate-comment-form">
          <input
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Add a comment…"
            className="debate-comment-input"
          />
          <button type="submit" className="small-btn" disabled={!commentDraft.trim() || submittingComment}>
            {submittingComment ? 'Posting…' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
}

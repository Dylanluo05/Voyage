import { useState, useRef, useEffect, useCallback } from 'react';
import { Trip } from '../types';
import { API_URL, getToken } from '../api/client';
import { getBillingStatus, startCheckout, BillingStatus } from '../api/billing';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolResult?: { action: string; items?: string[]; day?: number; count?: number };
  isError?: boolean;
}

interface Props {
  trip: Trip;
  onTripRefresh: () => void;
}

export default function TripChatPanel({ trip, onTripRefresh }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [quota, setQuota] = useState<BillingStatus | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getBillingStatus().then(setQuota).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    let currentEvent = '';

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/trips/${trip._id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const data = JSON.parse(raw);

              if (currentEvent === 'text') {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = { ...last, content: last.content + data.text };
                  return updated;
                });
              } else if (currentEvent === 'tool_result') {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], toolResult: data };
                  return updated;
                });
                onTripRefresh();
              } else if (currentEvent === 'done') {
                setQuota(prev => prev ? { ...prev, remaining: data.remaining, used: (prev.used ?? 0) + 1 } : prev);
              } else if (currentEvent === 'error') {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: data.error, isError: true };
                  return updated;
                });
              }
            } catch { /* malformed chunk */ }
          } else if (line === '') {
            currentEvent = '';
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: err instanceof Error ? err.message : 'Something went wrong.',
          isError: true,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, messages, streaming, trip._id, onTripRefresh]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isPro = quota?.plan === 'pro';
  const outOfQuota = !isPro && quota !== null && quota.remaining === 0;

  function toolResultLabel(tr: ChatMessage['toolResult']): string {
    if (!tr) return '';
    if (tr.action === 'add_items') return `Added ${tr.items?.join(', ')} to Day ${tr.day}`;
    if (tr.action === 'replace_day') return `Replaced Day ${tr.day} with ${tr.count} new stops`;
    return '';
  }

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <span className="chat-panel-title">Trip Assistant</span>
        <div className="chat-quota">
          {isPro ? (
            <span className="chat-quota-pro">Pro — unlimited</span>
          ) : quota ? (
            <span className={`chat-quota-count${outOfQuota ? ' chat-quota-empty' : ''}`}>
              {quota.remaining}/{quota.freeLimit} requests today
            </span>
          ) : null}
          {!isPro && (
            <button className="chat-upgrade-btn" onClick={startCheckout}>Upgrade</button>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">
            Ask me anything about {trip.destination} — or say "Plan Day 1" and I'll fill it in.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg--${msg.role}${msg.isError ? ' chat-msg--error' : ''}`}>
            {msg.content && <p className="chat-msg-text">{msg.content}</p>}
            {msg.role === 'assistant' && !msg.content && streaming && i === messages.length - 1 && (
              <span className="chat-typing">●●●</span>
            )}
            {msg.toolResult && (
              <div className="chat-tool-result">
                ✓ {toolResultLabel(msg.toolResult)}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {outOfQuota && (
        <div className="chat-quota-banner">
          You've used all {quota?.freeLimit} free requests for today.{' '}
          <button className="chat-upgrade-inline" onClick={startCheckout}>Upgrade to Pro</button>{' '}
          for unlimited access.
        </div>
      )}

      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={2}
          placeholder={outOfQuota ? 'Upgrade to continue chatting…' : 'Ask a question or give an instruction…'}
          value={input}
          disabled={streaming || outOfQuota}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="chat-send-btn"
          disabled={streaming || !input.trim() || outOfQuota}
          onClick={sendMessage}
        >
          {streaming ? '…' : '↑'}
        </button>
      </div>
    </div>
  );
}

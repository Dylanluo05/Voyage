import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const containerStyle = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  padding: 24,
  textAlign: 'center' as const,
  fontFamily: 'system-ui, sans-serif',
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
    Sentry.captureException(error, { extra: { componentStack: (info as { componentStack?: string })?.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={containerStyle}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Something went wrong.</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>
            Try reloading the page. If this keeps happening, let us know.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

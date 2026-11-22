import { Component, type ReactNode } from 'react';
import { downloadText } from '@/lib/download';

const STORAGE_KEY = 'safey.web.v1';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Safey crashed', error);
  }

  private reset = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) downloadText('safey-backup-before-reset.json', raw, 'application/json');
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
    location.assign('/welcome');
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page" style={{ minHeight: '100dvh', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
          <p className="muted small">Safey hit an unexpected problem while showing this screen. Your records are still saved in this browser.</p>
          <code className="tiny muted" style={{ wordBreak: 'break-word' }}>
            {this.state.error.message}
          </code>
          <button className="btn btn--primary btn--block" onClick={() => location.reload()}>
            Reload Safey
          </button>
          <button className="btn btn--ghost btn--block" onClick={this.reset}>
            Download a backup and start fresh
          </button>
        </div>
      </div>
    );
  }
}

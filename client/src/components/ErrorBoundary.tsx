import React from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-rose-400 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-400 mb-4">
            The dashboard hit an unexpected error. This is usually a misconfigured API URL or a
            failed data fetch.
          </p>
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-rose-300 overflow-auto max-h-64 whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.assign('/dashboard')}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}

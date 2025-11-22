import { Component } from "react";
import { Link } from "react-router-dom";

export default class ErrorBoundary extends Component {
  state = { err: null, hasError: false };

  static getDerivedStateFromError(err) {
    return { err, hasError: true };
  }

  componentDidCatch(err, errorInfo) {
    // Log error to console in development only
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", err, errorInfo);
    }
    
    // In production, you could send this to an error tracking service
    // Example: Sentry.captureException(err, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({ err: null, hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
          <div className="max-w-2xl w-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 text-white shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
              <p className="text-white/80">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
            </div>

            {import.meta.env.DEV && this.state.err && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30">
                <div className="text-sm font-mono text-red-200 whitespace-pre-wrap break-words">
                  {String(this.state.err?.message || this.state.err)}
                </div>
                {this.state.err?.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-300 cursor-pointer">Stack trace</summary>
                    <pre className="text-xs text-red-200 mt-2 whitespace-pre-wrap break-words">
                      {this.state.err.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
              >
                Try Again
              </button>
              <Link
                to="/"
                className="px-6 py-3 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold transition text-center"
              >
                Go Home
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold transition"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

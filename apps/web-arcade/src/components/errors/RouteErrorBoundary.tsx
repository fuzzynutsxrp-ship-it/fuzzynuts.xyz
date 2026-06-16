"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * RouteErrorBoundary — Unified error boundary for all routes
 *
 * Features:
 *   - Auto-retry once for transient errors (network, hydration)
 *   - Game mode: minimal overlay that doesn't block iframe
 *   - Standard mode: full-page error with retry + go home
 *   - Dev mode: error stack trace details
 *   - HOC wrapper: withErrorBoundary()
 * ═══════════════════════════════════════════════════════════════
 */

import { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import { CyberCard } from "../ui/CyberCard";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  /** Special handling for iframe game errors */
  gameMode?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service (Sentry, etc.)
    console.error("RouteErrorBoundary caught:", error, errorInfo);

    // Auto-retry once for transient errors (network, hydration)
    if (this.state.retryCount === 0 && !this.props.gameMode) {
      setTimeout(() => {
        this.setState({ retryCount: 1, hasError: false, error: null });
      }, 1000);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: this.state.retryCount + 1,
    });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Custom fallback provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Game mode: minimal overlay, don't block iframe
    if (this.props.gameMode) {
      return (
        <motion.div
          className="absolute inset-0 z-20 flex items-center justify-center bg-degen-950/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <CyberCard className="max-w-md p-6 text-center">
            <h3 className="text-xl font-bold text-gold mb-2">Game Session Interrupted</h3>
            <p className="text-sm text-cream/70 mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-neon-green text-forest-900 rounded-lg font-medium hover:opacity-90 transition"
              >
                Retry Game
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 border border-hot-pink/30 rounded-lg hover:bg-degen-900 transition"
              >
                Go Home
              </button>
            </div>
          </CyberCard>
        </motion.div>
      );
    }

    // Standard route error
    return (
      <motion.div
        className="min-h-[60vh] flex items-center justify-center p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CyberCard className="max-w-lg w-full p-8 text-center">
          <div className="text-5xl mb-4">🌰</div>
          <h2 className="text-2xl font-bold text-gold mb-3">Something went sideways</h2>
          <p className="text-cream/70 mb-6">
            {this.state.error?.message || "We hit a snag loading this page"}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleRetry}
              className="px-6 py-3 bg-gold text-forest-900 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-6 py-3 border border-hot-pink/30 rounded-xl hover:bg-degen-900 hover:border-hot-pink/50 transition"
            >
              Back to Home
            </button>
          </div>

          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-6 text-left text-xs text-cream/50">
              <summary className="cursor-pointer hover:text-cream/70">
                Error details (dev only)
              </summary>
              <pre className="mt-2 p-3 bg-black/30 rounded-lg overflow-auto max-h-40">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </CyberCard>
      </motion.div>
    );
  }
}

/** HOC wrapper for functional components */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<Props, "children">,
) {
  return function ErrorBoundaryWrapped(props: P) {
    return (
      <RouteErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </RouteErrorBoundary>
    );
  };
}

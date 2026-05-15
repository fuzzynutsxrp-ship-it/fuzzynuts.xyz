"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { motion } from "framer-motion";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Game title for contextual error messaging */
  gameTitle?: string;
  /** Called when user clicks Retry */
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * GameErrorBoundary — Catches iframe/script failures within the game wrapper.
 *
 * Uses React class component pattern (still required for error boundaries
 * in React 19). Provides a branded error screen with retry + back navigation.
 */
export class GameErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GameErrorBoundary] Caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback
        error={this.state.error}
        gameTitle={this.props.gameTitle}
        onRetry={this.handleRetry}
      />;
    }
    return this.props.children;
  }
}

/* ── Extracted fallback component for Framer Motion support ── */

interface ErrorFallbackProps {
  error: Error | null;
  gameTitle?: string;
  onRetry: () => void;
}

function ErrorFallback({ error, gameTitle, onRetry }: ErrorFallbackProps) {
  return (
    <div
      className="flex items-center justify-center min-h-[60vh] p-6"
      role="alert"
      aria-live="assertive"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 260 }}
        className="glass-card-elevated p-8 sm:p-10 max-w-md w-full text-center"
      >
        {/* Error icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10, delay: 0.1 }}
          className="text-5xl sm:text-6xl mb-5"
          aria-hidden="true"
        >
          🐿️💥
        </motion.div>

        {/* Title */}
        <h2 className="font-display text-2xl sm:text-3xl font-bold gradient-text-gold mb-3">
          Oops! Something Broke
        </h2>

        {/* Context */}
        <p className="text-sm sm:text-base text-[var(--color-cream-dim)] mb-2 leading-relaxed">
          {gameTitle
            ? `${gameTitle} ran into an unexpected error.`
            : "The game ran into an unexpected error."}
        </p>

        {/* Technical detail (collapsed) */}
        {error?.message && (
          <details className="mb-6 text-left">
            <summary className="text-xs text-[var(--color-cream-dim)] cursor-pointer hover:text-[var(--color-cream)] transition-colors">
              Technical details
            </summary>
            <pre className="mt-2 p-3 rounded-lg bg-[rgba(0,0,0,0.4)] text-xs font-mono text-red-400 overflow-x-auto max-h-24 leading-relaxed">
              {error.message}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            onClick={onRetry}
            whileHover={{ scale: 1.04, boxShadow: "0 0 25px rgba(245,196,66,0.4)" }}
            whileTap={{ scale: 0.96 }}
            className="btn-primary px-6 py-2.5 text-sm"
            id="game-error-retry"
          >
            🔄 Try Again
          </motion.button>

          <motion.a
            href="/arcade/"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="btn-secondary px-6 py-2.5 text-sm inline-flex items-center justify-center"
            id="game-error-back"
          >
            ← Back to Arcade
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
}

"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * GameErrorBoundary — Catches fatal React errors inside the
 * GameModal viewport so a single game crash never kills the
 * entire Next.js app.
 *
 * Renders a centered "Game Unavailable" card with:
 *   • Error message (dev mode: full stack)
 *   • "Back to Arcade" button → navigates to /
 *   • "Try Again" button → resets error state
 *
 * Usage:
 *   <GameErrorBoundary>
 *     <GameModal ... />
 *   </GameErrorBoundary>
 * ═══════════════════════════════════════════════════════════════
 */

import { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import { Gamepad2, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional callback when the user clicks Try Again */
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GameErrorBoundary] caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <motion.div
        className="game-error-boundary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(10, 10, 15, 0.96)",
          borderRadius: "inherit",
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 24 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            padding: "2rem 2.5rem",
            maxWidth: "22rem",
            textAlign: "center",
          }}
        >
          {/* Icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "50%",
              background: "rgba(255, 46, 136, 0.12)",
              border: "1px solid rgba(255, 46, 136, 0.25)",
            }}
          >
            <Gamepad2 size={24} style={{ color: "var(--color-hot-pink, #ff2e88)" }} />
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "var(--color-brand-gold, #fbbf24)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Game Unavailable
          </h3>

          {/* Message */}
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--color-cream, #f0ede6)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {process.env.NODE_ENV === "development" && this.state.error
              ? this.state.error.message
              : "This game hit an error and couldn't load. You can try again or head back to the arcade."}
          </p>

          {/* Stack trace (dev only) */}
          {process.env.NODE_ENV === "development" && this.state.error?.stack && (
            <details
              style={{
                width: "100%",
                textAlign: "left",
                fontSize: "0.7rem",
                color: "var(--color-cream-dim, #b0a890)",
              }}
            >
              <summary style={{ cursor: "pointer" }}>Stack trace</summary>
              <pre
                style={{
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  background: "rgba(0,0,0,0.4)",
                  borderRadius: "0.5rem",
                  overflow: "auto",
                  maxHeight: "8rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {this.state.error.stack}
              </pre>
            </details>
          )}

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginTop: "0.5rem",
              width: "100%",
            }}
          >
            <button
              onClick={this.handleRetry}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.625rem 1rem",
                background: "var(--color-neon-green, #39ff14)",
                color: "var(--color-forest-900, #0a1a0a)",
                borderRadius: "0.75rem",
                fontWeight: 600,
                fontSize: "0.85rem",
                border: "none",
                cursor: "pointer",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <RotateCcw size={14} />
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.625rem 1rem",
                background: "transparent",
                color: "var(--color-cream, #fff)",
                borderRadius: "0.75rem",
                fontWeight: 600,
                fontSize: "0.85rem",
                border: "1px solid rgba(255, 46, 136, 0.3)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 46, 136, 0.1)";
                e.currentTarget.style.borderColor = "rgba(255, 46, 136, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(255, 46, 136, 0.3)";
              }}
            >
              <Home size={14} />
              Back to Arcade
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }
}

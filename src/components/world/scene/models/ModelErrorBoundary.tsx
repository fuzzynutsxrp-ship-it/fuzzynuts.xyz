"use client";

import { Component, type ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
   ModelErrorBoundary — Catches GLTF loader / clone exceptions
   so a broken model never tanks the whole 3D scene.

   React error boundaries must be class components. Kept tiny and
   colocated with the Model wrapper.
   ───────────────────────────────────────────────────────────── */

interface State {
  hasError: boolean;
}

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error("[ModelErrorBoundary] GLTF model failed to render:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

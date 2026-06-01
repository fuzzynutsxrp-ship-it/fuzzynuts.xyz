"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * useScoreSubmission — Validate & submit scores with anti-cheat
 *
 * Extracted from useArcadeState.ts for single-responsibility.
 * Listens for postMessage events from the game iframe, validates
 * against score caps and minimum play duration, and debounces
 * rapid submissions. Tracks session uniqueness via localStorage.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef, useEffect } from "react";

import type { SubmissionStatus, ScoreSubmissionReturn } from "../types/arcade";
import { SCORE_CAPS, MIN_PLAY_DURATION_MS, SUBMIT_COOLDOWN_MS } from "../constants";
import { getCurrentWeekKey } from "../utils/scoreHelpers";

/**
 * Manages score submission lifecycle inside GameWrapper.
 * Listens for postMessage events from the game iframe, validates
 * against score caps and minimum play duration, and debounces
 * rapid submissions. Tracks session uniqueness via localStorage.
 *
 * @param slug - Game ID slug for score cap lookup
 * @returns Object with submission status, error message, and control functions
 */
export function useScoreSubmission(slug: string): ScoreSubmissionReturn {
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const gameStartRef = useRef<number>(Date.now());
  const lastSubmitRef = useRef<number>(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionKeyRef = useRef<string>(`fuzzy_session_${slug}_${Date.now()}`);

  const markGameStart = useCallback(() => {
    gameStartRef.current = Date.now();
    sessionKeyRef.current = `fuzzy_session_${slug}_${Date.now()}`;
  }, [slug]);

  const dismiss = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;

      // ── Handle score error channel from iframe ──
      if (event.data.type === "SCORE_ERROR") {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        setStatus("error");
        setErrorMessage(event.data.message || "Score submission failed");
        dismissTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 5000);
        return;
      }

      // ── Handle standard score submission ──
      if (event.data.type !== "FUZZY_SCORE_SUBMITTED") return;

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

      // Debounce: reject if too fast
      const now = Date.now();
      if (now - lastSubmitRef.current < SUBMIT_COOLDOWN_MS) {
        setStatus("error");
        setErrorMessage("Too fast — wait a few seconds between submissions");
        dismissTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 4000);
        return;
      }

      // Validate play duration
      const duration = now - gameStartRef.current;
      if (duration < MIN_PLAY_DURATION_MS) {
        setStatus("error");
        setErrorMessage("Play session too short — score rejected");
        dismissTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 4000);
        return;
      }

      // Validate score cap
      const score = event.data.score as number | undefined;
      const cap = SCORE_CAPS[slug] ?? Infinity;
      if (score !== undefined && (score <= 0 || score > cap)) {
        setStatus("error");
        setErrorMessage(`Invalid score — must be between 1 and ${cap.toLocaleString()}`);
        dismissTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 4000);
        return;
      }

      // Duplicate session check
      try {
        const sessionFlag = `fuzzy_submitted_${slug}_${getCurrentWeekKey()}`;
        const lastSession = localStorage.getItem(sessionFlag);
        if (lastSession === sessionKeyRef.current) {
          setStatus("error");
          setErrorMessage("Score already submitted for this session");
          dismissTimerRef.current = setTimeout(() => {
            setStatus("idle");
            setErrorMessage(null);
          }, 4000);
          return;
        }
        // Mark this session as submitted
        localStorage.setItem(sessionFlag, sessionKeyRef.current);
      } catch {
        // localStorage unavailable — proceed anyway
      }

      lastSubmitRef.current = now;

      // Show result from iframe's own submission
      if (event.data.success) {
        setStatus("success");
        setErrorMessage(null);
        setLastScore(typeof score === "number" ? score : null);
      } else {
        setStatus("error");
        const reason = event.data.reason || event.data.message;
        if (typeof reason === "string") {
          // Map API error codes to user-friendly messages
          if (reason.includes("429") || reason.toLowerCase().includes("rate")) {
            setErrorMessage("Rate limited — try again in a minute");
          } else if (reason.includes("400") || reason.toLowerCase().includes("validation")) {
            setErrorMessage("Score validation failed — invalid data");
          } else if (reason.includes("500")) {
            setErrorMessage("Server error — please try again later");
          } else {
            setErrorMessage(reason);
          }
        } else {
          setErrorMessage("Score submission failed — try again");
        }
      }

      dismissTimerRef.current = setTimeout(() => {
        setStatus("idle");
        setErrorMessage(null);
      }, 4000);
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [slug]);

  return { status, errorMessage, lastScore, markGameStart, dismiss };
}

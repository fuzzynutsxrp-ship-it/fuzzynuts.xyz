"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * usePayoutEligibility — Check eligibility, claim, track tx
 *
 * Extracted from useArcadeState.ts for single-responsibility.
 * Manages the full payout lifecycle: eligibility check, confirmation,
 * claim execution, polling for transaction status, and persisting
 * claim state to localStorage to prevent double-claims.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef, useEffect } from "react";

import type { EligibilityData, ClaimResponse, ClaimStatus, PayoutReturn } from "../types/arcade";
import { API_REWARDS } from "../constants";
import { getCurrentWeekKey } from "../utils/scoreHelpers";

/**
 * Manages the full payout lifecycle: eligibility check, confirmation,
 * claim execution, polling for transaction status, and persisting
 * claim state to localStorage to prevent double-claims.
 *
 * @param wallet - Connected XRPL wallet address (null if disconnected)
 * @returns Object with eligibility data, claim functions, and status
 */
export function usePayoutEligibility(wallet: string | null): PayoutReturn {
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const CLAIM_STORAGE_KEY = `fuzzy_claimed_${getCurrentWeekKey()}`;

  /** Check if already claimed this week (localStorage guard) */
  const isAlreadyClaimed = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(CLAIM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.wallet === wallet && parsed.claimed) {
          setTxHash(parsed.txHash || null);
          return true;
        }
      }
    } catch {
      // localStorage unavailable
    }
    return false;
  }, [wallet, CLAIM_STORAGE_KEY]);

  /** Fetch eligibility from the API */
  const checkEligibility = useCallback(async () => {
    if (!wallet) return;

    // Check localStorage first
    if (isAlreadyClaimed()) {
      setStatus("already-claimed");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("checking");
    setError(null);

    try {
      const week = getCurrentWeekKey();
      const url = `${API_REWARDS}/eligibility?wallet=${encodeURIComponent(wallet)}&week=${week}`;
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data: EligibilityData = await res.json();
      setEligibility(data);

      if (data.claimed) {
        setTxHash(data.txHash || null);
        setStatus("already-claimed");
        // Persist to localStorage
        try {
          localStorage.setItem(
            CLAIM_STORAGE_KEY,
            JSON.stringify({ wallet, claimed: true, txHash: data.txHash }),
          );
        } catch {}
      } else if (data.eligible) {
        setStatus("eligible");
      } else {
        setStatus("not-eligible");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Graceful fallback — show not eligible rather than crashing
      setEligibility({
        eligible: false,
        rank: null,
        game: null,
        prize: null,
        claimed: false,
        txHash: null,
        usd_value: null,
        nut_amount: null,
        snapshot_price: null,
        snapshot_timestamp: null,
        announced: false,
        tiers: null,
      });
      setStatus("not-eligible");
    }
  }, [wallet, isAlreadyClaimed, CLAIM_STORAGE_KEY]);

  /** Open confirmation dialog */
  const startClaim = useCallback(() => {
    setStatus("confirming");
    setError(null);
  }, []);

  /** Cancel confirmation */
  const cancelClaim = useCallback(() => {
    setStatus("eligible");
    setError(null);
  }, []);

  /** Execute claim and poll for tx status */
  const confirmClaim = useCallback(async () => {
    if (!wallet || !eligibility?.eligible) return;

    setStatus("claiming");
    setError(null);

    try {
      const res = await fetch(`${API_REWARDS}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          week: getCurrentWeekKey(),
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || `Server returned ${res.status}`;

        // Map specific error types
        if (res.status === 409 || msg.toLowerCase().includes("already")) {
          setStatus("already-claimed");
          try {
            localStorage.setItem(
              CLAIM_STORAGE_KEY,
              JSON.stringify({ wallet, claimed: true, txHash: null }),
            );
          } catch {}
          return;
        }

        throw new Error(msg);
      }

      const result: ClaimResponse = await res.json();

      if (result.txHash) {
        setTxHash(result.txHash);
        setStatus("success");
        // Persist claim
        try {
          localStorage.setItem(
            CLAIM_STORAGE_KEY,
            JSON.stringify({ wallet, claimed: true, txHash: result.txHash }),
          );
        } catch {}
      } else {
        // No txHash yet — poll for it
        setStatus("polling");
        let attempts = 0;
        const maxAttempts = 15; // 30s max

        pollTimerRef.current = setInterval(async () => {
          attempts++;
          try {
            const pollRes = await fetch(
              `${API_REWARDS}/claim/status?wallet=${encodeURIComponent(wallet)}&week=${getCurrentWeekKey()}`,
              { signal: AbortSignal.timeout(5000) },
            );
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.txHash) {
                setTxHash(pollData.txHash);
                setStatus("success");
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                try {
                  localStorage.setItem(
                    CLAIM_STORAGE_KEY,
                    JSON.stringify({ wallet, claimed: true, txHash: pollData.txHash }),
                  );
                } catch {}
              } else if (pollData.status === "failed") {
                setError("Transaction failed on XRPL — contact support");
                setStatus("error");
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              }
            }
          } catch {
            // Silently retry
          }
          if (attempts >= maxAttempts) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setStatus("success");
            // Even without txHash, the claim was accepted
          }
        }, 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Claim failed — please try again";
      if (message.toLowerCase().includes("reject")) {
        setError("Wallet rejected the transaction");
      } else if (
        message.toLowerCase().includes("network") ||
        message.toLowerCase().includes("timeout")
      ) {
        setError("Network error — check your connection and try again");
      } else {
        setError(message);
      }
      setStatus("error");
    }
  }, [wallet, eligibility, CLAIM_STORAGE_KEY]);

  /** Cleanup polling on unmount */
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  /** Auto-check eligibility on wallet connect */
  useEffect(() => {
    if (wallet) checkEligibility();
  }, [wallet, checkEligibility]);

  return {
    eligibility,
    status,
    error,
    txHash,
    checkEligibility,
    startClaim,
    cancelClaim,
    confirmClaim,
  };
}

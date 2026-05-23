"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";

const COOKIE_NAME = "fuzzynuts_auth";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`;
}

export default function PasswordGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null); // null = loading
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check cookie on mount
  useEffect(() => {
    const cookie = getCookie(COOKIE_NAME);
    if (cookie === "granted") {
      setIsAuthed(true);
    } else {
      setIsAuthed(false);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);
      setError("");

      // Direct comparison — simple and effective for a site password
      if (password === "shafic33") {
        setCookie(COOKIE_NAME, "granted", 60 * 60 * 24 * 30); // 30 days
        setIsAuthed(true);
      } else {
        setError("Wrong password. Try again.");
        setPassword("");
      }
      setIsSubmitting(false);
    },
    [password, isSubmitting]
  );

  // Loading state — prevent flash
  if (isAuthed === null) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#010508",
          zIndex: 99999,
        }}
      />
    );
  }

  // Authed — render the site
  if (isAuthed) {
    return <>{children}</>;
  }

  // Password prompt
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 30%, #0d1117 0%, #010508 70%)",
        fontFamily: "var(--font-body), Inter, system-ui, sans-serif",
      }}
    >
      {/* Animated background particles */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: `rgba(218, 165, 32, ${0.1 + Math.random() * 0.3})`,
              borderRadius: "50%",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `passwordFloat ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 3}s infinite alternate`,
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "420px",
          margin: "0 20px",
          padding: "48px 40px",
          background: "rgba(13, 17, 23, 0.85)",
          backdropFilter: "blur(24px) saturate(1.2)",
          WebkitBackdropFilter: "blur(24px) saturate(1.2)",
          border: "1px solid rgba(218, 165, 32, 0.15)",
          borderRadius: "20px",
          boxShadow: `
            0 0 80px rgba(218, 165, 32, 0.06),
            0 25px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.04)
          `,
          textAlign: "center",
        }}
      >
        {/* Logo / Icon */}
        <div
          style={{
            width: "72px",
            height: "72px",
            margin: "0 auto 24px",
            background: "linear-gradient(135deg, rgba(218, 165, 32, 0.15), rgba(218, 165, 32, 0.05))",
            borderRadius: "18px",
            border: "1px solid rgba(218, 165, 32, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
          }}
        >
          🔒
        </div>

        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "22px",
            fontWeight: 700,
            color: "#F0EDE6",
            letterSpacing: "-0.02em",
            fontFamily: "var(--font-display), Outfit, sans-serif",
          }}
        >
          Access Required
        </h1>
        <p
          style={{
            margin: "0 0 32px",
            fontSize: "14px",
            color: "rgba(240, 237, 230, 0.5)",
            lineHeight: 1.5,
          }}
        >
          Enter the password to access Fuzzynuts
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter password"
              autoFocus
              autoComplete="off"
              style={{
                width: "100%",
                padding: "14px 18px",
                fontSize: "15px",
                fontFamily: "inherit",
                color: "#F0EDE6",
                background: "rgba(255, 255, 255, 0.04)",
                border: error
                  ? "1px solid rgba(239, 68, 68, 0.5)"
                  : "1px solid rgba(218, 165, 32, 0.2)",
                borderRadius: "12px",
                outline: "none",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(218, 165, 32, 0.5)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(218, 165, 32, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = error
                  ? "rgba(239, 68, 68, 0.5)"
                  : "rgba(218, 165, 32, 0.2)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {error && (
            <p
              style={{
                margin: "0 0 16px",
                fontSize: "13px",
                color: "#ef4444",
                animation: "passwordShake 0.4s ease",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !password}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "inherit",
              color: "#010508",
              background:
                isSubmitting || !password
                  ? "rgba(218, 165, 32, 0.3)"
                  : "linear-gradient(135deg, #DAA520, #C4941A)",
              border: "none",
              borderRadius: "12px",
              cursor: isSubmitting || !password ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && password) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(218, 165, 32, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {isSubmitting ? "Verifying..." : "Unlock"}
          </button>
        </form>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes passwordFloat {
          0% { transform: translateY(0) scale(1); opacity: 0.3; }
          100% { transform: translateY(-30px) scale(1.5); opacity: 0.1; }
        }
        @keyframes passwordShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect, useRef, useCallback } from "react";

interface Nut {
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  type: number; // 0=acorn, 1=nut, 2=leaf, 3=golden-acorn
  swayPhase: number;
}

export function FallingNuts() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const createNut = useCallback((w: number): Nut => {
    const isGolden = Math.random() < 0.06; // 6% chance of golden acorn
    return {
      x: Math.random() * w,
      y: -20 - Math.random() * 200,
      size: isGolden ? 18 + Math.random() * 8 : 8 + Math.random() * 10,
      speed: isGolden ? 0.2 + Math.random() * 0.4 : 0.3 + Math.random() * 0.7,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.015,
      opacity: isGolden ? 0.5 + Math.random() * 0.3 : 0.12 + Math.random() * 0.25,
      type: isGolden ? 3 : Math.floor(Math.random() * 3),
      swayPhase: Math.random() * Math.PI * 2,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Mobile detection: fewer particles for performance
    const isMobile = window.innerWidth < 768;
    const NUT_COUNT = isMobile ? 8 : 18;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawAcorn = (n: Nut) => {
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(n.rotation);
      ctx.globalAlpha = n.opacity;
      const s = n.size;

      // Cap
      ctx.fillStyle = "#8B6914";
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.3, s * 0.5, s * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crosshatch lines
      ctx.strokeStyle = "#6B4F10";
      ctx.lineWidth = 0.5;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.15, -s * 0.45);
        ctx.lineTo(i * s * 0.15, -s * 0.15);
        ctx.stroke();
      }

      // Body
      ctx.fillStyle = "#D4A030";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.15, s * 0.4, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tip
      ctx.fillStyle = "#B8860B";
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, s * 0.55);
      ctx.lineTo(0, s * 0.7);
      ctx.lineTo(s * 0.08, s * 0.55);
      ctx.fill();

      // Stem
      ctx.strokeStyle = "#5C3D10";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(0, -s * 0.7);
      ctx.stroke();

      ctx.restore();
    };

    const drawGoldenAcorn = (n: Nut) => {
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(n.rotation);
      ctx.globalAlpha = n.opacity;
      const s = n.size;

      // Golden glow
      ctx.shadowColor = "#f5c442";
      ctx.shadowBlur = s * 0.6;

      // Golden cap
      ctx.fillStyle = "#DAA520";
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.3, s * 0.5, s * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Crosshatch
      ctx.strokeStyle = "#B8860B";
      ctx.lineWidth = 0.7;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.15, -s * 0.45);
        ctx.lineTo(i * s * 0.15, -s * 0.15);
        ctx.stroke();
      }

      // Golden body
      ctx.fillStyle = "#f5c442";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.15, s * 0.4, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = "rgba(255,240,180,0.35)";
      ctx.beginPath();
      ctx.ellipse(-s * 0.1, s * 0.05, s * 0.15, s * 0.25, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Tip
      ctx.fillStyle = "#DAA520";
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, s * 0.55);
      ctx.lineTo(0, s * 0.7);
      ctx.lineTo(s * 0.08, s * 0.55);
      ctx.fill();

      ctx.restore();
    };

    const drawNut = (n: Nut) => {
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(n.rotation);
      ctx.globalAlpha = n.opacity;
      const s = n.size;

      ctx.fillStyle = "#A0724A";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#7A5233";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, 0);
      ctx.lineTo(s * 0.45, 0);
      ctx.stroke();

      ctx.fillStyle = "#8A6240";
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawLeaf = (n: Nut) => {
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(n.rotation);
      ctx.globalAlpha = n.opacity * 0.5;
      const s = n.size;

      ctx.fillStyle = "#2d5a2d";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.quadraticCurveTo(s * 0.5, -s * 0.2, 0, s * 0.5);
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.2, 0, -s * 0.5);
      ctx.fill();

      ctx.strokeStyle = "#4a7a4a";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.4);
      ctx.lineTo(0, s * 0.4);
      ctx.stroke();

      ctx.restore();
    };

    resize();
    const nuts: Nut[] = Array.from({ length: NUT_COUNT }, () => {
      const n = createNut(w);
      n.y = Math.random() * h; // spread initially
      return n;
    });

    let lastTime = 0;
    const animate = (time: number) => {
      const delta = Math.min(time - lastTime, 50); // cap at 50ms (20fps min)
      lastTime = time;
      const speed = delta / 16.67; // normalize to 60fps

      ctx.clearRect(0, 0, w, h);

      for (const n of nuts) {
        n.y += n.speed * speed;
        n.rotation += n.rotationSpeed * speed;
        n.x += Math.sin(n.y * 0.008 + n.swayPhase) * 0.35 * speed;

        if (n.y > h + 40) {
          Object.assign(n, createNut(w));
        }

        switch (n.type) {
          case 0: drawAcorn(n); break;
          case 1: drawNut(n); break;
          case 2: drawLeaf(n); break;
          case 3: drawGoldenAcorn(n); break;
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // Pause animation when tab is hidden to save CPU
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animFrameRef.current);
      } else {
        lastTime = performance.now();
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    window.addEventListener("resize", resize, { passive: true });
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [createNut]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
      style={{ opacity: 0.65 }}
    />
  );
}

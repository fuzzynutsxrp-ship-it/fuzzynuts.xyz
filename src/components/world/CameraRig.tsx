"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useScrollState, STATIONS } from "./ScrollContext";

/* ─────────────────────────────────────────────────────────────
   CameraRig — Drives the camera along a curved path through the
   forest as the user scrolls.

   Two control modes:
   • Scroll-driven (default): cameraPos lerps between STATIONS
     using the global scroll offset.
   • Override (portal click): a transient target the parent
     pushes in for ~600ms while doing a "zoom into portal" FX.
     When `override.current` is non-null, we ignore scroll and
     ease toward it instead.

   No deps on react state — all per-frame mutations on refs so
   we never re-render React on scroll.
   ───────────────────────────────────────────────────────────── */

export interface CameraOverride {
  current: {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    /** Timestamp (performance.now ms) when override expires. */
    expires: number;
  } | null;
}

interface CameraRigProps {
  override?: CameraOverride;
}

const _posTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3();

export function CameraRig({ override }: CameraRigProps) {
  const scroll = useScrollState();
  // Smoothed look-at point — separate from the camera position so we can
  // interpolate the camera's orientation independently of its translation.
  const lookRef = useRef(new THREE.Vector3(0, 1.5, 0));

  useFrame((state, dt) => {
    // ── Compute target camera pose ──
    const overrideActive =
      override?.current && override.current.expires > performance.now();
    if (overrideActive && override?.current) {
      _posTarget.copy(override.current.position);
      _lookTarget.copy(override.current.lookAt);
    } else {
      // Find adjacent stations bracketing the current offset and lerp.
      const t = scroll.offset;
      // Locate segment.
      let from = STATIONS[0];
      let to = STATIONS[STATIONS.length - 1];
      for (let i = 0; i < STATIONS.length - 1; i++) {
        if (t >= STATIONS[i].from && t <= STATIONS[i + 1].from) {
          from = STATIONS[i];
          to = STATIONS[i + 1];
          break;
        }
      }
      const span = Math.max(0.0001, to.from - from.from);
      const localT = THREE.MathUtils.clamp((t - from.from) / span, 0, 1);
      // Smoothstep for buttery deceleration into each station.
      const smooth = localT * localT * (3 - 2 * localT);

      _posTarget.set(
        THREE.MathUtils.lerp(from.cameraPos[0], to.cameraPos[0], smooth),
        THREE.MathUtils.lerp(from.cameraPos[1], to.cameraPos[1], smooth),
        THREE.MathUtils.lerp(from.cameraPos[2], to.cameraPos[2], smooth),
      );
      _lookTarget.set(
        THREE.MathUtils.lerp(from.lookAt[0], to.lookAt[0], smooth),
        THREE.MathUtils.lerp(from.lookAt[1], to.lookAt[1], smooth),
        THREE.MathUtils.lerp(from.lookAt[2], to.lookAt[2], smooth),
      );

      // Subtle parallax sway so the world never feels static.
      const wobble = state.clock.elapsedTime;
      _posTarget.x += Math.sin(wobble * 0.3) * 0.18;
      _posTarget.y += Math.sin(wobble * 0.45) * 0.08;
    }

    // ── Ease camera toward target (frame-rate independent) ──
    const k = 1 - Math.pow(0.001, dt); // critically damped feel
    state.camera.position.lerp(_posTarget, k);
    lookRef.current.lerp(_lookTarget, k);
    _currentLook.copy(lookRef.current);
    state.camera.lookAt(_currentLook);
  });

  return null;
}

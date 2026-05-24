"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF, Clone } from "@react-three/drei";
import { ErrorBoundary } from "./ModelErrorBoundary";

/* ─────────────────────────────────────────────────────────────
   Model — Reusable GLTF wrapper.

   • `useGLTF` loads (and caches) the scene from `url`. The drei
     hook deduplicates identical URLs, so 6 <Model url="x.glb"/>
     calls = 1 download.
   • `<Clone>` is used (not raw <primitive>) because the same
     loaded scene can't be parented to multiple meshes in the
     graph at once — Clone gives each placement its own copy of
     the node tree while still sharing geometries + materials.
   • Dispose: useGLTF caches at the URL level, so manual dispose
     would break sibling instances. We rely on drei's cache.
   • If loading fails, the ErrorBoundary renders `null` (graceful
     degrade) so the rest of the scene still renders.
   ───────────────────────────────────────────────────────────── */

export interface ModelProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  /** Apply castShadow / receiveShadow recursively on every mesh. */
  shadows?: boolean;
  /** Optional per-instance opacity multiplier (0..1). Walks the
   *  cloned mesh tree and clones materials so we don't mutate the
   *  shared cached ones. Skip if you don't need it. */
  opacity?: number;
}

function ModelInner({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  shadows = false,
  opacity,
}: ModelProps) {
  const { scene } = useGLTF(url);

  // For per-instance opacity we need cloned materials. Memoized by
  // both `scene` and `opacity` so the work happens once per change.
  const finalScene = useMemo(() => {
    if (opacity === undefined || opacity >= 1) return scene;
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const mat = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m.clone())
          : mesh.material.clone();
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            m.transparent = true;
            m.opacity = opacity;
          });
        } else {
          mat.transparent = true;
          mat.opacity = opacity;
        }
        mesh.material = mat;
      }
    });
    return cloned;
  }, [scene, opacity]);

  // Apply shadow flags on first mount + whenever the scene changes.
  useEffect(() => {
    if (!shadows) return;
    finalScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [finalScene, shadows]);

  return (
    <Clone
      object={finalScene}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

export function Model(props: ModelProps) {
  return (
    <ErrorBoundary fallback={null}>
      <ModelInner {...props} />
    </ErrorBoundary>
  );
}

/* ─────────────────────────────────────────────────────────────
   Preload helpers — call from a top-level effect so the GLBs
   start downloading immediately, not when the first <Model> in
   the tree first mounts. Drei's useGLTF.preload is the idiomatic
   way to do this.
   ───────────────────────────────────────────────────────────── */
export const preloadModel = (url: string) => {
  useGLTF.preload(url);
};

export default Model;

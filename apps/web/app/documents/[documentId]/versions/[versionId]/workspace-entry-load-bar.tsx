"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import styles from "../../../../disclosure.module.css";

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/**
 * Full-width 0→100% stripe after hydration — portaled to `document.body` so it is never
 * clipped by layout/stacking. Remount via parent `key` on each document/version navigation.
 */
export function WorkspaceEntryLoadBar() {
  const [mounted, setMounted] = useState(false);
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<"run" | "fade" | "gone">("run");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let rafId = 0;
    let holdTimer: number | undefined;
    let fadeTimer: number | undefined;
    const durationMs = 1700;
    const start = performance.now();

    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / durationMs);
      setPct(Math.min(100, Math.round(easeOutCubic(raw) * 100)));
      if (raw < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setPct(100);
        holdTimer = window.setTimeout(() => {
          setPhase("fade");
          fadeTimer = window.setTimeout(() => setPhase("gone"), 450);
        }, 600);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (holdTimer !== undefined) window.clearTimeout(holdTimer);
      if (fadeTimer !== undefined) window.clearTimeout(fadeTimer);
    };
  }, [mounted]);

  if (!mounted || phase === "gone" || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={styles.workspaceEntryLoadBarWrap}
      data-fade={phase === "fade" ? "true" : undefined}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Workspace loading"
    >
      <div
        className={styles.workspaceEntryLoadBarFill}
        style={{ width: `${pct}%` }}
      />
    </div>,
    document.body,
  );
}

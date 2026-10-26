"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "drawing" | "completing" | "revealing" | "complete";

/** The drawing finishes after asset readiness; the camera owns a separate clock. */
export function useOpeningSequence(status: "loading" | "ready" | "fallback") {
  const [phase, setPhase] = useState<Phase>("drawing");
  const [initiated, setInitiated] = useState(false);
  const finished = useRef(false);
  const clock = useRef({ skipCamera: false });
  useEffect(() => {
    const frame = requestAnimationFrame(() => setInitiated(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = () => {
      finished.current = true;
      clock.current.skipCamera = true;
      setPhase("complete");
    };
    const onMotion = () => {
      if (motion.matches) finish();
    };
    if (motion.matches || status === "fallback") {
      finish();
      return;
    }
    // A deep link skips only the camera travel, preserving the independent clock.
    if (window.scrollY > 100 || (location.hash && location.hash !== "#hero"))
      clock.current.skipCamera = true;
    if (status === "ready" && !finished.current) {
      setPhase("completing");
      timers.push(
        setTimeout(() => {
          setPhase("revealing");
          timers.push(
            setTimeout(() => {
              finished.current = true;
              setPhase("complete");
            }, 1600),
          );
        }, 1000),
      );
    }
    motion.addEventListener("change", onMotion);
    return () => {
      timers.forEach(clearTimeout);
      motion.removeEventListener("change", onMotion);
    };
  }, [status]);
  return { phase, initiated, clock };
}

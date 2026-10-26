"use client";

import { useEffect, useRef } from "react";

/** The orbit moves independently so the numeral remains upright. */
export function PlusOneMark({ loading = false, className = "" }: { loading?: boolean; className?: string }) {
  const orbit = useRef<SVGGElement>(null);
  const position = useRef({ angle: 0, velocity: 0 });

  useEffect(() => {
    const element = orbit.current;
    if (!element) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const paint = () => {
      element.setAttribute("transform", `rotate(${((position.current.angle % 360) + 360) % 360} 64 64)`);
    };
    const rest = () => {
      cancelAnimationFrame(frame);
      position.current = { angle: 0, velocity: 0 };
      element.dataset.motion = "idle";
      paint();
    };
    const run = () => {
      cancelAnimationFrame(frame);
      if (motion.matches) return rest();
      const started = performance.now();
      const from = position.current.angle;
      const speed = 0.24;
      let distance = 360 - ((from % 360) + 360) % 360;
      if (distance < 55) distance += 360;
      const duration = Math.max(400, Math.min(900, distance / speed));
      const slope = Math.min(2.8, (position.current.velocity * duration) / distance);
      if (!loading && Math.abs(from) < 0.01) return rest();
      element.dataset.motion = loading ? "loading" : "settling";
      const tick = (time: number) => {
        const elapsed = Math.max(0, time - started);
        if (loading) {
          const decay = Math.exp(-elapsed / 180);
          position.current = { angle: from + speed * (elapsed - 180 * (1 - decay)), velocity: speed * (1 - decay) };
        } else {
          const t = Math.min(1, elapsed / duration);
          if (t === 1) return rest();
          const progress = slope * t + (3 - 2 * slope) * t * t + (slope - 2) * t * t * t;
          position.current = {
            angle: from + distance * progress,
            velocity: (distance / duration) * (slope + 2 * (3 - 2 * slope) * t + 3 * (slope - 2) * t * t),
          };
        }
        paint();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    run();
    motion.addEventListener("change", run);
    return () => { cancelAnimationFrame(frame); motion.removeEventListener("change", run); };
  }, [loading]);

  return (
    <svg className={`plusone-mark ${className}`} viewBox="0 0 128 128" aria-hidden="true">
      <g ref={orbit} data-motion="idle">
        <path d="M111.553 48.549 A50 50 0 1 1 79.451 16.447" fill="none" stroke="currentColor" strokeWidth="8.6" strokeLinecap="round" />
        <circle cx="99.355" cy="28.645" r="8.5" fill="currentColor" />
      </g>
      <path d="M69.7 30.3 Q72 28.6 72 31.8 L72 88.2 C72 96.7 74 99.2 80.5 100.2 Q82 100.4 82 102 L82 103 L47.5 103 L47.5 102 Q47.5 100.4 49 100.2 C56.1 99.2 58.5 96.7 58.5 88.2 L58.5 48.6 Q58.5 46.3 56.3 47.2 L47.2 50.5 Q44.9 51.4 44 49.8 Q43.3 48.4 45 47.2 Z" fill="currentColor" />
    </svg>
  );
}

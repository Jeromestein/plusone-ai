"use client";

import { useEffect, useRef, useState } from "react";
import { keySession } from "@/lib/renaissance/key-transport";

export function KeyExplorer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false,
      stage: { dispose(): void } | undefined;
    const sid = new URLSearchParams(location.search).get("sid") || keySession();
    import("@/lib/renaissance/create-key-stage")
      .then(({ createKeyStage }) => {
        if (!disposed)
          stage = createKeyStage(
            canvas.current!,
            sid,
            () => setLoaded(true),
            (reason) => {
              if (!disposed) {
                console.error("Key artwork failed", reason);
                setError(true);
              }
            },
          );
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      stage?.dispose();
    };
  }, []);
  return (
    <div className="key-explorer" data-loaded={loaded}>
      <canvas
        ref={canvas}
        aria-label="Click to pick up or put down the golden object. Move this window to align the key with its lock."
      />
      {!loaded && !error && (
        <div
          className="key-loading"
          role="status"
          aria-label="Loading key artwork"
        />
      )}
      {error && (
        <p className="key-error" role="alert">
          The artwork could not load. Close this window and open the key again.
        </p>
      )}
    </div>
  );
}

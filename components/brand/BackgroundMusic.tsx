"use client";

import { useEffect, useRef, useState } from "react";

const track = "/audio/dakooka-anime-vibe-slow.mp3";

export function BackgroundMusic() {
  const audio = useRef<HTMLAudioElement>(null);
  const request = useRef(0);
  const [phase, setPhase] = useState<"paused" | "loading" | "playing">("paused");
  const [error, setError] = useState("");
  const active = phase !== "paused";

  useEffect(() => {
    const player = audio.current;
    return () => {
      request.current += 1;
      player?.pause();
      if (player?.hasAttribute("src")) {
        player.removeAttribute("src");
        player.load();
      }
    };
  }, []);

  const toggle = async () => {
    const player = audio.current;
    if (!player) return;
    const attempt = ++request.current;
    setError("");
    if (!player.paused) {
      player.pause();
      return;
    }
    // Keep the audio out of the opening download until a visitor asks for it.
    if (!player.hasAttribute("src")) {
      player.src = track;
      player.volume = 0.3;
    } else if (player.error) {
      player.load();
    }
    try {
      await player.play();
    } catch (cause) {
      if (attempt !== request.current || (cause instanceof DOMException && cause.name === "AbortError")) return;
      setPhase("paused");
      setError("Music could not play. Please try again.");
    }
  };

  return (
    <div className="plusone-music">
      <audio ref={audio} loop preload="none" aria-hidden="true"
        onPlay={() => setPhase("loading")}
        onPlaying={() => setPhase("playing")}
        onWaiting={() => { if (!audio.current?.paused) setPhase("loading"); }}
        onPause={() => setPhase("paused")}
        onError={() => { audio.current?.pause(); setPhase("paused"); setError("Music could not load. Please try again."); }}
      />
      <button type="button" className="plusone-music-toggle" onClick={toggle}
        aria-label={active ? "Pause background music" : "Play background music"}
        title={phase === "loading" ? "Loading music · Click to pause" : active ? "Pause background music" : "Play background music"}
        data-state={phase}>
        <svg className="plusone-music-note" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path d="M7 15V5l9-2v10M7 8l9-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="4.5" cy="15" rx="2.5" ry="1.8" fill="currentColor" />
          <ellipse cx="13.5" cy="13" rx="2.5" ry="1.8" fill="currentColor" />
        </svg>
        <svg className="plusone-playback-icon" viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
          {active ? <><rect x="5" y="4" width="3" height="12" rx="0.6" /><rect x="12" y="4" width="3" height="12" rx="0.6" /></> : <path d="M6 3.8a.7.7 0 0 1 1.05-.6l9 6.2a.72.72 0 0 1 0 1.2l-9 6.2a.7.7 0 0 1-1.05-.6Z" />}
        </svg>
      </button>
      <span className="plusone-music-status" role="status">{error}</span>
    </div>
  );
}

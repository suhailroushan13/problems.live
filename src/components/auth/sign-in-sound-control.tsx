"use client";

import { useRef, useState } from "react";
import { Square, Volume2, VolumeX } from "lucide-react";

/** Optional, user-initiated ambience for the sign-in experience. */
export function SignInSoundControl() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  async function toggleSound() {
    const audio = audioRef.current;
    if (!audio) return;

    if (!playing) {
      try {
        audio.volume = 0.55;
        audio.muted = false;
        await audio.play();
        setMuted(false);
        setPlaying(true);
      } catch {
        // Browsers may reject playback; this control remains safe to retry.
      }
      return;
    }

    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }

  function stop() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    setPlaying(false);
    setMuted(false);
  }

  const label = !playing
    ? "Play sound"
    : muted
      ? "Unmute sound"
      : "Mute sound";

  return (
    <div className="inline-flex items-center rounded-full border border-hairline bg-elevated p-1 shadow-sm">
      <audio ref={audioRef} src="/people.mp3" preload="metadata" onEnded={() => { setPlaying(false); setMuted(false); }} />
      <button
        type="button"
        onClick={() => void toggleSound()}
        aria-label={label}
        title={label}
        className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        {playing && muted ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
      </button>
      {playing ? (
        <button
          type="button"
          onClick={stop}
          aria-label="Stop sound"
          title="Stop sound"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <Square className="size-3.5 fill-current" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

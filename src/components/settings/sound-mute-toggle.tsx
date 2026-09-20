"use client";

import { Switch } from "@/components/ui/switch";
import { setSoundMuted, useSoundMuted } from "@/components/ui/sound";

export function SoundMuteToggle() {
  const muted = useSoundMuted();

  return (
    <Switch
      checked={!muted}
      onCheckedChange={(checked) => setSoundMuted(!checked)}
      aria-label={muted ? "Unmute interface click sounds" : "Mute interface click sounds"}
    />
  );
}

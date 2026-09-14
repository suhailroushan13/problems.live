"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePlatformSetting } from "@/actions/admin";

export function SettingRow({
  settingKey,
  label,
  description,
  value,
  isPair,
}: {
  settingKey: string;
  label: string;
  description: string;
  value: string;
  isPair: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();

  const dirty = draft !== value;

  function save() {
    startTransition(async () => {
      const result = await updatePlatformSetting(settingKey, draft);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${label} saved.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:max-w-md">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="num w-40"
          placeholder={isPair ? "max, seconds" : undefined}
          aria-label={label}
        />
        <Button size="sm" onClick={save} disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

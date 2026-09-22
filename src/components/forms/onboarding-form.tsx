"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Dice5, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarPicker } from "@/components/forms/avatar-picker";
import {
  checkUsernameAvailable,
  completeOnboarding,
  generateAnonymousUsername,
  updateAvatar,
} from "@/actions/auth";
import { usernameSchema } from "@/lib/validation/schemas";
import type { AvatarStyle, AvatarType } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type UsernameStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable"; reason: string };

const CHECK_DELAY_MS = 400;

export function OnboardingForm({
  initialUsername,
  next,
  name,
  avatar,
  avatarType,
  avatarStyle,
  avatarSeed,
  uploadedAvatarUrl,
  googleAvatarUrl,
}: {
  initialUsername: string;
  next: string;
  name: string;
  avatar?: string;
  avatarType?: AvatarType;
  avatarStyle?: AvatarStyle;
  avatarSeed?: string;
  uploadedAvatarUrl?: string;
  googleAvatarUrl?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({
    state: "idle",
  });
  const [generating, startGenerating] = useTransition();
  const [submitting, startSubmitting] = useTransition();
  const requestId = useRef(0);
  const usernameIsValid = usernameSchema.safeParse(username.trim().toLowerCase()).success;

  useEffect(() => {
    const normalized = username.trim().toLowerCase();
    const parsed = usernameSchema.safeParse(normalized);
    if (!parsed.success) return;

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setUsernameStatus({ state: "checking" });
      const result = await checkUsernameAvailable({ username: parsed.data });
      if (requestId.current !== currentRequest) return;

      if (!result.ok) {
        setUsernameStatus({ state: "idle" });
        return;
      }
      setUsernameStatus(
        result.data.available
          ? { state: "available" }
          : {
              state: "unavailable",
              reason: result.data.reason ?? "That username is taken.",
            }
      );
    }, CHECK_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [username]);

  function chooseRandomUsername() {
    startGenerating(async () => {
      const result = await generateAnonymousUsername();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setUsername(result.data.username);
      setUsernameStatus({ state: "available" });
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!usernameIsValid || usernameStatus.state !== "available") {
      toast.error("Choose an available username before continuing.");
      return;
    }

    startSubmitting(async () => {
      const result = await completeOnboarding({ username });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Your profile is ready.");
      router.replace(next);
      router.refresh();
    });
  }

  const busy = generating || submitting;

  function randomizeAvatar() {
    startGenerating(async () => {
      const result = await updateAvatar({
        avatarType: "generated",
        avatarStyle: "people",
        avatarSeed: crypto.randomUUID(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("New avatar selected.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 md:grid md:grid-cols-2 md:gap-x-7 md:space-y-0">
      <section>
        <Label>Profile photo</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          We picked an illustrated avatar for you.
        </p>
        <div className="mt-3">
          <AvatarPicker
            name={name}
            username={username}
            avatar={avatar}
            avatarType={avatarType}
            avatarStyle={avatarStyle}
            avatarSeed={avatarSeed}
            uploadedAvatarUrl={uploadedAvatarUrl}
            googleAvatarUrl={googleAvatarUrl}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={randomizeAvatar}
            disabled={busy}
            className="mt-3 w-full gap-1.5 sm:hidden"
          >
            {generating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Randomize avatar
          </Button>
        </div>
      </section>

      <section className="border-t border-hairline pt-6 md:border-t-0 md:border-l md:pl-7 md:pt-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="onboard-username">Choose a username</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the name people see.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={chooseRandomUsername}
            disabled={busy}
            className="shrink-0 gap-1.5"
          >
            {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Dice5 className="size-3.5" />}
            Random
          </Button>
        </div>

        <div className="flex items-center gap-0">
          <span className="flex h-11 items-center rounded-l-lg border border-r-0 border-input bg-sunken px-3.5 text-sm text-muted-foreground">
            u/
          </span>
          <div className="relative flex-1">
            <Input
              id="onboard-username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value.toLowerCase());
                setUsernameStatus({ state: "idle" });
              }}
              className={cn(
                "rounded-l-none pr-10",
                usernameStatus.state === "available" && "border-emerald-500 focus-visible:ring-emerald-500",
                usernameStatus.state === "unavailable" && "border-destructive focus-visible:ring-destructive"
              )}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={usernameStatus.state === "unavailable"}
              required
            />
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
              {usernameStatus.state === "checking" ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : usernameStatus.state === "available" ? (
                <Check className="size-4 text-emerald-600" />
              ) : usernameStatus.state === "unavailable" ? (
                <X className="size-4 text-destructive" />
              ) : null}
            </span>
          </div>
        </div>
        <p
          className={cn(
            "mt-2 text-xs",
            usernameStatus.state === "available"
              ? "text-emerald-700"
              : usernameStatus.state === "unavailable"
                ? "text-destructive"
                : "text-muted-foreground"
          )}
        >
          {usernameStatus.state === "checking"
            ? "Checking availability…"
            : usernameStatus.state === "available"
              ? "Available, this keeps your profile separate from your Google name."
              : usernameStatus.state === "unavailable"
                ? usernameStatus.reason
                : "Use letters, numbers, dots, dashes and underscores."}
        </p>
      </section>

      <Button
        type="submit"
        size="lg"
        disabled={busy || !usernameIsValid || usernameStatus.state !== "available"}
        className="h-11 w-full gap-2 sm:w-auto md:col-span-2 md:mt-6"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Complete setup
      </Button>
    </form>
  );
}

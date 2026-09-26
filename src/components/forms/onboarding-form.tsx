"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Dice5, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
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
  const [generatingUsername, startGeneratingUsername] = useTransition();
  const [generatingAvatar, startGeneratingAvatar] = useTransition();
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
    startGeneratingUsername(async () => {
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
      // A complete navigation guarantees the destination reads the freshly
      // persisted onboarding state instead of a stale client router payload.
      window.location.assign(next);
    });
  }

  const busy = generatingUsername || generatingAvatar || submitting;

  function randomizeAvatar() {
    startGeneratingAvatar(async () => {
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
    <form onSubmit={submit} className="space-y-7 lg:space-y-5">
      <section className="rounded-xl border border-hairline bg-tint p-4 sm:p-5 lg:p-3.5">
        <div className="flex items-start gap-3">
          <span className="num flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-[0.6875rem] font-bold text-brand-foreground">1</span>
          <div>
            <Label>Profile photo</Label>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {googleAvatarUrl ? "Your Google photo is ready. Choose it, or make it your own." : "Choose an illustrated avatar that feels like you."}
            </p>
          </div>
        </div>
        <div className="mt-4 sm:flex sm:items-center sm:justify-between sm:gap-5 lg:mt-3">
          <AvatarPicker
            name={name}
            username={username}
            avatar={avatar}
            avatarType={avatarType}
            avatarStyle={avatarStyle}
            avatarSeed={avatarSeed}
            uploadedAvatarUrl={uploadedAvatarUrl}
            googleAvatarUrl={googleAvatarUrl}
            showLabel
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={randomizeAvatar}
            disabled={busy}
            className="mt-4 w-full gap-1.5 sm:mt-0 sm:w-auto"
          >
            {generatingAvatar ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Randomize avatar
          </Button>
        </div>
      </section>

      <section>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="num flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-[0.6875rem] font-bold text-brand-foreground">2</span>
            <div>
              <Label htmlFor="onboard-username">Claim your username</Label>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">This becomes your public profile address.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={chooseRandomUsername}
            disabled={busy}
            className="shrink-0 gap-1.5"
          >
            {generatingUsername ? <Loader2 className="size-3.5 animate-spin" /> : <Dice5 className="size-3.5" />}
            Random
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-0">
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

      <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-4">
        <p className="text-xs leading-5 text-muted-foreground">You can update your photo and profile details later.</p>
        <Button
          type="submit"
          size="lg"
          disabled={busy || !usernameIsValid || usernameStatus.state !== "available"}
          className="h-11 w-full gap-2 sm:w-auto"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Complete setup <ArrowRight className="size-4" />
        </Button>
      </div>
    </form>
  );
}

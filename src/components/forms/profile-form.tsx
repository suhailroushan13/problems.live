"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkUsernameAvailable, updateProfile } from "@/actions/auth";
import { updateProfileSchema, usernameSchema } from "@/lib/validation/schemas";
import { SOCIAL_PLATFORMS, type SocialLinks } from "@/lib/constants";
import { socialIconFor } from "@/components/shared/social-icons";
import type { z } from "zod";

type FormValues = z.input<typeof updateProfileSchema>;

type UsernameStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable"; reason: string };

const USERNAME_CHECK_DEBOUNCE_MS = 450;

export function ProfileForm({
  defaults,
  canChangeUsername,
  canSetDateOfBirth,
  avatarSlot,
}: {
  defaults: {
    name: string;
    username: string;
    bio?: string;
    socialLinks?: SocialLinks;
    dateOfBirth?: string;
  };
  /** A username may be changed exactly once, false once that change has been used. */
  canChangeUsername: boolean;
  /** A date of birth may be set exactly once, false once it has been saved. */
  canSetDateOfBirth: boolean;
  /** Rendered above the identity fields, in the left column on desktop, so
   * the caller (the settings page) owns the avatar picker while this form
   * still controls the two-column layout it sits in. */
  avatarSlot?: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({
    state: "idle",
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: defaults.name,
      username: defaults.username,
      bio: defaults.bio ?? "",
      socialLinks: Object.fromEntries(
        SOCIAL_PLATFORMS.map((platform) => [
          platform.key,
          defaults.socialLinks?.[platform.key] ?? "",
        ])
      ),
      dateOfBirth: defaults.dateOfBirth ?? "",
    },
  });

  const bio = watch("bio") ?? "";
  const username = watch("username") ?? "";

  // Instagram-style live availability check: debounce keystrokes, validate
  // the format locally first, then ask the server. `requestId` guards
  // against a slow earlier check overwriting a faster later one.
  const requestId = useRef(0);
  useEffect(() => {
    if (!canChangeUsername) return;

    const normalized = username.trim().toLowerCase();
    if (normalized === defaults.username) {
      setUsernameStatus({ state: "idle" });
      return;
    }

    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      setUsernameStatus({ state: "idle" });
      return;
    }

    setUsernameStatus({ state: "checking" });
    const thisRequest = ++requestId.current;

    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailable({ username: parsed.data });
      if (requestId.current !== thisRequest) return; // a newer keystroke won

      if (!result.ok) {
        setUsernameStatus({ state: "idle" });
        return;
      }
      setUsernameStatus(
        result.data.available
          ? { state: "available" }
          : { state: "unavailable", reason: result.data.reason ?? "That username is taken." }
      );
    }, USERNAME_CHECK_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [username, canChangeUsername, defaults.username]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Profile updated.");
      router.push(`/u/${result.data.username}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-x-10 gap-y-5 lg:grid-cols-2 lg:items-start">
        {/* Left column: identity, the fields that make this account "you". */}
        <div className="space-y-5">
          {avatarSlot}

          <div className="space-y-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" {...register("name")} aria-invalid={Boolean(errors.name)} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center gap-0">
              <span className="flex h-9 items-center rounded-l-lg border border-r-0 border-input bg-sunken px-3 text-sm text-muted-foreground">
                /u/
              </span>
              <div className="relative flex-1">
                <Input
                  id="username"
                  {...register("username")}
                  className={cn(
                    "rounded-l-none pr-9",
                    usernameStatus.state === "available" &&
                      "border-emerald-500 focus-visible:ring-emerald-500",
                    usernameStatus.state === "unavailable" &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={!canChangeUsername}
                  aria-invalid={
                    Boolean(errors.username) || usernameStatus.state === "unavailable"
                  }
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  {usernameStatus.state === "checking" ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : usernameStatus.state === "available" ? (
                    <Check className="size-4 text-emerald-500" />
                  ) : usernameStatus.state === "unavailable" ? (
                    <X className="size-4 text-destructive" />
                  ) : null}
                </span>
              </div>
            </div>
            <p
              className={cn(
                "text-xs",
                usernameStatus.state === "available"
                  ? "text-emerald-600"
                  : usernameStatus.state === "unavailable"
                    ? "text-destructive"
                    : "text-muted-foreground"
              )}
            >
              {usernameStatus.state === "checking"
                ? "Checking availability…"
                : usernameStatus.state === "available"
                  ? "That username is available."
                  : usernameStatus.state === "unavailable"
                    ? usernameStatus.reason
                    : canChangeUsername
                      ? "This is your public profile URL, you can change it once, choose carefully."
                      : "You've already used your one username change. This can't be changed again."}
            </p>
            {errors.username ? (
              <p className="text-xs text-destructive">{errors.username.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register("dateOfBirth")}
              disabled={!canSetDateOfBirth}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full sm:w-56"
              aria-invalid={Boolean(errors.dateOfBirth)}
            />
            <p className="text-xs text-muted-foreground">
              {canSetDateOfBirth
                ? "You can set this once, it can't be changed after you save it, so double check it first."
                : "Your date of birth is set and can't be changed."}
            </p>
            {errors.dateOfBirth ? (
              <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
            ) : null}
          </div>
        </div>

        {/* Right column: how you present yourself, taller fields that read
            fine sitting beside the shorter identity fields. */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className="num text-[11px] text-muted-foreground">
                {bio.length}/500
              </span>
            </div>
            <Textarea
              id="bio"
              {...register("bio")}
              rows={3}
              placeholder="What kinds of problems do you care about?"
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Supports **bold**, *italic*, line breaks, and links.
            </p>
            {errors.bio ? (
              <p className="text-xs text-destructive">{errors.bio.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Links</Label>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-input bg-hairline">
              {SOCIAL_PLATFORMS.map((platform) => {
                const Icon = socialIconFor(platform.key);
                return (
                  <div
                    key={platform.key}
                    className="flex items-center gap-0 bg-background transition-colors focus-within:bg-sunken"
                  >
                    <span
                      title={platform.label}
                      className="flex h-10 w-9 shrink-0 items-center justify-center text-muted-foreground"
                    >
                      <Icon className="size-4" />
                    </span>
                    {platform.kind === "handle" ? (
                      <span className="shrink-0 select-none text-sm text-muted-foreground">
                        @
                      </span>
                    ) : null}
                    <Input
                      id={`social-${platform.key}`}
                      {...register(`socialLinks.${platform.key}`)}
                      className="h-10 min-w-0 rounded-none border-0 bg-transparent px-1.5 shadow-none focus-visible:ring-0"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={platform.placeholder}
                      aria-label={platform.label}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Just the username, we&apos;ll build the link.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end border-t border-hairline pt-5">
        <Button
          type="submit"
          size="lg"
          disabled={
            pending ||
            !isDirty ||
            usernameStatus.state === "checking" ||
            usernameStatus.state === "unavailable"
          }
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : ("Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}

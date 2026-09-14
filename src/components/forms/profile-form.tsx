"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/actions/auth";
import { updateProfileSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

type FormValues = z.input<typeof updateProfileSchema>;

export function ProfileForm({
  defaults,
}: {
  defaults: { name: string; username: string; bio?: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
    },
  });

  const bio = watch("bio") ?? "";

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          <Input
            id="username"
            {...register("username")}
            className="rounded-l-none"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.username)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This is your public profile URL. Changing it breaks existing links.
        </p>
        {errors.username ? (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="bio">Bio</Label>
          <span className="num text-[11px] text-muted-foreground">
            {bio.length}/280
          </span>
        </div>
        <Textarea
          id="bio"
          {...register("bio")}
          rows={3}
          placeholder="What kinds of problems do you care about?"
          className="resize-none"
        />
        {errors.bio ? (
          <p className="text-xs text-destructive">{errors.bio.message}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending || !isDirty}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Saving…
          </>
        ) : ("Save changes"
        )}
      </Button>
    </form>
  );
}

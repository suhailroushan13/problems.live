"use client";

import { useRef, useState, useTransition } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { joinWaitlist } from "@/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const JOINED_CONFIRMATION = "We’ll email you when an invite becomes available.";

export function WaitlistCard({
  issuedAt,
  token,
  defaultName,
  defaultEmail,
}: {
  issuedAt: number;
  token: string;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [confirmation, setConfirmation] = useState(JOINED_CONFIRMATION);
  const submittingRef = useRef(false);

  function celebrateJoin() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const colors = ["#2563eb", "#7c3aed", "#ec4899", "#f59e0b", "#16a34a", "#06b6d4"];
    const burst = (x: number, particleCount: number, delay: number) => {
      window.setTimeout(() => {
        void confetti({
          particleCount,
          spread: 68,
          startVelocity: 34,
          origin: { x, y: 0.72 },
          colors,
        });
      }, delay);
    };

    burst(0.1, 65, 0);
    burst(0.5, 95, 100);
    burst(0.9, 65, 200);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();

    if (!name) {
      toast.error("Please enter your name.");
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid email.");
      return;
    }

    submittingRef.current = true;
    startTransition(async () => {
      try {
        const result = await joinWaitlist({
          name,
          email,
          hpCheck: form.get("hp_check"),
          issuedAt: form.get("issuedAt"),
          token: form.get("token"),
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const message = result.message ?? JOINED_CONFIRMATION;
        setConfirmation(message);
        setDone(true);
        if (message === JOINED_CONFIRMATION) celebrateJoin();
      } catch (error) {
        console.error("[waitlist] submission failed", error);
        toast.error("We couldn’t join you to the waitlist right now. Please try again.");
      } finally {
        submittingRef.current = false;
      }
    });
  }

  if (done) {
    return (
      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-hairline bg-sunken p-4">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">You&apos;re on the list.</p>
          <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
            {confirmation}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-3">
      <input type="hidden" name="issuedAt" value={issuedAt} />
      <input type="hidden" name="token" value={token} />
      {/* Honeypot — invisible and unlabeled for real visitors and screen readers; a bot that autofills every field trips it.
          Named away from any recognized autofill field (not "company"/"organization"/etc) — those names get silently
          filled by a real visitor's saved browser autofill profile even while off-screen, which used to cause real
          signups to be swallowed as if they were bots. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
      >
        <input type="text" name="hp_check" tabIndex={-1} autoComplete="off" data-1p-ignore="true" data-lpignore="true" />
      </div>
      <div>
        <Label htmlFor="waitlist-name">Name</Label>
        <Input
          id="waitlist-name"
          name="name"
          autoComplete="name"
          maxLength={80}
          required
          defaultValue={defaultName}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="waitlist-email">Email</Label>
        <Input
          id="waitlist-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          defaultValue={defaultEmail}
          className="mt-1.5"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Joining…" : "Join the waitlist"}
      </Button>
    </form>
  );
}

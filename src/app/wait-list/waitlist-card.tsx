"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Script from "next/script";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { joinWaitlist } from "@/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TURNSTILE_SITE_KEY } from "@/lib/constants";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "auto" | "light" | "dark";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

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
  const [confirmation, setConfirmation] = useState("We’ll email you when an invite becomes available.");
  const [turnstileToken, setTurnstileToken] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  // Cloudflare's script only auto-detects `.cf-turnstile` elements present at
  // load time — a widget removed and re-added later (submitting a second
  // entry after success) never gets picked up by that one-time scan. We
  // render explicitly instead, so we control exactly when a widget appears.
  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "auto",
      callback: (t) => setTurnstileToken(t),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
  }, []);

  useEffect(() => {
    if (done) return;
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [done, renderWidget]);

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
    if (!turnstileToken) {
      toast.error("Please complete the verification.");
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
          turnstileToken,
        });
        if (!result.ok) {
          toast.error(result.error);
          setTurnstileToken("");
          if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
          return;
        }
        setConfirmation(result.message ?? "We’ll email you when an invite becomes available.");
        setDone(true);
      } catch (error) {
        console.error("[waitlist] submission failed", error);
        toast.error("We couldn’t join you to the waitlist right now. Please try again.");
        setTurnstileToken("");
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
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
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />
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
        <div ref={containerRef} />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Joining…" : "Join the waitlist"}
        </Button>
      </form>
    </>
  );
}

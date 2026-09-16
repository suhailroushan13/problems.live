"use client";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

async function json(url: string, body?: unknown) {
  const response = await fetch(url, { method: "POST", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Passkey request failed.");
  return data;
}

export function PasskeySetupButton() {
  const [pending, setPending] = useState(false);
  async function setup() {
    try {
      setPending(true);
      const options = await json("/api/auth/passkey/register/options");
      const response = await startRegistration({ optionsJSON: options });
      await json("/api/auth/passkey/register/verify", response);
      toast.success("Passkey added. You can now sign in without Google.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add a passkey."); }
    finally { setPending(false); }
  }
  return <Button type="button" variant="outline" size="sm" onClick={setup} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <KeyRound />} {pending ? "Setting up" : "Create a passkey"}</Button>;
}

export function PasskeySignInButton({ next = "/" }: { next?: string }) {
  const [pending, setPending] = useState(false);
  async function signIn() {
    try {
      setPending(true);
      const options = await json("/api/auth/passkey/login/options");
      const response = await startAuthentication({ optionsJSON: options });
      const result = await json("/api/auth/passkey/login/verify", { response, next });
      window.location.assign(result.destination);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Passkey sign-in failed."); setPending(false); }
  }
  return <Button type="button" variant="outline" onClick={signIn} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <KeyRound />} {pending ? "Signing in" : "Sign in with passkey"}</Button>;
}

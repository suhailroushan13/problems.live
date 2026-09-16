"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteOwnAccount, updateAccountPreferences } from "@/actions/auth";
import {
  ACCOUNT_GENDERS,
  ACCOUNT_GENDER_LABELS,
  LOCATION_SCOPES,
  type AccountGender,
  type LocationScope,
} from "@/lib/constants";
import { COUNTRIES } from "@/lib/countries";

type LocationValue = {
  scope: LocationScope;
  country?: string;
  region?: string;
  city?: string;
};

export function AccountPreferencesButton({
  defaults,
}: {
  defaults: {
    phone?: string;
    gender: AccountGender;
    defaultLocation: LocationValue;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState(defaults.phone ?? "");
  const [gender, setGender] = useState<AccountGender>(defaults.gender);
  const [location, setLocation] = useState<LocationValue>(defaults.defaultLocation);

  function save() {
    startTransition(async () => {
      const result = await updateAccountPreferences({
        phone,
        gender,
        defaultLocation: location,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Account preferences saved.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-lg font-semibold">Account preferences</DialogTitle>
          <DialogDescription>
            These details are private and are never shown on your public profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="settings-phone">Phone number</Label>
            <Input
              id="settings-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Optional contact preference. It is not used for sign-in or verification.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-gender">Gender</Label>
            <select
              id="settings-gender"
              value={gender}
              onChange={(event) => setGender(event.target.value as AccountGender)}
              className="h-11 w-full rounded-[0.625rem] border border-input bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              {ACCOUNT_GENDERS.map((value) => (
                <option key={value} value={value}>
                  {ACCOUNT_GENDER_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Default sharing location</Label>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Used to prefill new problems. You can still change it for each post.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Default sharing location">
              {LOCATION_SCOPES.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  role="radio"
                  aria-checked={location.scope === scope}
                  onClick={() =>
                    setLocation((current) => ({
                      ...current,
                      scope,
                      ...(scope === "global" ? { country: "", region: "", city: "" } : {}),
                    }))
                  }
                  className={`h-10 rounded-lg border px-2 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 ${
                    location.scope === scope
                      ? "border-primary bg-brand-soft text-primary"
                      : "border-input text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
            {location.scope !== "global" ? (
              <div className="space-y-3 rounded-xl bg-sunken p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="settings-country">Country</Label>
                  <select
                    id="settings-country"
                    value={location.country ?? ""}
                    onChange={(event) => setLocation((current) => ({ ...current, country: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                  >
                    <option value="">Choose a country</option>
                    {COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
                  </select>
                </div>
                {location.scope === "city" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-city">City or region</Label>
                    <Input
                      id="settings-city"
                      value={location.city ?? ""}
                      onChange={(event) => setLocation((current) => ({ ...current, city: event.target.value }))}
                      placeholder="Bengaluru"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6">
          <DialogClose asChild><Button type="button" variant="ghost" disabled={pending}>Cancel</Button></DialogClose>
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? <><Loader2 className="animate-spin" /> Saving</> : "Save preferences"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteAccountButton({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();

  function removeAccount() {
    startTransition(async () => {
      const result = await deleteOwnAccount({ confirmation });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Your account has been deleted.");
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirmation(""); }}>
      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-2xl p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="gap-1">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-destructive"><Trash2 className="size-4" /> Delete account</DialogTitle>
          <DialogDescription>
            This permanently deletes <strong className="font-medium text-foreground">u/{username}</strong> and signs you out.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="rounded-xl bg-sunken p-3 text-xs leading-relaxed text-muted-foreground">
            Your problems, solutions, and comments will remain to preserve community discussions, but will be shown anonymously. Your private preferences, notifications, saved problems, and account access are removed.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delete-account-confirmation">Type DELETE to confirm</Label>
            <Input
              id="delete-account-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              aria-describedby="delete-account-help"
            />
            <p id="delete-account-help" className="text-xs text-muted-foreground">This cannot be undone.</p>
          </div>
        </div>
        <DialogFooter className="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6">
          <DialogClose asChild><Button type="button" variant="ghost" disabled={pending}>Cancel</Button></DialogClose>
          <Button type="button" variant="destructive" onClick={removeAccount} disabled={pending || confirmation !== "DELETE"}>
            {pending ? <><Loader2 className="animate-spin" /> Deleting</> : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

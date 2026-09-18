# Spec: Waitlist + Invite Growth Loop Upgrade

**Created**: 2026-09-17
**Updated**: 2026-09-17 (v2 — supersedes v1's invite design, see "What changed from v1" below)
**Status**: draft
**Author**: team
**Epic**: none

---

## What changed from v1

v1 of this spec (still visible in git history of this file) proposed a **shareable invite link that instantly creates an account**, alongside the existing targeted email invite (which also instantly creates an account today). After further discussion, the direction reversed: **no invite should bypass admin review.** Every path into the product — organic waitlist signup, targeted email invite, or shareable link — now lands in the same `WaitlistEntry` table, tagged with who invited them, and only admin approval creates a `User` account. This is a single funnel instead of two parallel ones. This version also adds pieces v1 didn't cover: the site-wide CTA/login funnel, waitlist notification emails, and a post-onboarding invite step.

## Problem

The site is invite-only, but access has grown organically around two disconnected, admin-heavy paths: a waitlist an admin must approve **one entry at a time**, and an invite system where accepting an invite **creates an account instantly with no review**, bypassing the waitlist entirely. This creates two problems: (1) the admin has no single place to see and control everyone trying to get in, since invited signups never show up in the waitlist view, and (2) processing the waitlist itself doesn't scale past a handful of clicks. Separately, unauthenticated visitors currently get funneled straight into a real Google OAuth attempt on every "Post a problem" style CTA, which only then fails and bounces them to the waitlist — there's no single, coherent entry point that explains "join the waitlist first, sign in once approved."

## Goal

Every route to access — organic waitlist signup, targeted email invite, or shareable invite link — funnels into one `WaitlistEntry` table that the admin reviews (individually, in a selected batch, or via "Approve all"). The primary site-wide CTA is "Post a problem"; clicking it while signed out lands on a single `/login` page that shows the waitlist form to first-time visitors and the Google sign-in button to people who've already joined (tracked client-side via `localStorage`, enforced server-side via the real waitlist-approval check that already exists). The admin gets notified by email the moment someone joins the waitlist, and approved users get an email telling them to sign in. After first sign-in, a short onboarding flow (username, date of birth, profile photo) ends with an invite-friends step showing their 5 invite credits as shareable slots.

## User Stories

1. As a **first-time visitor**, I click "Post a problem" (or any primary CTA), land on `/login`, fill in my name and email to join the waitlist, and get a clear "we received your request" confirmation — with no dead-end Google OAuth attempt in between.
2. As the **admin**, I get an email the moment someone joins the waitlist, and I can review requests individually, select a batch, or hit "Approve all" to release everyone pending at once.
3. As an **approved waitlist member**, I get an email telling me I'm in, with a link back to the site; when I click it and sign in with Google, I land straight in onboarding.
4. As a **new user finishing onboarding**, after picking a username, birthdate, and photo, I see my 5 invite credits as shareable cards — I can share a link or type a friend's email directly — and whoever uses either lands on the waitlist, tagged as invited by me.
5. As the **admin**, when I look at the waitlist, I can see which entries came from an invite (and by whom) versus organic signups, so I can prioritize who to approve first.

## Requirements

### Must-have — Entry funnel & CTA
- Every primary "interact" CTA across the site (Post a problem in the header, mobile menu, post-problem button, and any other sign-in trigger) points signed-out users to `/login?next=...` instead of directly to `/api/auth/google`.
- `/login` is a single page with two states, decided client-side by a `waitlist` flag in `localStorage`:
  - **No flag set** → show the waitlist join form (name + email) inline on `/login`. On successful submission, set `localStorage.waitlist = "true"` and show the existing "we received your request" confirmation.
  - **Flag set** → show the existing sign-in UI (Google button + passkey), i.e. restore the rich sign-in layout that already exists in `src/app/login/page.tsx` (currently commented out behind the invite-only pause) instead of the current hard `redirect()` to Google.
  - Always include a small affordance to switch views manually (e.g. "Already joined? Sign in" / "Haven't joined yet? Join the waitlist") in case `localStorage` is stale, cleared, or the person is on a new device.
  - `localStorage` is a **UX convenience only**. It never gates real access — the existing server-side check in `src/app/api/auth/callback/google/route.ts` (does an approved `WaitlistEntry` exist for this email, or does a `User` already exist) remains the sole authority and is unchanged.

### Must-have — Waitlist as the single funnel
- `WaitlistEntry` gains `invitedBy` (ref `User`) and `inviteId` (ref `Invite`), both nullable, set only when the entry originated from an invite.
- Targeted email invite (`/invite/{token}`, existing flow): redeeming it **no longer requires Google sign-in or creates a `User`.** It becomes a one-click "Join the waitlist" confirmation (name + email already known from the `Invite` document) that creates a tagged `WaitlistEntry` and marks the `Invite` as redeemed.
- Shareable invite link (`/join/{token}`, new): visiting it shows the waitlist join form (name + email, since the link doesn't know who's clicking) with the invite token carried through; submitting creates a tagged `WaitlistEntry` the same way and records the redemption against the link.
- Both invite paths consume one of the inviter's `inviteCredits` at the point the invited person actually submits into the waitlist (not merely when a targeted invite is sent — see Data Model for exactly when each type decrements).
- Account creation happens **only** through the existing `approveWaitlistEntry` (or its bulk variants) — there is no other path to a `User` record besides the admin/seed-admin bootstrap.

### Must-have — Admin waitlist controls
- Row checkboxes + "Approve selected" bulk action (reuses the existing per-entry approval logic for each id, chunked, per-item error handling, summarized result — not a silent partial success).
- A single "Approve all pending" action for full-batch release, with a confirmation step (it can affect many rows at once) and the same chunked/summarized execution as "Approve selected."
- The waitlist table shows, per row, whether the entry was invited and by whom (e.g. "Invited by @username" vs "Organic").

### Must-have — Emails
- New: on successful `joinWaitlist` (any origin — organic, targeted invite, or link), send a notification email to every address in `env.adminEmails`, containing the requester's name/email, whether it was invited (and by whom), and a link to `/admin/waitlist`. This is in addition to the existing user-facing confirmation email, which is unchanged.
- New: on `approveWaitlistEntry` (including inside the bulk/approve-all paths), send an approval email to the approved user with a CTA linking to `/login` (or directly `/login?next=/onboard`), telling them they can now sign in with Google. Sent once per entry; bulk paths send one email per approved entry, not a single digest.

### Must-have — Onboarding extension
- The existing onboarding form (`src/app/onboard`, `src/components/forms/onboarding-form.tsx`) gains a profile-photo section using the existing `AvatarPickerModal` component (already built for `/settings`) — optional, since every account already gets a sensible default photo (Google photo or a generated avatar) at provisioning time; this just lets the user change it during setup instead of only afterward in settings.
- After `completeOnboarding` succeeds, instead of redirecting straight to `next`, show an invite step on the same page: the user's `inviteCredits` (5 for a normal signup) rendered as that many card slots, each capable of producing a "Share link" action (the user's shareable `/join/{token}` link — generated lazily on first render of this step) and a way to send a targeted invite by typing a specific email (reuses the existing `sendInvite` action, now feeding the waitlist per the redesign above). This step is skippable ("Skip for now" continues to `next`) — it is not a hard gate.

### Nice-to-have
- "Approve oldest N" quick action as a shortcut to manual selection.
- Admin bulk email invite (paste/upload a list of emails, admin sends targeted invites to all of them in one action) — useful for the "seed the first 100 users" step. Reuses the same targeted-invite-creation logic, looped with chunked/per-item error handling; does not consume the admin's own `inviteCredits`.

### Out of scope
- Scheduled/cron-based automatic release (e.g. "release 20 per day"). Everything here is an explicit admin action.
- Changing how many credits a user starts with (stays 5, existing `inviteCredits` default logic on approval).
- A growth/analytics dashboard.
- Redesigning the waitlist IP rate limit already on `joinWaitlist`.
- Public-facing waitlist position/queue display.
- Passkey-based waitlist bypass — passkey sign-in on `/login` still only works for people who already have an account; it is not part of the waitlist-join state.

## Data Model

### `WaitlistEntry` — extend
```ts
export interface IWaitlistEntry {
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  invitedBy?: Types.ObjectId | null;   // NEW — the User who invited this person, if any
  inviteId?: Types.ObjectId | null;    // NEW — the Invite document redeemed to create this entry, if any
  confirmationSentAt?: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```
Both new fields are nullable and unrelated to the existing unique index on `email` — an invite redemption still goes through the same duplicate-handling path as `joinWaitlist` (see Edge Cases) when the email is already present.

### `Invite` — extend to support link-based invites, remove instant-provision semantics
```ts
export interface IInvite {
  type: "email" | "link";        // NEW — discriminates the two flows
  email?: string;                 // optional — only set for type: "email"
  name?: string;                  // optional — only set for type: "email"
  tokenHash: string;
  inviterId?: Types.ObjectId | null;
  redeemedWaitlistEntryIds: Types.ObjectId[]; // NEW — every WaitlistEntry created via this invite
  status: "pending" | "redeemed" | "revoked"; // "accepted" renamed to "redeemed" to reflect it feeds the waitlist, not an account; "revoked" is NEW for admin-disabled links
  createdAt: Date;
  updatedAt: Date;
}
```
Notes:
- `type: "email"`: one document per invitee (unchanged creation path via `sendInvite`). Redemption now means "the invitee clicked confirm and a `WaitlistEntry` was created," not "an account was created." `status` flips to `redeemed`; `redeemedWaitlistEntryIds` holds exactly one id.
- `type: "link"`: one document per inviter, created lazily. `status` stays `pending` (reusable) or is set to `revoked` by an admin; every redemption appends to `redeemedWaitlistEntryIds` instead of flipping status.
- `claimedBy`/`claimedAt` fields from the current schema are removed — they described "which User claimed this," a concept that no longer applies since invites don't create Users directly. (No migration concern: this is a fresh direction before any real invite volume exists in the invite-only period.)

### `User` — no schema change
`inviteCredits` behavior is unchanged: default 5 on approval, decremented by 1 per invite/redemption sent or used, checked before allowing another send/redemption.

## API Changes (Server Actions — this project uses Next.js server actions, not REST controllers)

- `joinWaitlist(raw, inviteToken?)` — `src/actions/waitlist.ts`. Extended to optionally accept an invite token (from either `/invite/{token}` one-click confirm or `/join/{token}` form submit). When present: validates the token (targeted or link, per the rules in Edge Cases), sets `invitedBy`/`inviteId` on the created entry, decrements the inviter's `inviteCredits` atomically, and appends to the `Invite`'s `redeemedWaitlistEntryIds`. Also now sends the new admin-notification email in addition to the existing user confirmation.
- `redeemTargetedInvite(token: string): Promise<ActionResult>` — `src/actions/invites.ts` (replaces `acceptInvite`). No `requireUser` — no sign-in needed. Looks up the pending `type: "email"` invite by `tokenHash`, calls the extended `joinWaitlist` internally with the invite's known name/email, marks the invite `redeemed`.
- `generateInviteLink(): Promise<ActionResult<{ url: string }>>` — `src/actions/invites.ts`. `requireUser`. Idempotent — returns the existing pending link invite for the user if one exists, otherwise creates one.
- `redeemInviteLink(token, raw): Promise<ActionResult>` — `src/actions/invites.ts`. No `requireUser`. Validates the link token is `type: "link", status: "pending"`, checks the inviter still has `inviteCredits > 0`, calls `joinWaitlist(raw, token)`.
- `approveWaitlistEntry` / new `bulkApproveWaitlistEntries` / new `approveAllPendingWaitlistEntries` — `src/actions/admin.ts`. All three funnel through the same single-entry provisioning core; bulk/all variants chunk (constant chunk size), catch per-item, and return a summary (`{ approved: number; failed: { id: string; reason: string }[] }`). Each successful approval now also sends the new approval email.
- `sendInvite` — `src/actions/invites.ts`. Unchanged trigger/validation/credit-decrement behavior; only its downstream effect changes (creates a redeemable `Invite`, not an instant account — already reflected in the `Invite` schema change above).

## UI Changes

- **`/login`** (`src/app/login/page.tsx`): un-comment/restore the existing rich sign-in layout as the base design. Wrap the two states (waitlist form vs. sign-in buttons) in a small client component (e.g. `src/components/auth/login-gate.tsx`) that reads `localStorage.waitlist` on mount and renders accordingly, with a manual toggle link. Reuses `WaitlistForm` (setting `localStorage.waitlist = "true"` in its success handler) and the existing `SignInButton`/`PasskeySignInButton`.
- **CTA call sites** (`src/components/navigation/site-header.tsx`, `src/components/navigation/mobile-menu.tsx`, `src/components/problems/post-problem-button.tsx`, `src/components/shared/sign-in-button.tsx`, `src/lib/auth/sign-in-redirect.ts`): change the signed-out target from `/api/auth/google?next=...` to `/login?next=...`.
- **`/invite/[token]`** (`src/app/invite/[token]/page.tsx`): simplified — no Google sign-in gate, no email-match check. Shows the invite's name and a single "Join the waitlist" confirm button (no form fields needed, name/email already known).
- **`/join/[token]`** (new, `src/app/join/[token]/page.tsx`): shows the waitlist join form (reuses `WaitlistForm`, extended to carry the token through to `redeemInviteLink`).
- **`/admin/waitlist`** (`src/app/admin/waitlist/page.tsx`): checkbox column + "select all," a bulk action bar ("Approve selected (N)"), and a separate "Approve all pending" button with a confirmation dialog. New "Invited by" column/badge per row.
- **`/onboard`** (`src/app/onboard/page.tsx`, `src/components/forms/onboarding-form.tsx`): add a photo section using `AvatarPickerModal`. After successful `completeOnboarding`, swap to an in-page "Invite your friends" step showing 5 card slots (share-link action + email-invite input), with "Skip for now" / "Done" both continuing to `next`.

## Edge Cases

1. **Someone redeems a targeted invite (`/invite/{token}`) for an email that's already on the waitlist** (e.g. they organically joined earlier, or a second invite targets the same email). `joinWaitlist`'s existing duplicate-key handling applies — return the friendly "already on the list" message; if the existing entry has no `invitedBy` yet, backfill it from this invite (attribution without breaking the no-duplicates guarantee), but never overwrite an existing `invitedBy`.
2. **The email is already `approved` when a new invite tries to redeem it.** Don't re-run provisioning or send a second approval email — return a distinct message ("You're already approved — sign in") instead of the generic "we received your request" one.
3. **Two people redeem the same shareable link concurrently when the inviter has exactly 1 credit left.** Atomic `$inc` with an `inviteCredits > 0` guard in the same update (per the project's atomic-balance-update pattern) — exactly one succeeds, the other gets "this invite link has run out of uses," `inviteCredits` never goes negative.
4. **A user tries to redeem their own shareable link, or a targeted invite addressed to themself.** Rejected with a clear `DomainError`, mirroring the existing "you can't invite your own email" check.
5. **Admin hits "Approve all pending" while new entries are still arriving.** The action should snapshot the set of pending ids at the moment it's invoked (not an unbounded live query it keeps re-reading), so it terminates predictably; entries that arrive after the snapshot are simply left for the next run.
6. **Admin revokes a link invite that already has redemptions.** Sets `status: "revoked"`, stops new redemptions immediately, does not retroactively affect `WaitlistEntry` rows or credits already granted from past redemptions.
7. **`localStorage.waitlist` is stale** — e.g. set to `"true"` on a device where the person never actually got approved, or cleared on a new device after they did join. Both are handled by the manual toggle link on `/login` and by the fact that the real gate is server-side; worst case the person sees the "wrong" default view for one click and switches it themselves.
8. **Bulk approve / approve-all encounters a `WaitlistEntry` deleted mid-batch** (e.g. an admin deleted it in another tab). Treated as a per-item failure with a clear reason ("no longer exists"), does not abort the rest of the batch.
9. **Onboarding invite step: user has fewer than 5 credits already** (e.g. they signed up via a targeted invite where a setting reduced starting credits, or an admin adjusted it). Render exactly `inviteCredits` slots, not a hardcoded 5.
10. **Approval email fails to send** (mail provider hiccup, same class of failure the existing waitlist-confirmation email already tolerates). Must not roll back or fail the approval itself — log and continue, same pattern as `joinWaitlist`'s existing confirmation-email try/catch.

## Testing Criteria

**Happy path:**
- Signed-out visitor clicks "Post a problem" → lands on `/login` → sees the waitlist form (no `localStorage` flag) → submits → sees confirmation, `localStorage.waitlist === "true"`, admin receives a notification email.
- Admin approves the entry → approval email sent to the user with a `/login` link → user clicks it, `/login` now shows the sign-in button (flag set) → signs in with Google → lands in `/onboard`.
- User completes username + DOB + photo → sees the invite step with 5 card slots → shares the link → a friend visits it, fills the waitlist form → friend's `WaitlistEntry` has `invitedBy` set to the user, admin sees "Invited by @username" on that row.
- Admin selects 20 pending entries → "Approve selected" → 20 approved, 20 approval emails sent, toast shows "20 of 20 approved."
- Admin hits "Approve all pending" with 50 remaining → all 50 approved in one confirmed action.

**Edge case tests:**
- Redeeming a targeted invite for an email already `pending` on the waitlist → no duplicate entry, `invitedBy` backfilled.
- Redeeming for an already-`approved` email → distinct "already approved" message, no duplicate approval email.
- Two concurrent link redemptions with 1 credit left → exactly one succeeds, credits end at 0 not negative.
- User redeems their own link → rejected, no state change.
- Bulk-approve a mix of pending + already-approved ids → already-approved ones counted as approved, not failed.
- Approve-all with a concurrently-arriving new entry → new entry untouched, present for the next run.
- Revoke a link with 3 existing redemptions → those 3 waitlist entries/credits unaffected, link stops accepting new ones.
- Onboarding invite step for a user with `inviteCredits: 3` → exactly 3 card slots rendered.

## Dependencies

- Existing `approveWaitlistEntry` provisioning core (`src/actions/admin.ts`) — all bulk/all-approve paths wrap it, none reimplement it.
- Existing `joinWaitlist` duplicate-handling and rate-limit logic (`src/actions/waitlist.ts`) — extended, not replaced, by the optional invite-token parameter.
- Existing `sendWaitlistConfirmation` / `sendInvitationEmail` services (`src/lib/services/email.ts`) — new admin-notification and approval emails follow the same service pattern (see, e.g., `env.adminEmails`, already used for the admin-login gate in the Google OAuth callback).
- Existing `AvatarPickerModal` (`src/components/forms/avatar-picker.tsx`) and its backing `updateAvatar` action (`src/actions/auth.ts`) — reused as-is in onboarding, not rebuilt.
- Existing `WaitlistForm` (`src/components/forms/waitlist-form.tsx`) — reused on `/login`, `/join/[token]`, and (unchanged) `/wait-list`.
- Existing Google OAuth callback waitlist gate (`src/app/api/auth/callback/google/route.ts`) — remains the sole server-side authority for who may sign in; unchanged by this spec.
- Project batch-processing convention (chunked, per-item try/catch, summarized result, no aborting the whole batch on one failure) — applied to `bulkApproveWaitlistEntries` and `approveAllPendingWaitlistEntries`.
- Project atomic-balance-update convention — applied to `inviteCredits` decrements on both invite types.

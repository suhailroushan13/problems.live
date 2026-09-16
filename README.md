# problems.live

**The internet's open list of problems worth solving.**

> Have a problem? Share it.
> Have the same problem? Validate it.
> Have a solution? Build it.

A public register of real problems. People post something that is genuinely
hard, other people say *"I have this too"* to validate it, discussion adds
context, and solutions get proposed, voted on, and eventually shipped.

Every screen answers three questions: **what is the problem**, **how many people
have it**, and **what can I do about it**.

---

## Table of contents

1. [Stack](#stack)
2. [Quick start](#quick-start)
3. [MongoDB setup](#mongodb-setup)
4. [Google OAuth setup](#google-oauth-setup)
5. [Environment variables](#environment-variables)
6. [Database seeding](#database-seeding)
7. [Admin configuration](#admin-configuration)
8. [Production deployment](#production-deployment)
9. [Architecture](#architecture)
10. [How the core systems work](#how-the-core-systems-work)
11. [Scripts](#scripts)
12. [Contributing](#contributing)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Language | TypeScript, strict |
| Database | MongoDB via Mongoose 9 |
| Styling | Tailwind CSS v4, token-driven design system |
| Components | shadcn/ui (Radix primitives) + Lucide icons |
| Validation | Zod 4, shared by client forms and Server Actions |
| Forms | React Hook Form |
| Auth | Google OAuth 2.0 + PKCE, HTTP-only JWT session cookie (`jose`) |

No auth framework, no state library, no date library, no ORM beyond Mongoose.
Mutations are Server Actions; only search and image upload are Route Handlers,
because they are called from the client outside a form submission.

---

## Quick start

```bash
git clone https://github.com/suhailroushan13/problems.live.git
cd problems.live

npm install
cp .env.example .env.local      # then fill it in — see below

npm run seed                    # optional: realistic demo content
npm run dev                     # http://localhost:3000
```

Requires **Node 20.9+** (Node 22 recommended).

Want to contribute a change back? See [CONTRIBUTING.md](CONTRIBUTING.md) —
short version: fork, branch, PR.

---

## MongoDB setup

Any MongoDB 6+ instance works. Nothing requires replica sets or transactions —
concurrency safety comes from unique indexes and atomic `$inc` operators, so a
single standalone `mongod` is fine.

### Option A — MongoDB Atlas (recommended)

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. **Database Access** → add a user with *Read and write to any database*.
3. **Network Access** → add your current IP (and `0.0.0.0/0` only if you
   understand the exposure). Forgetting this is the usual cause of
   `Operation ... buffering timed out after 10000ms`.
4. Copy the connection string into `MONGODB_URI`.

### Option B — local

```bash
brew install mongodb-community     # macOS
brew services start mongodb-community
# MONGODB_URI=mongodb://127.0.0.1:27017
```

### Option C — Docker

```bash
docker run -d -p 27017:27017 --name problems-live-db mongo:7
```

### Indexes

Every query the app runs is index-backed. Indexes are created by
`npm run seed` and by `npm run db:indexes`; in production the app never builds
indexes at request time (`autoIndex` is off outside development).

```bash
npm run db:indexes    # run after any deploy that changes a schema index
```

---

## Google OAuth setup

problems.live has no passwords. Every account is a verified Google identity.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and
   create (or pick) a project.
2. **APIs & Services → OAuth consent screen**
   - User type: *External*
   - Fill in app name, support email, developer email
   - Scopes: `openid`, `email`, `profile` — nothing more is requested
   - While the app is in *Testing*, add your own Google account under
     **Test users**, or sign-in will be refused
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: *Web application*
   - **Authorised JavaScript origins**
     - `http://localhost:3000`
     - `https://problems.live` (your production origin)
   - **Authorised redirect URIs** — these must match exactly:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://problems.live/api/auth/callback/google`
4. Copy the client ID and client secret into `.env.local`.

> The redirect URI is derived from `NEXT_PUBLIC_APP_URL`. If you run the dev
> server on a port other than 3000, update that variable **and** add the
> matching redirect URI in Google Cloud, or the callback will be rejected.

### How the flow works

```
/api/auth/google            → generates state + PKCE verifier in short-lived
                              HTTP-only cookies, redirects to Google
/api/auth/callback/google   → verifies state (constant-time), exchanges the
                              code, verifies the ID token signature against
                              Google's JWKS, then upserts the user and issues
                              the session cookie
```

The session is a 30-day HS256 JWT in an HTTP-only, SameSite=Lax cookie whose
only claim is the user id. Role, reputation, credits and suspension are read
from the database on every request — never from the token.

---

## Environment variables

Copy `.env.example` to `.env.local`. Everything in `.env.local` is git-ignored.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string |
| `MONGODB_DB` | no | Database name (default `problems_live`) |
| `GOOGLE_CLIENT_ID` | yes | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | yes | OAuth client secret — server-only |
| `AUTH_SECRET` | yes | Session signing key, `openssl rand -base64 48` |
| `NEXT_PUBLIC_APP_URL` | yes | Public origin, no trailing slash |
| `ADMIN_EMAILS` | no | Comma-separated emails auto-promoted to admin |
| `IMAGE_PROVIDER` | no | `local` (default), `vercel-blob`, `cloudinary` |
| `BLOB_READ_WRITE_TOKEN` | if blob | Vercel Blob token |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | if cloudinary | Cloudinary credentials |
| `MODERATION_PROVIDER` | no | `rules` (default) |

Secrets are read through `src/lib/env.ts`, which imports `server-only` — a
client component that reaches for them fails the build rather than leaking them.

---

## Database seeding

```bash
npm run seed
```

**This deletes every document in the target database first.** Point
`MONGODB_URI`/`MONGODB_DB` at a development database before running it.

It creates 12 users, 17 categories (one pending approval so the admin queue is
not empty), 24 problems, 26 solutions, threaded comments, real validation and
vote rows, notifications, and one open report. The content is deliberately
realistic — lorem ipsum makes it impossible to judge whether the product reads
well.

Seeded accounts are placeholders with no Google identity; you cannot log in as
them. Sign in with your own Google account and set `ADMIN_EMAILS` to get admin
access.

---

## Admin configuration

Add your email to `ADMIN_EMAILS` and sign in — the role is applied on sign-in.

```bash
ADMIN_EMAILS=you@example.com,cofounder@example.com
```

To promote someone afterwards, use **/admin/users → Make admin**, or directly:

```js
db.users.updateOne({ username: "alex" }, { $set: { role: "admin" } })
```

| Role | Can do |
|---|---|
| `user` | Post, vote, comment, solve, report |
| `moderator` | Everything above, plus the moderation queue, reports, content removal and problem status |
| `admin` | Everything, plus users, roles, suspensions, categories and platform settings |

`/admin` is gated three ways: the proxy blocks unauthenticated requests, the
layout redirects non-moderators, and every admin Server Action re-checks the
role independently.

### Tunable settings

`/admin/settings` edits values at runtime with no deploy — starting credits,
validations needed to earn a credit back, moderation hold/reject thresholds,
duplicate-similarity threshold, and every rate limit. Defaults live in
`src/lib/config/settings.ts`; database overrides win, with a 60-second cache.

---

## Production deployment

### Vercel

1. Import the repository.
2. Add every variable from `.env.example` in **Settings → Environment Variables**.
3. Set `NEXT_PUBLIC_APP_URL` to the production origin and add the matching
   redirect URI in Google Cloud.
4. Set `IMAGE_PROVIDER=vercel-blob` and add `BLOB_READ_WRITE_TOKEN` — the
   `local` provider writes to disk, and serverless filesystems are ephemeral.
5. Allow Vercel's egress in the Atlas access list.
6. Deploy, then run `npm run db:indexes` once against production.

### Docker / any Node host

```bash
npm ci
npm run build
npm run start          # defaults to port 3000
```

### Pre-launch checklist

- [ ] `AUTH_SECRET` is a fresh 48-byte random value, different from development
- [ ] `NEXT_PUBLIC_APP_URL` matches the deployed origin exactly
- [ ] Google redirect URI registered for that origin
- [ ] `IMAGE_PROVIDER` is not `local`
- [ ] `npm run db:indexes` has run against the production database
- [ ] `ADMIN_EMAILS` set, and you have signed in once to claim admin
- [ ] Atlas network access allows the production egress IPs

---

## Design system

The interface is warm, rounded and friendly rather than dashboard-like. The
rules it follows are encoded in `src/app/globals.css`:

- **One type family.** Plus Jakarta Sans carries everything; the weight range
  (400–800) does the work a second family would otherwise be needed for.
- **One accent.** A muted coral marks the primary action, the selected filter,
  the validation counts and status — never decoration. It is dark enough to
  carry white text at 4.5:1.
- **Tints, not borders.** List rows sit on a soft warm tint that deepens for
  the top-ranked entry. Almost nothing in the product is a bordered card.
- **Rounded throughout.** Controls are fully rounded pills; surfaces use a
  24–28px radius.
- **Restrained icons.** One category mark per row, and icons only where they
  aid recognition.

Accessibility is part of the system, not an afterthought: muted body text sits
at 5.8:1 against the page and 5.0:1 on the row tint, headings at 18.4:1, accent
buttons at 5.1:1, every control clears the WCAG 2.5.8 target size, focus rings
are visible on every surface, and status is never communicated by colour alone.

---

## Architecture

```
src/
  app/
    (routes)/            problems, categories, solutions, leaderboard, u/[username]
    admin/               moderation queue, reports, users, categories, settings
    api/                 auth handlers, search, upload
    sitemap.ts robots.ts manifest.ts
  proxy.ts               307s unauthenticated requests away from private routes

  actions/               Server Actions — the only write paths
  lib/
    auth/                session, Google OAuth, current user, provisioning
    data/                read queries + DTO serialisation
    db/                  connection cache, polymorphic content access
    moderation/          moderationService + providers
    image/               imageService + providers
    similarity/          duplicate detection + providers
    rate-limit/          durable fixed-window limiter
    config/              runtime settings
    validation/          Zod schemas shared by forms and actions
  models/                Mongoose schemas and indexes
  components/            ui/ (shadcn) + problems/ solutions/ comments/ navigation/
  types/                 serialisable DTOs crossing the server→client boundary
```

**The rule:** components render, `lib/data` reads, `actions` write. Business
logic never lives in a component, and a Mongoose document never crosses into a
Client Component — `lib/data/serialize.ts` converts to plain DTOs, which is also
where anonymity is enforced.

Server Components are the default. Client Components exist only where there is
real interaction: voting, forms, dialogs, the command palette.

---

## How the core systems work

### Validation ("I have this too")

One vote per person is enforced by a **unique compound index** on
`(problemId, userId)`, not by application logic. The action attempts the insert
and lets the database reject a duplicate, then moves the counter with an atomic
`$inc`. The UI updates optimistically and is then **replaced** by the count the
server actually persisted — a tampered client cannot inflate anything.

### Trending

Problems store a Reddit-style logarithmic `hotScore` that is monotonic in time,
so it only needs recomputing when the underlying counts change. No cron job, no
drift, and every feed sort is index-backed.

### Moderation

Everything user-generated passes `moderateContent()` before it is public.
The default provider is context-aware rather than a banned-word list: matches
are severity-weighted, escalated on repetition, discounted by author trust
(never for slurs, threats or sexual content), and combined with structural
signals — link density, shouting, repetition, contact harvesting, substance.
It scores 0–1; the operator-tuned hold and reject thresholds decide the outcome.

Swapping in a hosted classifier means adding one file under
`src/lib/moderation/providers/` and one case in the factory. Callers only ever
see `{ action, score, labels }`.

### Reporting

Reports never delete anything. They accumulate — one per user per target,
enforced by a unique index — and once they cross a configurable threshold the
item is hidden **pending review**. A human always makes the final call.

### Duplicate detection

While the author types a title, MongoDB's text index does a cheap recall pass
and the candidates are re-ranked locally with token overlap plus character
trigrams. Anything over the threshold is shown as advice, never a block —
`SimilarityProvider` is a seam, so embedding-based detection can be dropped in
later without touching the create flow.

### Anti-spam

New accounts get problem credits. Posting spends one; a problem that attracts
real validation earns one back; a moderator removal refunds it. Reputation
comes from other people finding your work useful, and unlocks capabilities like
suggesting categories. Commenting is never gated behind posting.

### Rate limiting

Durable fixed-window counters in MongoDB with a TTL index, so limits survive
restarts and hold across serverless instances. One atomic upsert per check.
Every limit is editable in `/admin/settings`.

### Anonymity

`isAnonymous` posts keep the author id internally — moderators can still act,
and the author keeps ownership — but `serialize.ts` drops the author object
entirely before anything reaches a component, and profiles exclude anonymous
content. Identity cannot leak through a forgotten prop.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | **Wipes** and reseeds the target database |
| `npm run db:indexes` | Create/update every schema index |

---

## Contributing

This project is open source and takes pull requests. The short version:
fork the repo, branch off `master`, make your change, and open a PR back
against `master`.

Full workflow, branch naming, and commit conventions live in
[CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licence

MIT — see [LICENSE](LICENSE).

# problems.live

**A public directory of real problems worth solving.**

problems.live gives people a simple way to share a problem, show that they
experience it too, discuss the context, and propose practical solutions. It is
designed to turn isolated frustrations into visible, actionable opportunities.

## What it does

- Publish problems by category and location, with optional anonymous posting.
- Validate problems with an “I have this too” signal.
- Discuss problems, propose solutions, and vote on useful contributions.
- Surface active work through trending and category views.
- Keep quality high with moderation, reporting, rate limits, and duplicate
  detection.
- Use invite-only accounts while the community grows deliberately.

## How access works

The directory is public to browse. Creating an account requires an invitation:

1. An admin can send an email invitation or create a single-use invite link.
2. A person accepts the invite and signs in with the invited Google account.
3. New members receive five invites to share. Admin accounts have unlimited
   invites.

People without an invitation can join the waiting list at `/wait-list`. Admins
review requests from `/admin/waiting-list` and can send an invitation directly.
The waiting-list form requires Cloudflare Turnstile completion in the browser
and verifies its token again on the server.

## Tech stack

| Area | Technology |
| --- | --- |
| Application | Next.js 16 App Router and React 19 |
| Language | TypeScript with strict mode |
| Database | MongoDB with Mongoose |
| Authentication | Google OAuth 2.0 with PKCE and HTTP-only sessions |
| UI | Tailwind CSS v4, shadcn/ui, Radix, Lucide |
| Validation | Zod and Server Actions |
| Bot protection | Cloudflare Turnstile |

## Quick start

### Prerequisites

- Node.js 20.9 or newer
- MongoDB 6 or newer, locally or through MongoDB Atlas
- A Google OAuth web client
- A Cloudflare Turnstile widget for the waiting list

### Run locally

```bash
git clone git@github.com:suhailroushan13/problems.live.git
cd problems.live
touch .env.local
```

Paste the following into `.env.local`, then replace every `<...>` placeholder
with credentials from your own local-development accounts. Do not use, share,
or commit production credentials.

```dotenv
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net
MONGODB_DB=problems_live
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
AUTH_SECRET=<generate-with-openssl-rand--base64-48>
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAILS=<your-admin-email@example.com>
IMAGE_PROVIDER=local
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
MODERATION_PROVIDER=rules
SMTP_USER=<smtp-username>
SMTP_PASSWORD=<smtp-password-or-app-password>
LEGAL_MAILING_ADDRESS=<legal-entity's-physical-mailing-address>
```

Then install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the standard checks before opening a pull request:

```bash
npm run typecheck
npm run lint
npm run build
```

## Configuration

Copy `.env.example` to `.env.local`. Never commit `.env.local` or production
secrets.

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `MONGODB_DB` | No | Database name; defaults to `problems_live` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `AUTH_SECRET` | Yes | Session-signing secret; generate with `openssl rand -base64 48` |
| `TURNSTILE_SECRET_KEY` | Yes | Secret paired with the public waiting-list Turnstile site key |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical application URL, without a trailing slash |
| `ADMIN_EMAILS` | No | Comma-separated emails promoted to admin on sign-in |
| `SMTP_USER` / `SMTP_PASSWORD` | For email invites | SMTP credentials for invitation emails |
| `LEGAL_MAILING_ADDRESS` | For email invites | Physical mailing address shown in the invitation-email footer |
| `IMAGE_PROVIDER` | No | `local` (development), `vercel-blob`, or `cloudinary` |
| `BLOB_READ_WRITE_TOKEN` | For Vercel Blob | Blob storage token |
| `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET` | For Cloudinary | Cloudinary credentials |
| `MODERATION_PROVIDER` | No | Defaults to the built-in `rules` provider |

### Google OAuth

Create a Web application client in the Google Cloud Console and register these
redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://your-domain.example/api/auth/callback/google
```

The production URI must match `NEXT_PUBLIC_APP_URL` exactly.

### Cloudflare Turnstile

Create a Turnstile widget for your local and production domains. Keep its
**secret key** in `TURNSTILE_SECRET_KEY`; do not expose it through a
`NEXT_PUBLIC_` variable. The public site key is intentionally embedded in the
application for the `/wait-list` widget. Both keys must belong to the same
Cloudflare widget.

## Database operations

### Indexes

Create or update database indexes after schema-index changes:

```bash
npm run db:indexes
```

### Demo data

```bash
npm run seed
```

> Warning: `npm run seed` deletes documents from the configured database before
> recreating demo data. Use a dedicated development database only.

Seeded users are demonstration records and cannot authenticate with Google.
Add your own email to `ADMIN_EMAILS`, then sign in to obtain admin access.

## Project structure

```text
src/
├── app/             Routes, pages, API handlers, and admin screens
├── actions/         Server Actions for every mutation
├── components/      Product components and shared UI primitives
├── lib/
│   ├── auth/        Google OAuth, sessions, and invite access checks
│   ├── data/        Queries and DTO serialization
│   ├── db/          MongoDB connection management
│   ├── moderation/  Content moderation providers
│   ├── rate-limit/  Durable MongoDB-backed rate limiting
│   └── validation/  Shared Zod schemas
├── models/          Mongoose schemas and indexes
└── types/           Serializable application types
```

The application follows a deliberately narrow data boundary: components render,
`lib/data` reads, and Server Actions write. Mongoose documents stay on the
server and are serialized into plain DTOs before they reach client components.

## Core product safeguards

- **One validation per user:** a database unique index prevents duplicate “I
  have this too” signals.
- **Moderation before publication:** user-generated content is evaluated before
  it becomes public.
- **Human review:** reports can hide content for review, but do not permanently
  remove it automatically.
- **Rate limits:** fixed-window counters in MongoDB survive restarts and work
  across instances.
- **Duplicate suggestions:** likely matching problems are shown while authors
  write; they are guidance, not a publishing block.
- **Privacy by design:** anonymous posts retain internal ownership for
  moderation, while public DTOs omit the author identity.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run seed` | Reset and seed the configured database |
| `npm run db:indexes` | Synchronize schema indexes |
| `npm run demo` | Run the project demo script |

## Deployment

The project is ready for Vercel or any Node.js host that supports Next.js.

For Vercel:

1. Import the repository.
2. Add the required environment variables for Production and Preview.
3. Register the deployed Google OAuth callback URL.
4. Add the matching `TURNSTILE_SECRET_KEY` for each environment.
5. Use Vercel Blob or Cloudinary for uploads; `local` storage is only suitable
   for development because serverless filesystems are ephemeral.
6. Allow the deployment to connect to your MongoDB instance.
7. Run `npm run db:indexes` against the production database after deploying
   index changes.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for
the development workflow, branch naming, review expectations, and code style.

## License

[MIT](LICENSE)

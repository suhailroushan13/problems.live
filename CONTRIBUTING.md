# Contributing to problems.live

Thanks for wanting to help. This is a small, single-maintainer open source
project — every contribution gets read by a real person, so a clear PR that
does one thing well will always beat a big one that does five.

This doc covers the actual mechanics of getting a change from your machine
into the project. For local setup (MongoDB, Google OAuth, environment
variables), see the [README](README.md) — this file assumes you've already
got the app running.

---

## Before you start

- **Small fix or obvious bug?** Just open a PR — no need to ask first.
- **New feature, redesign, or anything that touches a lot of files?** Open an
  issue first and describe what you want to do. This avoids two people
  building the same thing, or you spending a weekend on something that
  doesn't fit the project's direction.
- **Found a security issue?** Please don't open a public issue — email the
  maintainer directly instead.

---

## The contribution workflow

This project uses the standard GitHub **fork → branch → pull request** flow.
You won't have push access to the main repo, and that's normal — everyone
external contributes this way.

### 1. Fork the repo

Click **Fork** at the top of
[github.com/suhailroushan13/problems.live](https://github.com/suhailroushan13/problems.live).
This creates a copy of the repo under your own GitHub account.

### 2. Clone your fork

```bash
git clone https://github.com/<your-username>/problems.live.git
cd problems.live
```

### 3. Add the original repo as a remote (once)

This lets you pull in the latest changes later without re-cloning.

```bash
git remote add upstream https://github.com/suhailroushan13/problems.live.git
```

### 4. Install and set up your local environment

```bash
npm install
cp .env.example .env.local      # fill it in — see the README
npm run dev                     # http://localhost:3000
```

### 5. Create a new branch

Never commit to `master` directly — always branch off it first.

```bash
git checkout master
git pull upstream master        # make sure you're starting from the latest code
git checkout -b fix/comment-vote-not-persisting
```

Branch naming — `<type>/<short-description>`, all lowercase, hyphens between
words:

| Type | Use for |
|---|---|
| `feature/…` | New functionality |
| `fix/…` | Bug fixes |
| `docs/…` | README, comments, this file |
| `refactor/…` | Code change with no behavior change |
| `chore/…` | Tooling, deps, config |

### 6. Make your change

- Keep the PR focused — one fix or one feature, not a grab-bag.
- Follow the patterns already in the file you're touching (this codebase is
  consistent about layering, naming, and styling — match what's around you
  rather than introducing a new pattern).
- No test suite exists yet, so **run the app and actually click through the
  change** before you consider it done. For anything visual, a before/after
  screenshot in the PR description goes a long way.

Before committing, both of these must pass:

```bash
npm run lint
npm run typecheck
```

### 7. Commit

Write commit messages that explain *why*, not just *what*:

```bash
git add src/components/comments/comment-vote.tsx
git commit -m "fix: comment vote score resets when collapsing a thread"
```

`type: short summary` (feat / fix / docs / refactor / chore) is preferred but
not strictly enforced — clarity matters more than the prefix.

### 8. Push to your fork

```bash
git push origin fix/comment-vote-not-persisting
```

### 9. Open the pull request

GitHub will show a **"Compare & pull request"** button on your fork right
after you push — use it, or open one manually against
`suhailroushan13/problems.live:master`.

In the PR description:

- **What** changed and **why** (link the issue if there is one).
- **How you tested it** — steps you took, or a screenshot/recording for UI
  changes.
- Anything you're unsure about or deliberately left out of scope.

### 10. Review

The maintainer will review, may ask for changes, and merges once it's ready.
Push more commits to the same branch to address feedback — no need to open a
new PR. Once merged, you can delete your branch.

---

## Keeping your fork up to date

Do this periodically, and always before starting a new branch:

```bash
git checkout master
git pull upstream master
git push origin master
```

If your feature branch falls behind while you're working on it:

```bash
git checkout fix/comment-vote-not-persisting
git rebase master
```

---

## Code style

- TypeScript, strict mode — don't add `any` to work around a type error, fix
  the type.
- Follow the layered architecture already in place (Server Components fetch
  data, Server Actions mutate it, client components stay thin). Look at a
  neighboring file before inventing a new pattern.
- Tailwind for styling — use the existing design tokens (`text-muted-foreground`,
  `border-hairline`, etc.) instead of raw colors.
- No comments that just restate the code. A comment should explain something
  non-obvious — a constraint, a workaround, a "why," not a "what."

## Code of conduct

Be respectful, assume good faith, and keep feedback about the code, not the
person. Anything else — harassment, personal attacks, spam — gets your
comments removed and, if it continues, you blocked from the repo.

---

Questions about any of this? Open an issue and ask — this doc will get
better as more people actually use it.

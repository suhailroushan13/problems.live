import { env, APP_NAME } from "@/lib/env";

/**
 * llms.txt (llmstxt.org) — a plain-text map of the site for language models,
 * the same job robots.txt/sitemap.xml do for crawlers and search engines.
 * Static and cheap: no DB round trip, just the site's shape.
 */
export function GET() {
  const base = env.appUrl;

  const body = `# ${APP_NAME}

> A public directory of problems worth solving, written by the people who
> have them. Post a problem, others validate it with "I have this too,"
> people discuss it, and solutions get proposed, voted on, and shipped.

## Core pages

- [Problems directory](${base}/problems): Every open problem, filterable by category, status, and location.
- [Categories](${base}/categories): The topic taxonomy problems are organised under.
- [Solutions](${base}/solutions): Proposed and shipped solutions across all problems.
- [Leaderboard](${base}/leaderboard): Top contributors by Score (reputation).

## How it works

- A problem is a real, specific difficulty someone has, not a feature request or a solution in disguise.
- Validation ("I have this too") is the one upvote-equivalent signal; it is how demand for a problem is measured.
- Solutions are proposed underneath a problem, discussed, and can be marked accepted once it ships.
- Comments carry threaded discussion on both problems and solutions.

## Policies

- [Community guidelines](${base}/guidelines)
- [Terms & conditions](${base}/terms)
- [Privacy policy](${base}/privacy)

## Source

- [GitHub repository](https://github.com/suhailroushan13/problems.live): Open source, MIT licensed, takes pull requests.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

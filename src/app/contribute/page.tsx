import type { Metadata } from "next";
import { ArrowUpRight, Code2, GitFork, GitPullRequest, HeartHandshake, ShieldCheck, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { GithubIcon } from "@/components/shared/social-icons";

const REPOSITORY_URL = "https://github.com/suhailroushan13/problems.live";
const CONTRIBUTING_URL = `${REPOSITORY_URL}?tab=contributing-ov-file`;
const SSH_CLONE_URL = "git@github.com:suhailroushan13/problems.live.git";

export const metadata: Metadata = {
  title: "Contribute",
  description: "problems.live is open source. Help improve the open directory of problems worth solving.",
  alternates: { canonical: "/contribute" },
};

const STEPS = [
  {
    icon: GitFork,
    title: "Fork the repository",
    body: "For a small fix or an obvious bug, open a pull request directly. For a larger feature or redesign, start with an issue so the work has a shared direction.",
  },
  {
    icon: Code2,
    title: "Make one focused change",
    body: "Create a branch, keep the scope clear, follow the existing patterns, and test the experience before committing.",
  },
  {
    icon: GitPullRequest,
    title: "Open a pull request",
    body: "Explain what changed, why it matters, and how you tested it. A focused contribution is easier to review and more likely to ship quickly.",
  },
];

export default function ContributePage() {
  return (
    <div className="page py-12 sm:py-16">
      <header className="grid max-w-4xl gap-8 border-b border-hairline pb-10 md:grid-cols-[minmax(0,1fr)_20rem] md:items-end">
        <div>
          <p className="label text-brand">Open source</p>
          <h1 className="mt-3 text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
            Help build problems.live
          </h1>
          <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base">
            This project is open for everyone. If you care about making real problems easier to find, understand, and solve, you are welcome to continue building it with us.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ShimmerButton
              asChild
              background="var(--brand)"
              borderRadius="var(--radius-md)"
              className="h-10 gap-2 px-4 text-[0.8125rem] font-semibold"
            >
              <a href={CONTRIBUTING_URL} target="_blank" rel="noreferrer">
                <GithubIcon className="size-4" /> Contribution guide <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </ShimmerButton>
            <Button asChild size="lg" variant="outline">
              <a href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noreferrer">Browse issues</a>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-sunken p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Terminal className="size-4 text-brand" aria-hidden="true" /> Clone with SSH
          </div>
          <code className="mt-4 block overflow-x-auto rounded-md bg-background px-3 py-2.5 text-xs leading-relaxed text-foreground">git clone {SSH_CLONE_URL}</code>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            View repository <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        </div>
      </header>

      <section className="mt-14 max-w-4xl border-t border-hairline pt-8">
        <p className="label text-muted-foreground">How to contribute</p>
        <div className="mt-6 grid gap-7 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, index) => (
            <article key={step.title}>
              <span className="num text-xs font-semibold text-brand">{String(index + 1).padStart(2, "0")}</span>
              <step.icon className="mt-3 size-5 text-foreground" aria-hidden="true" />
              <h2 className="mt-3 text-base font-semibold text-foreground">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 grid max-w-4xl gap-10 border-t border-hairline pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="label text-muted-foreground">Quick start</p>
          <h2 className="mt-3 text-xl font-bold tracking-[-0.02em] text-foreground">Run it locally</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Fork the project, clone your fork, then follow the local environment instructions in the README.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-lg border border-hairline bg-sunken p-4 text-sm leading-relaxed text-foreground"><code>{`git clone ${SSH_CLONE_URL}
cd problems.live
npm install
cp .env.example .env.local
npm run dev`}</code></pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Before opening a pull request, run <code className="rounded bg-sunken px-1 py-0.5">npm run lint</code> and <code className="rounded bg-sunken px-1 py-0.5">npm run typecheck</code>.
          </p>
        </div>

        <div>
          <p className="label text-muted-foreground">Code of conduct</p>
          <ShieldCheck className="mt-3 size-5 text-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold tracking-[-0.02em] text-foreground">Be thoughtful and respectful</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Assume good faith, keep feedback about the work rather than the person, and make room for people with different experiences. Harassment, personal attacks, spam, and discriminatory behavior are not welcome.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            By participating, you agree to follow this standard in issues, pull requests, reviews, and community discussion. Maintainers may remove content or block contributors who repeatedly ignore it.
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-medium text-foreground">
            <HeartHandshake className="size-4 text-brand" aria-hidden="true" />
            Build with care.
          </div>
        </div>
      </section>

      <section className="mt-14 border-t border-hairline pt-8">
        <h2 className="text-xl font-bold tracking-[-0.02em] text-foreground">Ready to help?</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Pick an issue, improve a rough edge, write documentation, test a flow, or bring a thoughtful idea. Every useful contribution helps make the directory better.
        </p>
        <Button asChild className="mt-5 gap-2">
          <a href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noreferrer">
            Find something to work on <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </Button>
      </section>
    </div>
  );
}

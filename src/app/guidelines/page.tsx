import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Community guidelines",
  description:"What belongs on problems.live, what does not, and how moderation works.",
  alternates: { canonical: "/guidelines" },
};

const SECTIONS = [
  {
    title: "Post problems, not pitches",
    body: "A good entry describes something that is genuinely hard — who it affects, when it happens, and why it is still unsolved. If your post is mostly about a product you want people to buy, it belongs in Solutions, or nowhere.",
  },
  {
    title: "Validate honestly",
    body: "“I have this problem” means you actually have it. The count is the most valuable number on this site, and it only stays valuable if people are honest. One vote per person, and you can take it back any time.",
  },
  {
    title: "Check before you post",
    body: "We show you similar problems while you type. Adding your voice to an existing entry is almost always worth more than starting a near-duplicate — a problem with 2,000 validations gets solved; the same problem split across ten posts does not.",
  },
  {
    title: "Disagree with the idea, not the person",
    body: "Criticise approaches, assumptions and evidence freely. Attacks on people, harassment, hate speech and threats get removed and can cost you your account.",
  },
  {
    title: "Keep private things private",
    body: "Do not post anyone's address, phone number, ID numbers, or anything else that identifies a private individual — including your own. Anonymous posting exists precisely so you can describe a sensitive problem safely.",
  },
  {
    title: "No spam, no scams",
    body: "Affiliate dumps, engagement bait, crypto “opportunities”, paid-service touting and link farms are removed on sight. Linking to something you built is fine — as long as it genuinely answers the problem.",
  },
];

export default function GuidelinesPage() {
  return (
    <div className="page max-w-2xl py-12 sm:py-16">
      <header className="mb-12">
        <h1 className="text-[2rem] font-extrabold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Community guidelines
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
          problems.live works because the list is trustworthy. Six rules keep it
          that way.
        </p>
      </header>

      <div className="space-y-8">
        {SECTIONS.map((section, index) => (
          <section key={section.title} className="border-t border-hairline pt-8 first:border-t-0 first:pt-0">
            <p className="num mb-2 text-[0.8125rem] text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="text-[1.0625rem] font-bold tracking-[-0.015em] text-foreground">
              {section.title}
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <section className="mt-10 border-t border-hairline pt-8">
        <h2 className="text-[1.0625rem] font-bold tracking-[-0.015em] text-foreground">
          How moderation works
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Everything you post is checked automatically before it goes public.
          Most posts pass instantly. Borderline ones are held for a human, and a
          small number are rejected outright. Reports from other people never
          remove content on their own — they queue it for review.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link href="/problems/new">Share a problem</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/problems">Explore problems</Link>
        </Button>
      </div>
    </div>
  );
}

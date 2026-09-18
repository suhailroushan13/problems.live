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
    title: "Keep the platform safe",
    body: "Do not post, request, promote, celebrate or threaten violence, self-harm, exploitation, terrorism, weapons misuse, or illegal activity. Content that creates a credible risk of harm may be removed immediately and, where appropriate, referred to the relevant authorities.",
  },
  {
    title: "No hateful, abusive or sexual content",
    body: "We do not allow hate speech, slurs, harassment, bullying, threats, sexual content, nudity, sexually exploitative material, or language intended to humiliate or intimidate a person or group. Disagreement is welcome; attacking people is not.",
  },
  {
    title: "Images must be safe and relevant",
    body: "Only upload images that help explain the problem. Do not upload graphic violence, sexual or nude imagery, hateful symbols, disturbing material, deceptive edits, or images of people who have not agreed to be shown. We may remove any image that is unsafe, unrelated or inappropriate for a public community.",
  },
  {
    title: "Post problems, not pitches",
    body: "A good entry describes something that is genuinely hard, who it affects, when it happens, and why it is still unsolved. If your post is mostly about a product you want people to buy, it belongs in Solutions, or nowhere.",
  },
  {
    title: "Validate honestly",
    body: "“I have this problem” means you actually have it. The count is the most valuable number on this site, and it only stays valuable if people are honest. One vote per person, and you can take it back any time.",
  },
  {
    title: "Check before you post",
    body: "We show you similar problems while you type. Adding your voice to an existing entry is almost always worth more than starting a near-duplicate, a problem with 2,000 validations gets solved; the same problem split across ten posts does not.",
  },
  {
    title: "Disagree with the idea, not the person",
    body: "Criticise approaches, assumptions and evidence freely. Attacks on people, harassment, hate speech and threats get removed and can cost you your account.",
  },
  {
    title: "Keep private things private",
    body: "Do not post anyone's address, phone number, email address, ID numbers, financial details, passwords, private messages, or anything else that identifies a private individual, including your own. Anonymous posting exists precisely so you can describe a sensitive problem safely.",
  },
  {
    title: "No spam, scams or deception",
    body: "Do not post scams, phishing links, impersonation, fake testimonials, manipulated evidence, misleading claims, affiliate dumps, engagement bait, crypto “opportunities”, paid-service touting or link farms. Linking to something you built is fine only when it genuinely answers the problem and you clearly disclose your connection to it.",
  },
  {
    title: "Follow the law and respect rights",
    body: "Only share material you have the right to use. Do not infringe copyright, reveal confidential information, invade privacy, facilitate wrongdoing, or use the platform to break the law.",
  },
];

export default function GuidelinesPage() {
  return (
    <div className="page py-12 sm:py-16">
      <header className="mb-12">
        <h1 className="text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Community guidelines
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
          problems.live is a public space for real problems and useful help.
          These rules are strict so the directory stays safe and trustworthy.
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
          We may review content before or after it appears, remove it without
          notice, limit features, suspend accounts, or permanently ban people
          who break these rules. Reports help us review content, but do not
          automatically remove it. Serious safety, legal, or exploitation
          concerns may be escalated outside the platform when required.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link href="/problems/new">Post a Problem</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/problems">Explore problems</Link>
        </Button>
      </div>
    </div>
  );
}

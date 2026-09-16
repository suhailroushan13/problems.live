import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "The terms for using problems.live.",
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  {
    title: "Using problems.live",
    body: "You may browse the directory without an account. Creating an account or posting means you agree to use the service responsibly and in line with these Terms and the Community Guidelines.",
  },
  {
    title: "Your account and content",
    body: "Keep your account details secure. You are responsible for the problems, solutions, comments, images and other material you submit. Only post material you have the right to share. Never include another person’s private information without a lawful reason and their permission where required.",
  },
  {
    title: "Strict content rules",
    body: "You must not submit harmful, hateful, abusive, threatening, sexual, graphic, illegal, deceptive, spammy or infringing content. This includes inappropriate images, slurs, harassment, scams, phishing, impersonation, doxxing, violent threats, and material that exploits or endangers people. You must follow the Community Guidelines at all times.",
  },
  {
    title: "Enforcement",
    body: "We may review, restrict, remove, hide or preserve content; limit access to features; suspend or permanently terminate accounts; and take other action when we reasonably believe these Terms or the Community Guidelines have been violated. We may act without prior notice when needed to protect people, the service or our legal obligations.",
  },
  {
    title: "Your licence to us",
    body: "You keep ownership of the content you submit. You give problems.live a non-exclusive, worldwide licence to host, display, reproduce and distribute that content as needed to operate, improve and promote the service.",
  },
  {
    title: "Service availability",
    body: "We work to keep the service available and useful, but it is provided on an “as is” and “as available” basis. Features may change, pause or end. We are not responsible for losses arising from reliance on user-submitted content or service interruptions where the law allows it.",
  },
  {
    title: "Changes to these Terms",
    body: "We may update these Terms when the service or legal requirements change. The latest version is always published on this page. Continuing to use problems.live after an update means you accept the revised Terms.",
  },
];

export default function TermsPage() {
  return (
    <div className="page py-12 sm:py-16">
      <header className="mb-12 border-b border-hairline pb-8">
        <p className="label text-brand">Legal</p>
        <h1 className="mt-3 text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Terms &amp; conditions
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Last updated September 16, 2026
        </p>
      </header>

      <div className="space-y-9">
        {SECTIONS.map((section, index) => (
          <section key={section.title}>
            <p className="num mb-2 text-xs font-semibold text-muted-foreground">
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
    </div>
  );
}

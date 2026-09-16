import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How problems.live handles information about you.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    title: "Information we collect",
    body: "When you sign in with Google, we receive the account information needed to create and secure your profile, including your name, email address and Google account identifier. During account setup, we collect your date of birth to confirm eligibility, then keep it private and fixed. We also collect the profile details, posts, comments, votes and images you choose to submit.",
  },
  {
    title: "Public content and sensitive information",
    body: "Problems, solutions, comments, votes, profile details and images you publish may be visible to anyone who can access the service. Do not include sensitive personal information, financial information, passwords, identity documents, private messages, or another person’s personal information. Anonymous posts hide your public profile, but the content itself remains public unless it is removed.",
  },
  {
    title: "Anonymous visitor statistics",
    body: "To show the live visitor statistic, we place a random identifier in a first-party cookie and store its first and most recent visit times. This helps us count returning browsers and estimate how many people are currently active; it is not used to identify you personally.",
  },
  {
    title: "How we use information",
    body: "We use information to operate the directory, provide accounts and community features, prevent abuse, moderate content, maintain security, investigate policy violations and understand how the service is used. We do not use your profile information to send marketing messages unless we first tell you and obtain any consent required by law.",
  },
  {
    title: "When information is shared",
    body: "Public profile details and anything you publish are visible to other visitors. We may disclose information to service providers that help host, operate, secure, moderate and store the application, and when required by law or reasonably necessary to protect people, rights, safety or the service. Providers may process information only as needed to provide those services. We do not sell personal information.",
  },
  {
    title: "Retention and your choices",
    body: "We keep information for as long as reasonably needed to operate the service, resolve disputes, prevent abuse and meet legal obligations. Depending on where you live, you may have rights to request access, correction, deletion or restriction of your personal information.",
  },
  {
    title: "Updates to this policy",
    body: "We may update this policy as the service changes. The current version will always be available here, with its revision date. Please review it periodically.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="page py-12 sm:py-16">
      <header className="mb-12 border-b border-hairline pb-8">
        <p className="label text-brand">Legal</p>
        <h1 className="mt-3 text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Privacy policy
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

import type { ProblemDTO } from "@/types";
import { formatDateTime } from "@/lib/utils/time";

/**
 * Plain-text, key/value rendering of a problem for the "Machine" view —
 * meant to be skimmed by an LLM or copy-pasted as context, not styled prose.
 */
export function ProblemMachineView({
  problem,
  permalink,
}: {
  problem: ProblemDTO;
  permalink: string;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-hairline bg-sunken p-4 font-mono text-[0.8125rem] leading-relaxed sm:p-6">
      <p className="text-muted-foreground">problem-{problem.slug}</p>

      <Section title="problem">
        <Row label="title" value={problem.title} />
        <Row label="slug" value={problem.slug} />
        <Row label="status" value={problem.status} />
        <Row label="priority" value={problem.priority} />
        <Row label="category" value={problem.category?.name ?? "uncategorized"} />
        <Row
          label="author"
          value={problem.isAnonymous ? "anonymous" : (problem.author?.username ?? "unknown")}
        />
        <Row label="location" value={problem.location.label} />
        <Row label="created" value={formatDateTime(problem.createdAt)} />
        {problem.editedAt ? <Row label="edited" value={formatDateTime(problem.editedAt)} /> : null}
        {problem.solvedAt ? <Row label="solved" value={formatDateTime(problem.solvedAt)} /> : null}
      </Section>

      <Section title="stats">
        <Row label="validations" value={String(problem.validationCount)} />
        <Row label="bookmarks" value={String(problem.bookmarkCount)} />
        <Row label="comments" value={String(problem.commentCount)} />
        <Row label="solutions" value={String(problem.solutionCount)} />
        <Row label="views" value={String(problem.clickCount)} />
      </Section>

      <Section title="links">
        <Row label="permalink" value={permalink} />
        {problem.category ? (
          <Row label="category" value={`${permalink.split("/problems/")[0]}/categories/${problem.category.slug}`} />
        ) : null}
      </Section>

      <Section title="description" last>
        <p className="whitespace-pre-wrap text-foreground/80">{problem.description}</p>
      </Section>
    </div>
  );
}

function Section({
  title,
  last = false,
  children,
}: {
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={last ? "mt-6" : "mt-6 mb-6"}>
      <p className="text-muted-foreground"># {title}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-x-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  );
}

import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category, Problem, Solution, User } from "@/models";
import { escapeRegex } from "@/lib/utils/text";
import { asScalarString } from "@/lib/utils/sanitize-query";

export interface SearchHit {
  id: string;
  kind: "problem" | "solution" | "category" | "user";
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
}

export interface SearchResults {
  problems: SearchHit[];
  solutions: SearchHit[];
  categories: SearchHit[];
  users: SearchHit[];
  total: number;
}

const EMPTY: SearchResults = {
  problems: [],
  solutions: [],
  categories: [],
  users: [],
  total: 0,
};

/**
 * Global search. Problems and solutions use their text indexes; categories and
 * users use anchored, escaped prefix regexes (indexed, and immune to
 * catastrophic backtracking from crafted input).
 */
export async function globalSearch(
  rawQuery: string,
  options: { limitPerType?: number } = {}
): Promise<SearchResults> {
  const query = asScalarString(rawQuery, 120);
  if (!query || query.length < 2) return EMPTY;

  await connectToDatabase();

  const limit = options.limitPerType ?? 5;
  const prefix = new RegExp(`^${escapeRegex(query)}`, "i");
  const contains = new RegExp(escapeRegex(query), "i");

  const [problems, solutions, categories, users] = await Promise.all([
    Problem.find(
      { moderationStatus: "approved", $text: { $search: query } },
      { score: { $meta: "textScore" }, title: 1, slug: 1, validationCount: 1, status: 1 }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean()
      .exec(),

    Solution.find(
      { moderationStatus: "approved", $text: { $search: query } },
      { score: { $meta: "textScore" }, title: 1, helpfulCount: 1, problemId: 1 }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .populate("problemId", "slug title moderationStatus")
      .lean()
      .exec(),

    Category.find({ status: "approved", name: contains })
      .sort({ problemCount: -1 })
      .limit(limit)
      .lean()
      .exec(),

    User.find({
      status: "active",
      $or: [{ username: prefix }, { name: contains }],
    })
      .sort({ reputation: -1 })
      .limit(limit)
      .lean()
      .exec(),
  ]);

  const results: SearchResults = {
    problems: problems.map((p) => ({
      id: String(p._id),
      kind: "problem" as const,
      title: p.title,
      href: `/problems/${p.slug}`,
      meta: `${p.validationCount ?? 0} have this`,
    })),
    solutions: solutions
      .filter((s) => {
        const problem = s.problemId as unknown as { moderationStatus?: string };
        return !problem?.moderationStatus || problem.moderationStatus === "approved";
      })
      .map((s) => {
        const problem = s.problemId as unknown as { slug?: string; title?: string };
        return {
          id: String(s._id),
          kind: "solution" as const,
          title: s.title,
          subtitle: problem?.title,
          href: problem?.slug
            ? `/problems/${problem.slug}#solution-${String(s._id)}`
            : "/solutions",
          meta: `${s.helpfulCount ?? 0} helpful`,
        };
      }),
    categories: categories.map((c) => ({
      id: String(c._id),
      kind: "category" as const,
      title: c.name,
      href: `/categories/${c.slug}`,
      meta: `${c.problemCount ?? 0} problems`,
    })),
    users: users.map((u) => ({
      id: String(u._id),
      kind: "user" as const,
      title: `@${u.username}`,
      subtitle: u.name,
      href: `/u/${u.username}`,
      meta: `Score ${u.reputation ?? 0}`,
    })),
    total: 0,
  };

  results.total =
    results.problems.length +
    results.solutions.length +
    results.categories.length +
    results.users.length;

  return results;
}

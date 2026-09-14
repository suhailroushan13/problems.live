import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Problem } from "@/models";
import { getSetting } from "@/lib/config/settings";
import { tokenSimilarity, trigramSimilarity, tokenize } from "@/lib/utils/text";

export interface SimilarProblem {
  id: string;
  slug: string;
  title: string;
  validationCount: number;
  status: string;
  score: number;
}

export interface SimilarityProvider {
  readonly name: string;
  findSimilar(input: {
    title: string;
    description?: string;
    limit: number;
    excludeId?: string;
  }): Promise<SimilarProblem[]>;
}

/**
 * Lexical duplicate detection: MongoDB's text index does the cheap recall pass,
 * then we re-rank candidates locally with token overlap + character trigrams.
 *
 * The `SimilarityProvider` seam means an embedding-based provider can be
 * dropped in later (store a vector on Problem, query Atlas Vector Search)
 * without touching the create-problem flow.
 */
class LexicalSimilarityProvider implements SimilarityProvider {
  readonly name = "lexical";

  async findSimilar({
    title,
    description = "",
    limit,
    excludeId,
  }: {
    title: string;
    description?: string;
    limit: number;
    excludeId?: string;
  }): Promise<SimilarProblem[]> {
    const terms = tokenize(title).slice(0, 12);
    if (terms.length === 0) return [];

    await connectToDatabase();

    const baseFilter: Record<string, unknown> = {
      moderationStatus: "approved",
      status: { $ne: "not_relevant" },
    };
    if (excludeId) baseFilter._id = { $ne: excludeId };

    // Recall: OR the significant terms so partial matches still surface.
    const candidates = await Problem.find(
      { ...baseFilter, $text: { $search: terms.join(" ") } },
      {
        score: { $meta: "textScore" },
        title: 1,
        slug: 1,
        description: 1,
        validationCount: 1,
        status: 1,
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(40)
      .lean()
      .exec();

    const threshold = await getSetting("duplicateSimilarityThreshold");
    const needle = `${title} ${description}`.slice(0, 600);

    return candidates
      .map((c) => {
        // Title-to-title dominates; body overlap is a weaker corroborating
        // signal, so two posts about the same thing still match even when one
        // is terse.
        const titleToken = tokenSimilarity(title, c.title);
        const titleTrigram = trigramSimilarity(title, c.title);
        const bodyToken = tokenSimilarity(needle, `${c.title} ${c.description}`);
        const score =
          titleToken * 0.45 + titleTrigram * 0.35 + bodyToken * 0.2;

        return {
          id: String(c._id),
          slug: c.slug,
          title: c.title,
          validationCount: c.validationCount,
          status: c.status,
          score: Number(score.toFixed(4)),
        };
      })
      .filter((c) => c.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

const globalForSimilarity = globalThis as unknown as {
  __similarityProvider?: SimilarityProvider;
};

function provider(): SimilarityProvider {
  if (!globalForSimilarity.__similarityProvider) {
    globalForSimilarity.__similarityProvider = new LexicalSimilarityProvider();
  }
  return globalForSimilarity.__similarityProvider;
}

export async function findSimilarProblems(input: {
  title: string;
  description?: string;
  limit?: number;
  excludeId?: string;
}): Promise<SimilarProblem[]> {
  if (input.title.trim().length < 8) return [];
  try {
    return await provider().findSimilar({
      title: input.title,
      description: input.description,
      limit: input.limit ?? 4,
      excludeId: input.excludeId,
    });
  } catch {
    // Duplicate detection is advisory — never block posting on its failure.
    return [];
  }
}

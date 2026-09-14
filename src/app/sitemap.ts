import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { listAllProblemSlugs } from "@/lib/data/problems";
import { listAllCategorySlugs } from "@/lib/data/categories";
import { listAllUsernames } from "@/lib/data/users";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.appUrl;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/problems`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/categories`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/solutions`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/leaderboard`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/guidelines`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // A database outage must degrade the sitemap, not break the build.
  const [problems, categories, users] = await Promise.all([
    listAllProblemSlugs(5000).catch(() => []),
    listAllCategorySlugs().catch(() => []),
    listAllUsernames(2000).catch(() => []),
  ]);

  return [
    ...staticRoutes,
    ...categories.map((category) => ({
      url: `${base}/categories/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...problems.map((problem) => ({
      url: `${base}/problems/${problem.slug}`,
      lastModified: problem.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...users.map((user) => ({
      url: `${base}/u/${user.username}`,
      lastModified: user.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}

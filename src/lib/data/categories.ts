import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category, type ICategory } from "@/models";
import type { CategoryDTO } from "@/types";
import { toCategoryDTO } from "./serialize";

export async function listCategories(): Promise<CategoryDTO[]> {
  await connectToDatabase();
  const docs = await Category.find({ status: "approved" })
    .sort({ order: 1, name: 1 })
    .lean<ICategory[]>()
    .exec();
  return docs.map(toCategoryDTO);
}

export async function listCategoriesByPopularity(
  limit = 16
): Promise<CategoryDTO[]> {
  await connectToDatabase();
  const docs = await Category.find({ status: "approved" })
    .sort({ problemCount: -1, name: 1 })
    .limit(limit)
    .lean<ICategory[]>()
    .exec();
  return docs.map(toCategoryDTO);
}

export async function getCategoryBySlug(
  slug: string
): Promise<CategoryDTO | null> {
  await connectToDatabase();
  const doc = await Category.findOne({
    slug: String(slug).toLowerCase(),
    status: "approved",
  })
    .lean<ICategory>()
    .exec();
  return doc ? toCategoryDTO(doc) : null;
}

export async function listAllCategorySlugs(): Promise<
  Array<{ slug: string; updatedAt: Date }>
> {
  await connectToDatabase();
  const docs = await Category.find({ status: "approved" }, { slug: 1, updatedAt: 1 })
    .lean()
    .exec();
  return docs.map((d) => ({ slug: d.slug, updatedAt: d.updatedAt }));
}

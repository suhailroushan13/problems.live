import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryActions } from "@/components/admin/category-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { listAdminCategories } from "@/lib/data/admin";
import { formatCount } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();
  const approved = categories.filter((c) => c.status === "approved");

  if (categories.length === 0) {
    return (
      <EmptyState
        title="No categories yet."
        description="Run the seed script to create the starting taxonomy."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Problems</TableHead>
            <TableHead>Suggested by</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                <Link
                  href={`/categories/${category.slug}`}
                  className="font-medium text-foreground transition-colors hover:text-brand"
                >
                  {category.name}
                </Link>
                {category.description ? (
                  <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                    {category.description}
                  </p>
                ) : null}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    category.status === "approved"
                      ? "secondary"
                      : category.status === "pending"
                        ? "default"
                        : "outline"
                  }
                  className="capitalize"
                >
                  {category.status}
                </Badge>
              </TableCell>
              <TableCell className="num text-right">
                {formatCount(category.problemCount)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {category.suggestedBy ? `@${category.suggestedBy}` : "System"}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <CategoryActions
                    category={category}
                    mergeTargets={approved.filter((c) => c.id !== category.id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

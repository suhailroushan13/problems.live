import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="pb-12">
      <div className="page max-w-2xl pt-12 sm:pt-16">
        <Skeleton className="h-11 w-48" />
        <Skeleton className="mt-3 h-5 w-64" />
      </div>

      <div className="page mt-10">
        <Skeleton className="h-16 w-full rounded-full" />
      </div>

      <div className="page mt-6">
        <Skeleton className="h-11 w-64 rounded-full" />
      </div>

      <div className="page mt-5 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

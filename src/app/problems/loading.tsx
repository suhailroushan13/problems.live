import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="pb-28 sm:pb-12">
      <div className="page pt-5 sm:pt-16">
        <Skeleton className="h-7 w-28 sm:h-11 sm:w-48" />
        <Skeleton className="mt-2 h-4 w-44 sm:mt-3 sm:h-5 sm:w-64" />
      </div>

      <div className="page mt-4 sm:mt-6">
        <Skeleton className="h-13 w-full rounded-[0.875rem] sm:h-11 sm:rounded-md" />
      </div>

      <div className="page mt-3 flex gap-2">
        <Skeleton className="h-9 w-16 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      <div className="page mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-xl sm:h-32 sm:rounded-lg" />
        ))}
      </div>
    </div>
  );
}

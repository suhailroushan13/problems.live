import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Skeleton className="h-4 w-64" />

      <div className="mt-8 flex gap-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>

      <Skeleton className="mt-4 h-10 w-full" />
      <Skeleton className="mt-2 h-10 w-3/4" />
      <Skeleton className="mt-6 h-5 w-40" />

      <div className="mt-7 space-y-2.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full last:w-2/3" />
        ))}
      </div>

      <div className="mt-10 flex items-end justify-between border-t border-hairline py-8">
        <div>
          <Skeleton className="h-12 w-32" />
          <Skeleton className="mt-3 h-3 w-40" />
        </div>
        <Skeleton className="h-11 w-56 rounded-lg" />
      </div>

      <div className="space-y-3 border-t border-hairline pt-10">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

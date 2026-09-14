import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="page pt-12 pb-10 text-center sm:pt-16">
        <Skeleton className="mx-auto h-9 w-full max-w-2xl sm:h-11" />
        <Skeleton className="mx-auto mt-4 h-4 w-72" />
        <Skeleton className="mx-auto mt-7 h-12 w-full max-w-4xl rounded-full" />
        <Skeleton className="mx-auto mt-4 h-4 w-56" />
      </div>

      <div className="pb-16">
        <div className="page mt-2 flex items-end justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="mt-2 h-4 w-20" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>

        <div className="page mt-5">
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>

        <div className="page mt-4">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        <div className="page mt-4 overflow-hidden rounded-xl border border-hairline">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-hairline px-4 py-3.5 last:border-0"
            >
              <Skeleton className="h-4 w-5 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="hidden h-5 w-20 shrink-0 rounded-full md:block" />
              <Skeleton className="h-4 w-10 shrink-0" />
              <Skeleton className="hidden h-4 w-10 shrink-0 sm:block" />
              <Skeleton className="hidden h-4 w-14 shrink-0 lg:block" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/** A thin register of live numbers — the "this is real" proof on the homepage. */
export function StatStrip({
  items,
  className,
}: {
  items: Array<{ label: string; value: number }>;
  className?: string;
}) {
  return (
    <dl
      className={cn("grid grid-cols-2 divide-x divide-y divide-hairline border-y border-hairline sm:grid-cols-4 sm:divide-y-0",
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn("px-4 py-5 sm:px-6",
            index % 2 === 0 && "border-l-0 sm:border-l",
            index === 0 && "sm:border-l-0"
          )}
        >
          <dd className="num text-2xl leading-none font-semibold tracking-[-0.02em] text-foreground">
            {formatCount(item.value)}
          </dd>
          <dt className="label mt-2 text-muted-foreground">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

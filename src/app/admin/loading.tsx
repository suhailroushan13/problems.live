export default function AdminLoading() {
  return (
    <div aria-label="Loading admin page" className="animate-pulse space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="h-9 w-48 rounded-lg bg-sunken" />
        <div className="h-9 w-28 rounded-lg bg-sunken" />
      </div>
      <div className="overflow-hidden rounded-xl border border-hairline">
        <div className="h-11 border-b border-hairline bg-tint" />
        <div className="space-y-px bg-hairline">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="grid h-14 grid-cols-[1.5fr_1fr_1.5fr_0.7fr] items-center gap-6 bg-elevated px-4">
              <span className="h-3.5 w-3/4 rounded bg-sunken" />
              <span className="h-3.5 w-2/3 rounded bg-sunken" />
              <span className="h-3.5 w-4/5 rounded bg-sunken" />
              <span className="h-7 w-full rounded bg-sunken" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

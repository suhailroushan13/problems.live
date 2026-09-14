"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only safe handle on the server-side stack; the stack
    // itself never reaches the browser.
    console.error("[app] render error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" />
      </div>

      <h1 className="display text-3xl text-foreground sm:text-4xl">
        Something went wrong.
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        This one is on us. Try again — and if it keeps happening, the reference
        below helps us track it down.
      </p>

      {error.digest ? (
        <p className="num mt-4 rounded-md border border-hairline bg-sunken px-2.5 py-1 text-xs text-muted-foreground">
          {error.digest}
        </p>
      ) : null}

      <Button size="lg" onClick={reset} className="mt-8">
        <RotateCw className="size-4" />
        Try again
      </Button>
    </div>
  );
}

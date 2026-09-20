"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AdminUserSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    router.push(
      trimmed ? `/admin/users?q=${encodeURIComponent(trimmed)}` : "/admin/users"
    );
  }

  return (
    <form onSubmit={submit} className="relative w-full max-w-md">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search users…"
        aria-label="Search users by name, username, or email"
        className="h-10 pl-10 text-sm"
      />
    </form>
  );
}

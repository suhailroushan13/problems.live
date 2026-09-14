"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <form onSubmit={submit} className="flex max-w-sm items-center gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by name or username…"
        aria-label="Search users"
      />
      <Button type="submit" variant="outline" size="icon">
        <Search className="size-4" />
        <span className="sr-only">Search</span>
      </Button>
    </form>
  );
}

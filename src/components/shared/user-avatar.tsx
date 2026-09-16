import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-5 text-[10px]",
  sm: "size-6 text-[11px]",
  md: "size-8 text-xs",
  mobile: "size-9 text-xs",
  lg: "size-12 text-sm",
  xl: "size-16 text-lg",
} as const;

export function UserAvatar({
  name,
  username,
  avatar,
  size = "sm",
  className,
}: {
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const label = name || username || "Anonymous";
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Avatar className={cn(SIZES[size], "shrink-0", className)}>
      {avatar ? <AvatarImage src={avatar} alt="" /> : null}
      <AvatarFallback className="bg-sunken font-medium text-muted-foreground">
        {initials || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

/** Anonymous posts get a deliberately neutral, non-identifying mark. */
export function AnonymousAvatar({
  size = "sm",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <Avatar className={cn(SIZES[size], "shrink-0", className)}>
      <AvatarFallback className="bg-sunken text-muted-foreground">
        <svg viewBox="0 0 24 24" className="size-1/2" aria-hidden="true">
          <circle cx="12" cy="9" r="3.5" fill="currentColor" opacity="0.5" />
          <path
            d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"
            fill="currentColor"
            opacity="0.5"
          />
        </svg>
      </AvatarFallback>
    </Avatar>
  );
}

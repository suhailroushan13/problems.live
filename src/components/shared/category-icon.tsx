import {
  Baby, Briefcase, Bus, Cpu, GraduationCap, HeartHandshake, Home, Landmark,
  Leaf, Shapes, ShoppingBag, Stethoscope, UtensilsCrossed, Users, Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Explicit map rather than a dynamic lookup: it keeps the icon set auditable
 * and lets Next tree-shake everything we do not use.
 */
const ICONS: Record<string, LucideIcon> = {
  Baby, Briefcase, Bus, Cpu, GraduationCap, HeartHandshake, Home, Landmark,
  Leaf, Shapes, ShoppingBag, Stethoscope, UtensilsCrossed, Users, Wallet,
};

export function CategoryIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = ICONS[name ?? "Shapes"] ?? Shapes;
  return <Icon className={cn("size-4", className)} aria-hidden="true" />;
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function SuhailLoginCompletePage() {
  const user = await getCurrentUser();
  redirect(user?.isAdmin ? "/admin" : "/suhail/login?error=not_authorized");
}

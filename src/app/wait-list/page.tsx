import { redirect } from "next/navigation";
/** Legacy waitlist links now start the open Google sign-in flow. */
export default function WaitListPage() {
  redirect("/api/auth/google?next=%2F");
}

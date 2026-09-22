import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { WaitlistSignupActions } from "@/components/admin/waitlist-signup-actions";
import { ApproveAllWaitlistButton } from "@/components/admin/approve-all-waitlist-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listWaitlistSignups } from "@/lib/data/admin";
import { formatDateTimeWithSeconds } from "@/lib/utils/time";

export const metadata: Metadata = { title: "Waiting list" };

export default async function AdminWaitingListPage() {
  const [user, signups] = await Promise.all([
    getCurrentUser(),
    listWaitlistSignups(),
  ]);
  if (!user?.isAdmin) redirect("/admin");

  if (signups.length === 0) {
    return (
      <EmptyState
        title="No pending signups."
        description="People who join the waitlist from /wait-list will show up here until you approve or reject them."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ApproveAllWaitlistButton count={signups.length} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-hairline">
        <Table>
        <TableHeader className="bg-tint">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 text-center">#</TableHead>
            <TableHead className="min-w-[11rem]">Name</TableHead>
            <TableHead className="min-w-[14rem]">Email</TableHead>
            <TableHead className="w-[9.5rem]">Submitted</TableHead>
            <TableHead className="w-[14rem] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signups.map((signup, index) => (
            <TableRow key={signup.id}>
              <TableCell className="num text-center text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="text-sm font-semibold text-foreground">{signup.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{signup.email}</TableCell>
              <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                {formatDateTimeWithSeconds(signup.createdAt)}
              </TableCell>
              <TableCell>
                <WaitlistSignupActions id={signup.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </div>
  );
}

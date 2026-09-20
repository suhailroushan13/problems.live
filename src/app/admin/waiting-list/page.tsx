import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { getCurrentUser } from "@/lib/auth/current-user";
import { listWaitlistSignups } from "@/lib/data/admin";
import { formatDateTimeWithSeconds } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import type { WaitlistSignupStatus } from "@/models";

export const metadata: Metadata = { title: "Waiting list" };

const STATUS_STYLES: Record<WaitlistSignupStatus, string> = {
  pending: "",
  approved: "border-success/25 bg-success-subtle text-success",
  rejected: "border-destructive/20 bg-error-subtle text-destructive",
};

export default async function AdminWaitingListPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/admin");

  const signups = await listWaitlistSignups();

  if (signups.length === 0) {
    return (
      <EmptyState
        title="No signups yet."
        description="People who join the waitlist from /wait-list will show up here."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <Table>
        <TableHeader className="bg-tint">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 text-center">#</TableHead>
            <TableHead className="min-w-[11rem]">Name</TableHead>
            <TableHead className="min-w-[14rem]">Email</TableHead>
            <TableHead className="w-[7rem]">Status</TableHead>
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
              <TableCell>
                <Badge variant="outline" className={cn("capitalize", STATUS_STYLES[signup.status])}>
                  {signup.status}
                </Badge>
              </TableCell>
              <TableCell
                title={signup.respondedAt ? `Responded ${formatDateTimeWithSeconds(signup.respondedAt)}` : undefined}
                className="text-sm whitespace-nowrap text-muted-foreground"
              >
                {formatDateTimeWithSeconds(signup.createdAt)}
              </TableCell>
              <TableCell>
                {signup.status === "pending" ? (
                  <WaitlistSignupActions id={signup.id} />
                ) : (
                  <p className="text-right text-xs text-muted-foreground italic">
                    {signup.status === "approved" ? "Invited" : "Rejected"}
                  </p>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

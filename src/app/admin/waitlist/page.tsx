import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { WaitlistEntryActions } from "@/components/admin/waitlist-entry-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { formatDate } from "@/lib/utils/time";
import { WaitlistEntry } from "@/models";

const WAITLIST_STATUS_LABELS = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
} as const;

export default async function AdminWaitlistPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/admin");

  await connectToDatabase();
  const entries = await WaitlistEntry.find(
    {},
    { name: 1, email: 1, status: 1, confirmationSentAt: 1, createdAt: 1 },
  )
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()
    .exec();

  return (
    <div>
      <div className="max-w-2xl">
        <p className="label text-brand">Early access</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Waitlist</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The 200 most recent requests to join problems.live.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No waitlist requests yet."
          description="Requests from the public waitlist form will appear here."
          className="mt-8"
        />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Confirmation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={String(entry._id)}>
                  <TableCell className="font-medium text-foreground">
                    {entry.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.email}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.confirmationSentAt ? "Sent" : "Pending"}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-muted-foreground">
                    {WAITLIST_STATUS_LABELS[entry.status ?? "pending"]}
                  </TableCell>
                  <TableCell>
                    <WaitlistEntryActions
                      id={String(entry._id)}
                      name={entry.name}
                      email={entry.email}
                      status={entry.status ?? "pending"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

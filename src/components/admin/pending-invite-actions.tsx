"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePendingInvite, updatePendingInvite } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AdminPendingInvite } from "@/lib/data/admin";

export function PendingInviteActions({ invite }: { invite: AdminPendingInvite }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(invite.name);
  const [email, setEmail] = useState(invite.email);

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) { toast.error(result.error ?? "That didn't work."); return; }
      toast.success(result.message ?? "Done.");
      setEditOpen(false);
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return <><div className="flex justify-end gap-1"><Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit invitation for ${invite.email}`} title="Edit invitation" disabled={pending} onClick={() => setEditOpen(true)}><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete invitation for ${invite.email}`} title="Delete invitation" disabled={pending} onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" /></Button></div><Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit pending invitation</DialogTitle><DialogDescription>Update the name or email before this invitation is accepted.</DialogDescription></DialogHeader><div className="grid gap-4"><div className="grid gap-2"><Label htmlFor={`invite-name-${invite.id}`}>Name</Label><Input id={`invite-name-${invite.id}`} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor={`invite-email-${invite.id}`}>Email</Label><Input id={`invite-email-${invite.id}`} type="email" value={email} maxLength={254} onChange={(event) => setEmail(event.target.value)} /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={pending}>Cancel</Button><Button type="button" onClick={() => run(() => updatePendingInvite(invite.id, { name, email }))} disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></DialogFooter></DialogContent></Dialog><AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this pending invitation?</AlertDialogTitle><AlertDialogDescription>This cancels the invitation. No user account has been created, and the recipient will no longer be able to use its link.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending} onClick={(event) => { event.preventDefault(); run(() => deletePendingInvite(invite.id)); }}>{pending ? "Deleting…" : "Delete invitation"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

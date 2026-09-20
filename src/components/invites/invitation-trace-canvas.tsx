"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MousePointer2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAllInvites } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type TraceNode = {
  id: string;
  label: string;
  email: string;
  credits?: number;
  pending: boolean;
};

export function InvitationTraceCanvas({ nodes, edges }: { nodes: TraceNode[]; edges: Array<{ from: string; to: string }> }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<TraceNode | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDeleteAll() {
    startTransition(async () => {
      const result = await deleteAllInvites();
      if (!result.ok) {
        toast.error(result.error ?? "That didn't work.");
        return;
      }
      toast.success(result.message ?? "Invitations deleted.");
      setConfirmOpen(false);
      setSelected(null);
      router.refresh();
    });
  }
  const layout = useMemo(() => {
    const incoming = new Set(edges.map((edge) => edge.to));
    const children = new Map<string, string[]>();
    for (const edge of edges) children.set(edge.from, [...(children.get(edge.from) ?? []), edge.to]);
    const levels = new Map<number, string[]>();
    const visited = new Set<string>();
    const roots = nodes.filter((node) => !incoming.has(node.id));
    const visit = (id: string, depth: number) => {
      if (visited.has(id)) return;
      visited.add(id);
      levels.set(depth, [...(levels.get(depth) ?? []), id]);
      for (const child of children.get(id) ?? []) visit(child, depth + 1);
    };
    roots.forEach((node) => visit(node.id, 0));
    nodes.forEach((node) => visit(node.id, 0));
    return levels;
  }, [edges, nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.clearRect(0, 0, rect.width, rect.height);
      context.fillStyle = "#f8fafc";
      context.fillRect(0, 0, rect.width, rect.height);
      const positions = new Map<string, { x: number; y: number }>();
      const maxDepth = Math.max(...layout.keys(), 0);
      for (const [depth, ids] of layout) {
        ids.forEach((id, index) => positions.set(id, { x: ((index + 1) * rect.width) / (ids.length + 1), y: 78 + (depth * Math.max(132, Math.min(180, (rect.height - 140) / Math.max(maxDepth, 1)))) }));
      }
      context.strokeStyle = "#cbd5e1";
      context.lineWidth = 1.5;
      for (const edge of edges) {
        const from = positions.get(edge.from); const to = positions.get(edge.to);
        if (!from || !to) continue;
        context.beginPath(); context.moveTo(from.x, from.y + 35); context.bezierCurveTo(from.x, from.y + 64, to.x, to.y - 64, to.x, to.y - 35); context.stroke();
      }
      for (const node of nodes) {
        const position = positions.get(node.id); if (!position) continue;
        const width = 174; const height = 78; const x = position.x - width / 2; const y = position.y - height / 2;
        context.fillStyle = node.pending ? "#fff7ed" : "#ffffff";
        context.strokeStyle = node.pending ? "#fb923c" : "#94a3b8";
        context.lineWidth = selected?.id === node.id ? 3 : 1;
        context.beginPath(); context.roundRect(x, y, width, height, 10); context.fill(); context.stroke();
        context.fillStyle = node.pending ? "#c2410c" : "#0f172a";
        context.font = "600 12px Figtree, sans-serif";
        context.fillText(node.label.slice(0, 24), x + 12, y + 22);
        context.fillStyle = "#64748b"; context.font = "11px Figtree, sans-serif";
        context.fillText(node.pending ? "Pending invite" : `${node.credits ?? 0} invites left`, x + 12, y + 40);
        // An envelope mark keeps the secondary email line recognisable even
        // when a narrow canvas truncates the address.
        context.strokeStyle = "#94a3b8"; context.lineWidth = 1;
        context.strokeRect(x + 12, y + 51, 11, 8);
        context.beginPath(); context.moveTo(x + 12, y + 51); context.lineTo(x + 17.5, y + 55.5); context.lineTo(x + 23, y + 51); context.stroke();
        context.fillStyle = "#64748b"; context.font = "10px Figtree, sans-serif";
        context.fillText(node.email.length > 22 ? `${node.email.slice(0, 21)}…` : node.email, x + 29, y + 59);
      }
      canvas.onclick = (event) => {
        const bounds = canvas.getBoundingClientRect(); const x = event.clientX - bounds.left; const y = event.clientY - bounds.top;
        const hit = nodes.find((node) => { const p = positions.get(node.id); return p && Math.abs(x - p.x) <= 87 && Math.abs(y - p.y) <= 39; });
        setSelected(hit ?? null);
      };
    };
    draw();
    const observer = new ResizeObserver(draw); observer.observe(canvas); return () => observer.disconnect();
  }, [edges, layout, nodes, selected]);

  if (nodes.length === 0) return <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-muted-foreground">Your invitation map will appear here once you send an invite.</div>;
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-hairline bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <div>
            <p className="font-semibold">Invitation trace</p>
            <p className="mt-1 text-xs text-muted-foreground">Lines show who brought whom into the network.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={pending}
            >
              <Trash2 className="size-3.5" />
              Delete all invitations
            </Button>
            <MousePointer2 className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </div>
        <canvas ref={canvasRef} className="h-[520px] w-full cursor-crosshair" aria-label="Invitation trace map" />
        {selected ? (
          <div className="border-t border-hairline px-5 py-3 text-sm">
            <span className="font-semibold">{selected.label}</span>
            <span className="ml-2 text-muted-foreground">{selected.email} · {selected.pending ? "Invitation pending" : `${selected.credits ?? 0} invites remaining`}</span>
          </div>
        ) : null}
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete every invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all invite records — sent, pending, and accepted. Accounts
              created from past invites are not affected. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={(event) => { event.preventDefault(); confirmDeleteAll(); }}>
              {pending ? "Deleting…" : "Delete all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

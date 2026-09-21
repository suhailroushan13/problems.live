"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MousePointer2, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteAllInvites } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type TraceNode = { id: string; label: string; email: string; credits?: number; pending: boolean };
type Point = { x: number; y: number };

const NODE_WIDTH = 196;
const NODE_HEIGHT = 82;
const PADDING_X = 84;
const PADDING_Y = 72;
const shorten = (value: string, maxLength: number) => value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

/** A fixed-scale relationship map. The surrounding viewport scrolls for large networks. */
export function InvitationTraceCanvas({ nodes, edges }: { nodes: TraceNode[]; edges: Array<{ from: string; to: string }> }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<TraceNode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const { positions, bounds } = useMemo(() => {
    const incoming = new Set(edges.map((edge) => edge.to));
    const children = new Map<string, string[]>();
    for (const edge of edges) children.set(edge.from, [...(children.get(edge.from) ?? []), edge.to]);
    const levels = new Map<number, string[]>();
    const visited = new Set<string>();
    const visit = (id: string, depth: number) => {
      if (visited.has(id) || !nodeById.has(id)) return;
      visited.add(id);
      levels.set(depth, [...(levels.get(depth) ?? []), id]);
      for (const child of children.get(id) ?? []) visit(child, depth + 1);
    };
    nodes.filter((node) => !incoming.has(node.id)).forEach((node) => visit(node.id, 0));
    nodes.forEach((node) => visit(node.id, 0));

    const nextPositions = new Map<string, Point>();
    const widestLevel = Math.max(1, ...[...levels.values()].map((ids) => ids.length));
    for (const [depth, ids] of levels) {
      ids.forEach((id, index) => nextPositions.set(id, {
        x: (index - (ids.length - 1) / 2) * 252,
        y: depth * 184,
      }));
    }
    return {
      positions: nextPositions,
      bounds: { width: Math.max(NODE_WIDTH, widestLevel * 252), height: Math.max(NODE_HEIGHT, levels.size * 184) },
    };
  }, [edges, nodeById, nodes]);

  const canvasWidth = Math.max(760, bounds.width + PADDING_X * 2);
  const canvasHeight = Math.max(330, bounds.height + PADDING_Y * 2);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;

    const style = getComputedStyle(document.documentElement);
    const color = (name: string) => style.getPropertyValue(name).trim();
    const background = color("--card");
    const foreground = color("--foreground");
    const muted = color("--muted-foreground");
    const hairline = color("--hairline");
    const tint = color("--tint");
    const brand = color("--brand");
    const brandMuted = color("--brand-muted");
    const warning = color("--warning");
    const warningSubtle = color("--warning-subtle");

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.fillStyle = background;
    context.fillRect(0, 0, rect.width, rect.height);
    context.strokeStyle = hairline;
    context.lineWidth = 1;
    context.globalAlpha = 0.5;
    for (let x = 0; x < rect.width; x += 48) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, rect.height); context.stroke(); }
    for (let y = 0; y < rect.height; y += 48) { context.beginPath(); context.moveTo(0, y); context.lineTo(rect.width, y); context.stroke(); }
    context.globalAlpha = 1;
    context.save();
    context.translate(rect.width / 2, PADDING_Y);

    context.lineWidth = 1.5;
    context.strokeStyle = hairline;
    for (const edge of edges) {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) continue;
      context.beginPath();
      context.moveTo(from.x, from.y + NODE_HEIGHT / 2);
      context.bezierCurveTo(from.x, from.y + 106, to.x, to.y - 106, to.x, to.y - NODE_HEIGHT / 2);
      context.stroke();
    }

    for (const node of nodes) {
      const point = positions.get(node.id);
      if (!point) continue;
      const x = point.x - NODE_WIDTH / 2;
      const y = point.y - NODE_HEIGHT / 2;
      const isSelected = selected?.id === node.id;
      const isHovered = hoveredId === node.id;
      context.save();
      context.shadowColor = "rgba(15, 23, 42, 0.14)";
      context.shadowBlur = isSelected ? 20 : isHovered ? 14 : 8;
      context.shadowOffsetY = 4;
      context.fillStyle = node.pending ? warningSubtle : tint;
      context.strokeStyle = isSelected ? brand : node.pending ? warning : hairline;
      context.lineWidth = isSelected ? 2.5 : 1;
      context.beginPath(); context.roundRect(x, y, NODE_WIDTH, NODE_HEIGHT, 12); context.fill(); context.stroke(); context.restore();
      context.fillStyle = node.pending ? warning : brand;
      context.beginPath(); context.arc(x + 18, y + 19, 5, 0, Math.PI * 2); context.fill();
      context.fillStyle = foreground;
      context.font = "600 13px var(--font-figtree), sans-serif";
      context.fillText(shorten(node.label || "Unnamed invite", 25), x + 30, y + 24);
      context.fillStyle = muted;
      context.font = "11px var(--font-figtree), sans-serif";
      context.fillText(node.pending ? "Awaiting acceptance" : "Member", x + 18, y + 47);
      context.fillStyle = node.pending ? warning : muted;
      context.font = "10px var(--font-inter), monospace";
      context.fillText(shorten(node.email || "Personal invite link", 29), x + 18, y + 66);
    }
    context.restore();
    context.fillStyle = brandMuted;
    context.strokeStyle = hairline;
    context.lineWidth = 1;
    context.beginPath(); context.roundRect(16, 16, 122, 28, 14); context.fill(); context.stroke();
    context.fillStyle = brand;
    context.font = "600 11px var(--font-inter), sans-serif";
    context.fillText(`${nodes.length} people · ${edges.length} links`, 28, 34);
  }, [edges, hoveredId, nodes, positions, selected]);

  useEffect(() => {
    draw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw, canvasHeight, canvasWidth]);

  const pointAtEvent = (event: { currentTarget: HTMLCanvasElement; clientX: number; clientY: number }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const nodeAt = (screenPoint: Point) => {
    const world = { x: screenPoint.x - canvasWidth / 2, y: screenPoint.y - PADDING_Y };
    return nodes.find((node) => {
      const point = positions.get(node.id);
      return point && Math.abs(world.x - point.x) <= NODE_WIDTH / 2 && Math.abs(world.y - point.y) <= NODE_HEIGHT / 2;
    }) ?? null;
  };
  function confirmDeleteAll() {
    startTransition(async () => {
      const result = await deleteAllInvites();
      if (!result.ok) { toast.error(result.error ?? "That didn't work."); return; }
      toast.success(result.message ?? "Invitations deleted.");
      setConfirmOpen(false); setSelected(null); router.refresh();
    });
  }

  if (nodes.length === 0) return <div className="flex min-h-70 flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-tint px-6 text-center"><Users className="size-6 text-brand" /><p className="mt-4 font-semibold text-foreground">The network is waiting for its first route.</p><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Send an invitation above and this map will trace every connection it creates.</p></div>;

  return <><section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-hairline bg-card"><div className="flex flex-col gap-4 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="label text-brand">Invitation trace</p><p className="mt-1 text-sm text-muted-foreground">Follow each introduction through the network.</p></div><div className="flex items-center gap-2"><div className="flex items-center gap-3 rounded-full border border-hairline bg-tint px-3 py-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-brand" /> Member</span><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-warning" /> Awaiting</span></div><Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmOpen(true)} disabled={pending}><Trash2 className="size-3.5" /> Delete all</Button></div></div><div className="min-h-0 max-h-[clamp(18rem,46svh,30rem)] overflow-auto overscroll-contain bg-card"><canvas ref={canvasRef} style={{ width: canvasWidth, height: canvasHeight }} className="block cursor-pointer" aria-label="Invitation trace map. Scroll to browse the full fixed-size network and click a person to inspect their invitation status." onPointerMove={(event) => setHoveredId(nodeAt(pointAtEvent(event))?.id ?? null)} onPointerLeave={() => setHoveredId(null)} onClick={(event) => setSelected(nodeAt(pointAtEvent(event)))} /></div><div className="flex min-h-14 items-center border-t border-hairline bg-tint px-5 py-3">{selected ? <div className="flex min-w-0 flex-1 items-center gap-3"><span className={cn("size-2.5 shrink-0 rounded-full", selected.pending ? "bg-warning" : "bg-brand")} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{selected.label || "Unnamed invite"}</p><p className="truncate text-xs text-muted-foreground">{selected.email || "Personal invite link"} · {selected.pending ? "Awaiting acceptance" : "Member"}</p></div><Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(null)}>Clear</Button></div> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><MousePointer2 className="size-4" /> Scroll to browse the network. Select a person for details.</p>}</div></section><AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete every invitation?</AlertDialogTitle><AlertDialogDescription>This permanently deletes all invite records — sent, pending, and accepted. Accounts created from past invites are not affected.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending} onClick={(event) => { event.preventDefault(); confirmDeleteAll(); }}>{pending ? "Deleting…" : "Delete all"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

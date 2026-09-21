"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Maximize2, Minus, MousePointer2, Plus, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteAllInvites } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type TraceNode = { id: string; label: string; email: string; credits?: number; pending: boolean };
type Point = { x: number; y: number };
type Viewport = Point & { scale: number };

const NODE_WIDTH = 196;
const NODE_HEIGHT = 82;
const MIN_SCALE = 0.35;
const MAX_SCALE = 2.5;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const shorten = (value: string, maxLength: number) => value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

/** A direct-manipulation map of the invite graph, optimised for dense networks. */
export function InvitationTraceCanvas({ nodes, edges }: { nodes: TraceNode[]; edges: Array<{ from: string; to: string }> }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ start: Point; origin: Point; moved: boolean } | null>(null);
  const [selected, setSelected] = useState<TraceNode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
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
      visited.add(id); levels.set(depth, [...(levels.get(depth) ?? []), id]);
      for (const child of children.get(id) ?? []) visit(child, depth + 1);
    };
    nodes.filter((node) => !incoming.has(node.id)).forEach((node) => visit(node.id, 0));
    nodes.forEach((node) => visit(node.id, 0));
    const nextPositions = new Map<string, Point>();
    const widestLevel = Math.max(1, ...[...levels.values()].map((ids) => ids.length));
    for (const [depth, ids] of levels) ids.forEach((id, index) => nextPositions.set(id, { x: (index - (ids.length - 1) / 2) * 252, y: depth * 184 }));
    return { positions: nextPositions, bounds: { width: Math.max(NODE_WIDTH, widestLevel * 252), height: Math.max(NODE_HEIGHT, levels.size * 184) } };
  }, [edges, nodeById, nodes]);

  const fitViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = clamp(Math.min((rect.width - 96) / bounds.width, (rect.height - 128) / bounds.height, 1), MIN_SCALE, 1);
    setViewport({ x: rect.width / 2, y: Math.max(80, (rect.height - bounds.height * scale) / 2 + 20), scale });
  }, [bounds]);

  useEffect(() => { const frame = window.requestAnimationFrame(fitViewport); return () => window.cancelAnimationFrame(frame); }, [fitViewport]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio)); canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext("2d"); if (!context) return;
    const style = getComputedStyle(document.documentElement); const color = (name: string) => style.getPropertyValue(name).trim();
    const background = color("--card"); const foreground = color("--foreground"); const muted = color("--muted-foreground"); const hairline = color("--hairline"); const tint = color("--tint"); const brand = color("--brand"); const brandMuted = color("--brand-muted"); const warning = color("--warning"); const warningSubtle = color("--warning-subtle");
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, rect.width, rect.height); context.fillStyle = background; context.fillRect(0, 0, rect.width, rect.height);
    const gridStep = 48 * viewport.scale;
    context.strokeStyle = hairline; context.lineWidth = 1; context.globalAlpha = 0.55;
    for (let x = ((viewport.x % gridStep) + gridStep) % gridStep; x < rect.width; x += gridStep) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, rect.height); context.stroke(); }
    for (let y = ((viewport.y % gridStep) + gridStep) % gridStep; y < rect.height; y += gridStep) { context.beginPath(); context.moveTo(0, y); context.lineTo(rect.width, y); context.stroke(); }
    context.globalAlpha = 1; context.save(); context.translate(viewport.x, viewport.y); context.scale(viewport.scale, viewport.scale);
    context.lineWidth = 1.5 / viewport.scale; context.strokeStyle = hairline;
    for (const edge of edges) {
      const from = positions.get(edge.from); const to = positions.get(edge.to); if (!from || !to) continue;
      context.beginPath(); context.moveTo(from.x, from.y + NODE_HEIGHT / 2); context.bezierCurveTo(from.x, from.y + 106, to.x, to.y - 106, to.x, to.y - NODE_HEIGHT / 2); context.stroke();
      context.fillStyle = hairline; context.beginPath(); context.moveTo(to.x - 4, to.y - NODE_HEIGHT / 2 - 6); context.lineTo(to.x + 4, to.y - NODE_HEIGHT / 2 - 6); context.lineTo(to.x, to.y - NODE_HEIGHT / 2); context.fill();
    }
    for (const node of nodes) {
      const point = positions.get(node.id); if (!point) continue;
      const x = point.x - NODE_WIDTH / 2; const y = point.y - NODE_HEIGHT / 2; const isSelected = selected?.id === node.id; const isHovered = hoveredId === node.id;
      context.save(); context.shadowColor = "rgba(15, 23, 42, 0.14)"; context.shadowBlur = isSelected ? 20 : isHovered ? 14 : 8; context.shadowOffsetY = 4; context.fillStyle = node.pending ? warningSubtle : tint; context.strokeStyle = isSelected ? brand : node.pending ? warning : hairline; context.lineWidth = (isSelected ? 2.5 : 1) / viewport.scale; context.beginPath(); context.roundRect(x, y, NODE_WIDTH, NODE_HEIGHT, 12); context.fill(); context.stroke(); context.restore();
      context.fillStyle = node.pending ? warning : brand; context.beginPath(); context.arc(x + 18, y + 19, 5, 0, Math.PI * 2); context.fill();
      context.fillStyle = foreground; context.font = "600 13px var(--font-figtree), sans-serif"; context.fillText(shorten(node.label || "Unnamed invite", 25), x + 30, y + 24);
      context.fillStyle = muted; context.font = "11px var(--font-figtree), sans-serif"; context.fillText(node.pending ? "Awaiting acceptance" : `${node.credits ?? 0} invitations remaining`, x + 18, y + 47);
      context.fillStyle = node.pending ? warning : muted; context.font = "10px var(--font-inter), monospace"; context.fillText(shorten(node.email || "Personal invite link", 29), x + 18, y + 66);
    }
    context.restore(); context.fillStyle = brandMuted; context.strokeStyle = hairline; context.lineWidth = 1; context.beginPath(); context.roundRect(16, 16, 122, 28, 14); context.fill(); context.stroke(); context.fillStyle = brand; context.font = "600 11px var(--font-inter), sans-serif"; context.fillText(`${nodes.length} people · ${edges.length} links`, 28, 34);
  }, [edges, hoveredId, nodes, positions, selected, viewport]);

  useEffect(() => { draw(); const canvas = canvasRef.current; if (!canvas) return; const observer = new ResizeObserver(draw); observer.observe(canvas); return () => observer.disconnect(); }, [draw]);
  const pointAtEvent = (event: React.PointerEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const nodeAt = (screenPoint: Point) => { const world = { x: (screenPoint.x - viewport.x) / viewport.scale, y: (screenPoint.y - viewport.y) / viewport.scale }; return nodes.find((node) => { const point = positions.get(node.id); return point && Math.abs(world.x - point.x) <= NODE_WIDTH / 2 && Math.abs(world.y - point.y) <= NODE_HEIGHT / 2; }) ?? null; };
  function confirmDeleteAll() { startTransition(async () => { const result = await deleteAllInvites(); if (!result.ok) { toast.error(result.error ?? "That didn't work."); return; } toast.success(result.message ?? "Invitations deleted."); setConfirmOpen(false); setSelected(null); router.refresh(); }); }

  if (nodes.length === 0) return <div className="flex min-h-105 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-tint px-6 text-center"><Users className="size-6 text-brand" /><p className="mt-4 font-semibold text-foreground">The network is waiting for its first route.</p><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Send an invitation above and this map will trace every connection it creates.</p></div>;
  return <><section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-[0_18px_60px_rgb(15_23_42/0.08)]"><div className="flex flex-col gap-4 border-b border-hairline px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-success shadow-[0_0_0_4px_var(--success-subtle)]" /><p className="label text-brand">Live relationship map</p></div><h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Invitation trace</h2><p className="mt-1 text-sm text-muted-foreground">Each line records who brought whom into the network.</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-3 rounded-full border border-hairline bg-tint px-3 py-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-brand" /> Member</span><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-warning" /> Pending</span></div><Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmOpen(true)} disabled={pending}><Trash2 className="size-3.5" /> Delete all</Button></div></div><div className="relative bg-card"><canvas ref={canvasRef} className="h-[min(62vh,620px)] min-h-105 w-full touch-none cursor-grab active:cursor-grabbing" aria-label="Invitation trace map. Drag to pan, use the controls to zoom, and click a person to inspect their invitation status." onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { start: pointAtEvent(event), origin: { x: viewport.x, y: viewport.y }, moved: false }; }} onPointerMove={(event) => { const drag = dragRef.current; const point = pointAtEvent(event); if (!drag) { setHoveredId(nodeAt(point)?.id ?? null); return; } const dx = point.x - drag.start.x; const dy = point.y - drag.start.y; if (Math.hypot(dx, dy) > 3) drag.moved = true; setViewport((current) => ({ ...current, x: drag.origin.x + dx, y: drag.origin.y + dy })); }} onPointerUp={(event) => { const drag = dragRef.current; dragRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId); if (!drag?.moved) setSelected(nodeAt(pointAtEvent(event))); }} onPointerLeave={() => { if (!dragRef.current) setHoveredId(null); }} onWheel={(event) => { event.preventDefault(); const pointer = pointAtEvent(event); const factor = event.deltaY < 0 ? 1.12 : 0.88; setViewport((current) => { const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE); const worldX = (pointer.x - current.x) / current.scale; const worldY = (pointer.y - current.y) / current.scale; return { scale, x: pointer.x - worldX * scale, y: pointer.y - worldY * scale }; }); }} /><div className="absolute right-4 bottom-4 flex overflow-hidden rounded-lg border border-hairline bg-card shadow-lg"><MapButton label="Zoom out" onClick={() => setViewport((current) => ({ ...current, scale: clamp(current.scale / 1.2, MIN_SCALE, MAX_SCALE) }))}><Minus /></MapButton><span className="flex min-w-13 items-center justify-center border-x border-hairline text-[11px] font-semibold text-muted-foreground">{Math.round(viewport.scale * 100)}%</span><MapButton label="Zoom in" onClick={() => setViewport((current) => ({ ...current, scale: clamp(current.scale * 1.2, MIN_SCALE, MAX_SCALE) }))}><Plus /></MapButton><MapButton label="Fit map to view" onClick={fitViewport}><Maximize2 /></MapButton></div><div className="pointer-events-none absolute bottom-5 left-5 hidden items-center gap-2 rounded-full border border-hairline bg-card/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur sm:flex"><MousePointer2 className="size-3.5 text-brand" /> Drag to explore · Scroll to zoom</div></div><div className="flex min-h-16 items-center border-t border-hairline bg-tint px-5 py-3 sm:px-6">{selected ? <div className="flex min-w-0 flex-1 items-center gap-3"><span className={cn("size-2.5 shrink-0 rounded-full", selected.pending ? "bg-warning" : "bg-brand")} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{selected.label || "Unnamed invite"}</p><p className="truncate text-xs text-muted-foreground">{selected.email || "Personal invite link"} · {selected.pending ? "Awaiting acceptance" : `${selected.credits ?? 0} invitations remaining`}</p></div><Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(null)}>Clear</Button></div> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><MousePointer2 className="size-4" /> Select a node to inspect its invitation status.</p>}</div></section><AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete every invitation?</AlertDialogTitle><AlertDialogDescription>This permanently deletes all invite records — sent, pending, and accepted. Accounts created from past invites are not affected.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending} onClick={(event) => { event.preventDefault(); confirmDeleteAll(); }}>{pending ? "Deleting…" : "Delete all"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="tap flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-tint hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="[&_svg]:size-4">{children}</span></button>;
}

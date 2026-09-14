"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { reportContent } from "@/actions/reports";
import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason } from "@/lib/constants";

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "problem" | "solution" | "comment" | "user";
  targetId: string;
  targetLabel: string;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await reportContent({
        targetType,
        targetId,
        reason,
        details,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Report submitted.");
      onOpenChange(false);
      setDetails("");
      setReason("spam");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="size-4 text-muted-foreground" />
            Report this {targetLabel}
          </DialogTitle>
          <DialogDescription>
            Reports go to our moderators. Content is never removed on a single
            report alone.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={reason}
          onValueChange={(value) => setReason(value as ReportReason)}
          className="gap-0 divide-y divide-hairline rounded-lg border border-hairline"
        >
          {REPORT_REASONS.map((value) => (
            <Label
              key={value}
              htmlFor={`reason-${value}`}
              className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm font-normal transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted/60 has-data-[state=checked]:bg-brand-muted/50"
            >
              <RadioGroupItem value={value} id={`reason-${value}`} />
              {REPORT_REASON_LABELS[value]}
            </Label>
          ))}
        </RadioGroup>

        <div className="space-y-1.5">
          <Label htmlFor="report-details" className="text-xs text-muted-foreground">
            Anything else we should know? (optional)
          </Label>
          <Textarea
            id="report-details"
            value={details}
            onChange={(event) => setDetails(event.target.value.slice(0, 1000))}
            placeholder="Add context that helps a moderator decide."
            rows={3}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button size="lg" onClick={submit} disabled={pending}>
            {pending ? "Sending…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

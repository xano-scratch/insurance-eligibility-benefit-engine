import type { ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

export function DecisionBadge({ decision }: { decision: string }) {
  const eligible = decision === "eligible";
  return (
    <Badge
      className={cn(
        "gap-1 border-transparent text-sm",
        eligible ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400",
      )}
    >
      {eligible ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
      {eligible ? "Eligible" : "Not eligible"}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "suspended"
        ? "bg-amber-500/15 text-amber-400"
        : "bg-muted text-muted-foreground";
  return <Badge className={cn("border-transparent", tone)}>{titleCase(status)}</Badge>;
}

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

export function TierChip({
  tier,
}: {
  tier: { name: string | null; coverage_percent: number | null; annual_limit: number | null } | null;
}) {
  if (!tier || !tier.name) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium">{tier.name}</span>
      <span className="text-muted-foreground text-xs">
        {tier.coverage_percent}% · up to {tier.annual_limit?.toLocaleString()}/yr
      </span>
    </span>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      {children}
    </div>
  );
}

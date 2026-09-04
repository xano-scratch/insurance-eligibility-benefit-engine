import { useEffect, useState } from "react";
import { History, Loader2, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ErrorNote, Stat, TierChip } from "@/components/bits";
import { fmtDate, fmtDays, titleCase } from "@/lib/format";
import {
  getRuleDetail,
  getRulesList,
  type CatalogRow,
  type RuleDetail,
  type RuleListRow,
} from "@/lib/api";

export function RulesScreen({
  catalog,
  focusRuleId,
  isAdmin,
}: {
  catalog: CatalogRow[];
  focusRuleId: number | null;
  isAdmin: boolean;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<RuleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (focusRuleId) setSelectedId(focusRuleId);
  }, [focusRuleId]);

  useEffect(() => {
    if (selectedId === null && catalog.length > 0) setSelectedId(catalog[0].rule_id);
  }, [catalog, selectedId]);

  useEffect(() => {
    if (selectedId === null) return;
    let live = true;
    setError(null);
    getRuleDetail(selectedId)
      .then((d) => live && setDetail(d))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Failed to load."));
    return () => {
      live = false;
    };
  }, [selectedId]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Active benefit rules</CardTitle>
            <CardDescription>The version currently governing each plan and benefit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {catalog.map((r) => (
              <button
                key={r.rule_id}
                onClick={() => setSelectedId(r.rule_id)}
                className={cn(
                  "hover:bg-muted flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm transition",
                  selectedId === r.rule_id && "bg-muted",
                )}
              >
                <span className="font-medium">{r.benefit_code}</span>
                <span className="text-muted-foreground text-xs">
                  {r.plan_code} · v{r.version}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <div>
          {error && <ErrorNote>{error}</ErrorNote>}
          {detail && <RuleDetailCard detail={detail} />}
        </div>
      </div>

      <FullHistory isAdmin={isAdmin} />
    </div>
  );
}

function RuleDetailCard({ detail }: { detail: RuleDetail }) {
  const r = detail.rule;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{r.benefit_code}</CardTitle>
            <CardDescription>
              {r.plan_name} ({r.plan_code})
            </CardDescription>
          </div>
          <Badge className="border-transparent bg-emerald-500/15 text-emerald-400">
            v{r.version} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Requires status">{titleCase(r.requires_status)}</Stat>
          <Stat label="Min tenure">{fmtDays(r.min_tenure_days)}</Stat>
          <Stat label="Coverage tier">
            <TierChip tier={r.tier} />
          </Stat>
          <Stat label="Effective">{fmtDate(r.effective_from)}</Stat>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <History className="size-4" /> Version history
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Min tenure</TableHead>
                <TableHead>Coverage tier</TableHead>
                <TableHead>Effective</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.history.map((v) => (
                <TableRow key={v.rule_id} className={cn(!v.is_active && "text-muted-foreground")}>
                  <TableCell className="font-medium">v{v.version}</TableCell>
                  <TableCell>
                    {v.is_active ? (
                      <Badge className="border-transparent bg-emerald-500/15 text-emerald-400">Active</Badge>
                    ) : (
                      <Badge variant="outline">Superseded</Badge>
                    )}
                  </TableCell>
                  <TableCell>{fmtDays(v.min_tenure_days)}</TableCell>
                  <TableCell>
                    <TierChip tier={v.tier} />
                  </TableCell>
                  <TableCell>{fmtDate(v.effective_from)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function FullHistory({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<RuleListRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setRows(null);
      return;
    }
    let live = true;
    setLoading(true);
    setError(null);
    getRulesList()
      .then((d) => live && setRows(d))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [isAdmin]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          Full rule history
          <Badge variant="outline" className="gap-1 font-normal">
            <Lock className="size-3" /> benefits_admin
          </Badge>
        </CardTitle>
        <CardDescription>
          Every version across every plan, active and superseded. Gated at the API layer by role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isAdmin ? (
          <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
            <Lock className="size-4" /> Sign in as benefits_admin (on the Governance tab) to read the
            full cross-plan history.
          </p>
        ) : error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : loading || !rows ? (
          <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
            <Loader2 className="animate-spin size-4" /> Loading…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Benefit</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Min tenure</TableHead>
                <TableHead>Coverage tier</TableHead>
                <TableHead>Effective</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.rule_id} className={cn(!r.is_active && "text-muted-foreground")}>
                  <TableCell>{r.plan_code}</TableCell>
                  <TableCell className="font-medium">{r.benefit_code}</TableCell>
                  <TableCell>v{r.version}</TableCell>
                  <TableCell>
                    {r.is_active ? (
                      <Badge className="border-transparent bg-emerald-500/15 text-emerald-400">Active</Badge>
                    ) : (
                      <Badge variant="outline">Superseded</Badge>
                    )}
                  </TableCell>
                  <TableCell>{fmtDays(r.min_tenure_days)}</TableCell>
                  <TableCell>
                    <TierChip tier={r.tier} />
                  </TableCell>
                  <TableCell>{fmtDate(r.effective_from)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DecisionBadge, ErrorNote } from "@/components/bits";
import { fmtDateTime } from "@/lib/format";
import { getAudit, type AuditRow } from "@/lib/api";

const ANY = "__any__";

export function AuditScreen({ isAdmin, reloadSignal }: { isAdmin: boolean; reloadSignal: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [member, setMember] = useState("");
  const [benefit, setBenefit] = useState("");
  const [decision, setDecision] = useState<string>(ANY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    getAudit({
      member_number: member || undefined,
      benefit_code: benefit || undefined,
      decision: decision === ANY ? undefined : decision,
    })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, [isAdmin, member, benefit, decision]);

  useEffect(() => {
    load();
  }, [load, reloadSignal]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              Audit trail
              <Badge variant="outline" className="gap-1 font-normal">
                <Lock className="size-3" /> benefits_admin
              </Badge>
            </CardTitle>
            <CardDescription>
              Every decision, newest first, joined to the rule version and tier it used.
            </CardDescription>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAdmin ? (
          <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
            <Lock className="size-4" /> Sign in as benefits_admin (on the Governance tab) to read the
            decision log.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Member number</label>
                <Input
                  className="w-40"
                  placeholder="e.g. SHP-1001"
                  value={member}
                  onChange={(e) => setMember(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Benefit code</label>
                <Input
                  className="w-40"
                  placeholder="e.g. PHYSIO"
                  value={benefit}
                  onChange={(e) => setBenefit(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Decision</label>
                <Select value={decision} onValueChange={setDecision}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any</SelectItem>
                    <SelectItem value="eligible">Eligible</SelectItem>
                    <SelectItem value="not_eligible">Not eligible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={load} disabled={loading}>
                Apply filters
              </Button>
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Benefit</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground py-6 text-center text-sm">
                      No checks logged yet. Run a check on the Eligibility tab.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.check_id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {fmtDateTime(r.checked_at)}
                      </TableCell>
                      <TableCell className="font-medium">{r.member_number}</TableCell>
                      <TableCell>{r.benefit_code}</TableCell>
                      <TableCell>
                        <DecisionBadge decision={r.decision} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.rule_version ? `v${r.rule_version}` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.tier_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate" title={r.reason}>
                        {r.reason}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

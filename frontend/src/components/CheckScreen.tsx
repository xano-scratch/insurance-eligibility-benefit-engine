import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DecisionBadge, ErrorNote, Stat, StatusBadge, TierChip } from "@/components/bits";
import { fmtDate, fmtDateTime, fmtDays } from "@/lib/format";
import { runCheck, type CatalogRow, type CheckResult, type MemberRow } from "@/lib/api";

export function CheckScreen({
  members,
  catalog,
  onViewRule,
}: {
  members: MemberRow[];
  catalog: CatalogRow[];
  onViewRule: (ruleId: number) => void;
}) {
  const [memberNumber, setMemberNumber] = useState("");
  const [benefit, setBenefit] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didAutoRun = useRef(false);

  const selectedMember = members.find((m) => m.member_number === memberNumber);

  // Benefits available on the selected member's plan (distinct active codes).
  const benefits = useMemo(() => {
    if (!selectedMember) return [] as CatalogRow[];
    return catalog.filter((r) => r.plan_id === selectedMember.plan_id);
  }, [catalog, selectedMember]);

  async function run(mn: string, bc: string) {
    if (!mn || !bc) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await runCheck({ member_number: mn, benefit_code: bc }));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Pre-select a member + benefit and run one governed check on first load so
  // the environment opens on a real decision, not an empty form.
  useEffect(() => {
    if (didAutoRun.current || members.length === 0 || catalog.length === 0) return;
    didAutoRun.current = true;
    const m = members.find((x) => x.member_number === "SHP-1001") ?? members[0];
    const b = catalog.find((r) => r.plan_id === m.plan_id && r.benefit_code === "PHYSIO") ??
      catalog.find((r) => r.plan_id === m.plan_id);
    setMemberNumber(m.member_number);
    if (b) {
      setBenefit(b.benefit_code);
      void run(m.member_number, b.benefit_code);
    }
  }, [members, catalog]);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Run an eligibility check</CardTitle>
          <CardDescription>
            Pick a member and a benefit. One governed endpoint resolves the decision the same way for
            every calling system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Member</label>
            <Select
              value={memberNumber}
              onValueChange={(v) => {
                setMemberNumber(v);
                setBenefit("");
                setResult(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.member_number} value={m.member_number}>
                    {m.name} · {m.member_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMember && (
              <p className="text-muted-foreground text-xs">
                {selectedMember.plan_name} · <StatusInline status={selectedMember.status} /> ·{" "}
                {fmtDays(selectedMember.tenure_days)} enrolled
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Benefit</label>
            <Select value={benefit} onValueChange={setBenefit} disabled={!selectedMember}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedMember ? "Select a benefit" : "Pick a member first"} />
              </SelectTrigger>
              <SelectContent>
                {benefits.map((b) => (
                  <SelectItem key={b.rule_id} value={b.benefit_code}>
                    {b.benefit_code} (v{b.version})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={!memberNumber || !benefit || loading}
            onClick={() => run(memberNumber, benefit)}
          >
            {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Check eligibility
          </Button>
        </CardContent>
      </Card>

      <div>
        {error && <ErrorNote>{error}</ErrorNote>}
        {!error && !result && (
          <Card className="h-full">
            <CardContent className="text-muted-foreground flex h-full items-center justify-center py-16 text-sm">
              Run a check to see the governed decision.
            </CardContent>
          </Card>
        )}
        {result && <ResultCard result={result} onViewRule={onViewRule} />}
      </div>
    </div>
  );
}

function StatusInline({ status }: { status: string }) {
  return <span className="align-middle"><StatusBadge status={status} /></span>;
}

function ResultCard({
  result,
  onViewRule,
}: {
  result: CheckResult;
  onViewRule: (ruleId: number) => void;
}) {
  const hasRule = result.rule.id > 0;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">
              {result.member.name} · {result.benefit_code}
            </CardTitle>
            <CardDescription>{result.member.member_number}</CardDescription>
          </div>
          <DecisionBadge decision={result.decision} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-relaxed">{result.reason}</p>
        <Separator />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Stat label="Coverage tier">
            <TierChip tier={result.eligible ? result.coverage_tier : null} />
          </Stat>
          <Stat label="Member status">
            <StatusBadge status={result.member.status} />
          </Stat>
          <Stat label="Tenure">{fmtDays(result.tenure_days)}</Stat>
          <Stat label="Deciding rule">
            {hasRule ? (
              <button
                className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
                onClick={() => onViewRule(result.rule.id)}
              >
                v{result.rule.version} <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <span className="text-muted-foreground">No active rule</span>
            )}
          </Stat>
          <Stat label="Rule effective">{hasRule ? fmtDate(result.rule.effective_from) : "—"}</Stat>
          <Stat label="Logged at">{fmtDateTime(result.checked_at)}</Stat>
        </div>
        <div className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
          This decision was written to the audit log as check #{result.check_id}, tagged with rule
          {hasRule ? ` version ${result.rule.version}` : " (none)"}. The same answer is returned to
          every system that calls this endpoint.
        </div>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorNote, StatusBadge, TierChip } from "@/components/bits";
import { fmtDate, fmtDays } from "@/lib/format";
import { getEntitlements, type Entitlements, type MemberRow } from "@/lib/api";

export function EntitlementsScreen({ members }: { members: MemberRow[] }) {
  const [memberNumber, setMemberNumber] = useState("");
  const [data, setData] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberNumber) return;
    let live = true;
    setLoading(true);
    setError(null);
    getEntitlements(memberNumber)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [memberNumber]);

  useEffect(() => {
    if (!memberNumber && members.length > 0) setMemberNumber(members[0].member_number);
  }, [members, memberNumber]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Member entitlements</CardTitle>
          <CardDescription>
            Every benefit a member is covered for right now, run through the same status and tenure
            gates the check endpoint uses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-1.5">
            <label className="text-sm font-medium">Member</label>
            <Select value={memberNumber} onValueChange={setMemberNumber}>
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
          </div>
        </CardContent>
      </Card>

      {error && <ErrorNote>{error}</ErrorNote>}

      {data && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{data.member.name}</CardTitle>
                <CardDescription>
                  {data.member.member_number} · {fmtDays(data.tenure_days)} enrolled
                </CardDescription>
              </div>
              <StatusBadge status={data.member.status} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                <Loader2 className="animate-spin size-4" /> Loading…
              </div>
            ) : data.entitlements.length === 0 ? (
              <p className="text-muted-foreground py-6 text-sm">
                No active entitlements. This member does not currently pass the gates for any benefit
                on their plan.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Coverage tier</TableHead>
                    <TableHead>Min tenure</TableHead>
                    <TableHead>Effective</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entitlements.map((e) => (
                    <TableRow key={e.rule_id}>
                      <TableCell className="font-medium">{e.benefit_code}</TableCell>
                      <TableCell className="text-muted-foreground">v{e.version}</TableCell>
                      <TableCell>
                        <TierChip tier={e.tier} />
                      </TableCell>
                      <TableCell>{fmtDays(e.min_tenure_days)}</TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(e.effective_from)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

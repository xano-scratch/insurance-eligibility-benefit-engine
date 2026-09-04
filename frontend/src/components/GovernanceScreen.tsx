import { useState } from "react";
import { KeyRound, Loader2, LogOut, RotateCcw, ShieldAlert, ShieldCheck, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ErrorNote } from "@/components/bits";
import { probeAdminGate, type Me } from "@/lib/api";
import { titleCase } from "@/lib/format";

type Identity = Me["user"] | null;

export function GovernanceScreen({
  identity,
  busy,
  authError,
  onSignIn,
  onSignOut,
  onReset,
}: {
  identity: Identity;
  busy: boolean;
  authError: string | null;
  onSignIn: (role: "benefits_admin" | "read_only") => void;
  onSignOut: () => void;
  onReset: () => Promise<string>;
}) {
  const isAdmin = identity?.role === "benefits_admin";
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Who is calling</CardTitle>
          <CardDescription>
            Access is enforced at the API layer by role, not in the database. Switch identity and watch
            the admin screens and endpoints react.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/40 flex items-center justify-between rounded-md border px-4 py-3">
            <div>
              <div className="text-sm font-medium">
                {identity ? identity.name : "Guest (no token)"}
              </div>
              <div className="text-muted-foreground text-xs">
                {identity ? identity.email : "Unauthenticated requests carry no identity."}
              </div>
            </div>
            {identity ? (
              <Badge
                className={cn(
                  "border-transparent",
                  isAdmin ? "bg-primary/15 text-primary" : "bg-muted-foreground/15 text-foreground",
                )}
              >
                {titleCase(identity.role)}
              </Badge>
            ) : (
              <Badge variant="outline">Guest</Badge>
            )}
          </div>

          {authError && <ErrorNote>{authError}</ErrorNote>}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => onSignIn("benefits_admin")}>
              {busy ? <Loader2 className="animate-spin" /> : <UserCog />} Sign in as admin
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onSignIn("read_only")}>
              <KeyRound /> Sign in as read-only
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !identity} onClick={onSignOut}>
              <LogOut /> Sign out
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            Demo accounts: <code>admin@demo.test</code> and <code>viewer@demo.test</code>. Passwords
            are in the README. This is a throwaway environment.
          </p>

          <Separator />

          <ResetPanel isAdmin={isAdmin} onReset={onReset} />
        </CardContent>
      </Card>

      <GateProbe />
    </div>
  );
}

function ResetPanel({ isAdmin, onReset }: { isAdmin: boolean; onReset: () => Promise<string> }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Reset demo data</div>
      <p className="text-muted-foreground text-xs">
        An admin-only write: clears the decision log and reloads the reference tables.
      </p>
      <Button
        size="sm"
        variant="outline"
        disabled={!isAdmin || busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          setMsg(null);
          try {
            setMsg(await onReset());
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Reset failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} Reset demo data
      </Button>
      {!isAdmin && (
        <p className="text-muted-foreground text-xs">Sign in as admin to enable this write.</p>
      )}
      {msg && <p className="text-xs text-emerald-400">{msg}</p>}
      {err && <p className="text-xs text-rose-400">{err}</p>}
    </div>
  );
}

type ProbeResult = { anonymous: number; read_only: number; benefits_admin: number };

function GateProbe() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const rows: { label: string; role: keyof ProbeResult; expect: string }[] = [
    { label: "Anonymous (no token)", role: "anonymous", expect: "401 Unauthorized" },
    { label: "read_only", role: "read_only", expect: "403 Forbidden" },
    { label: "benefits_admin", role: "benefits_admin", expect: "200 OK" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access probe</CardTitle>
        <CardDescription>
          Calls one admin endpoint (the full rule history) under three identities and reports what the
          API returns. Proof the gate holds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              setResult(await probeAdminGate());
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Probe failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Run access probe
        </Button>

        {err && <ErrorNote>{err}</ErrorNote>}

        {result && (
          <div className="space-y-2">
            {rows.map((r) => {
              const status = result[r.role];
              const allowed = status >= 200 && status < 300;
              return (
                <div
                  key={r.role}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{r.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">expected {r.expect}</span>
                    <Badge
                      className={cn(
                        "border-transparent gap-1",
                        allowed ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400",
                      )}
                    >
                      {allowed ? <ShieldCheck className="size-3" /> : <ShieldAlert className="size-3" />}
                      {status} {allowed ? "Allowed" : "Blocked"}
                    </Badge>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

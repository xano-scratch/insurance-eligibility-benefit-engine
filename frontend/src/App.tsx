import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckScreen } from "@/components/CheckScreen";
import { EntitlementsScreen } from "@/components/EntitlementsScreen";
import { RulesScreen } from "@/components/RulesScreen";
import { AuditScreen } from "@/components/AuditScreen";
import { GovernanceScreen } from "@/components/GovernanceScreen";
import { ErrorNote } from "@/components/bits";
import { titleCase } from "@/lib/format";
import {
  DEMO_ACCOUNTS,
  getCatalog,
  getMe,
  getMembers,
  login,
  resetDemo,
  setToken,
  type CatalogRow,
  type MemberRow,
  type Me,
} from "@/lib/api";

type Identity = Me["user"] | null;

export default function App() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [identity, setIdentity] = useState<Identity>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [tab, setTab] = useState("check");
  const [focusRuleId, setFocusRuleId] = useState<number | null>(null);
  const [auditReload, setAuditReload] = useState(0);

  const isAdmin = identity?.role === "benefits_admin";

  const signIn = useCallback(async (role: "benefits_admin" | "read_only") => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await login(DEMO_ACCOUNTS[role]);
      setToken(res.token);
      const me = await getMe();
      setIdentity(me.user);
      setAuditReload((n) => n + 1);
    } catch (e) {
      setToken(null);
      setIdentity(null);
      setAuthError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setIdentity(null);
    setAuthError(null);
    setAuditReload((n) => n + 1);
  }, []);

  const reset = useCallback(async () => {
    const res = await resetDemo();
    setAuditReload((n) => n + 1);
    return res.message;
  }, []);

  const viewRule = useCallback((ruleId: number) => {
    setFocusRuleId(ruleId);
    setTab("rules");
  }, []);

  // Load public reference data, then auto sign-in as admin so the governance
  // screens are populated for a reviewer. The core screens work either way.
  useEffect(() => {
    Promise.all([getMembers(), getCatalog()])
      .then(([m, c]) => {
        setMembers(m);
        setCatalog(c);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to reach the backend."));
    void signIn("benefits_admin");
  }, [signIn]);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Insurance Eligibility & Benefit Engine</h1>
              <p className="text-muted-foreground text-sm">
                One governed API that decides eligibility the same way for every system.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              Play 1 · Business Logic Centralization
            </Badge>
            {identity ? (
              <Badge className="bg-primary/15 text-primary border-transparent">
                {titleCase(identity.role)}
              </Badge>
            ) : (
              <Badge variant="outline">Guest</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {loadError && (
          <div className="mb-6">
            <ErrorNote>
              Could not reach the backend ({loadError}). If you are running locally, set
              VITE_XANO_HOST in a .env.local file.
            </ErrorNote>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="check">Eligibility check</TabsTrigger>
            <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
            <TabsTrigger value="rules">Benefit rules</TabsTrigger>
            <TabsTrigger value="audit">Audit trail</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
          </TabsList>

          <TabsContent value="check">
            <CheckScreen members={members} catalog={catalog} onViewRule={viewRule} />
          </TabsContent>
          <TabsContent value="entitlements">
            <EntitlementsScreen members={members} />
          </TabsContent>
          <TabsContent value="rules">
            <RulesScreen catalog={catalog} focusRuleId={focusRuleId} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditScreen isAdmin={isAdmin} reloadSignal={auditReload} />
          </TabsContent>
          <TabsContent value="governance">
            <GovernanceScreen
              identity={identity}
              busy={authBusy}
              authError={authError}
              onSignIn={signIn}
              onSignOut={signOut}
              onReset={reset}
            />
          </TabsContent>
        </Tabs>

        <footer className="text-muted-foreground mt-12 border-t pt-6 text-xs">
          Built with XanoTS. The eligibility logic lives in one versioned, auditable API layer. Access
          is controlled at the API layer by role (not row-level security). Seeded demo data on a
          throwaway environment.
        </footer>
      </main>
    </div>
  );
}

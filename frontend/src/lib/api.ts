// The one contract. Every path and every request/response type below is derived
// from the xanots query defs in ../../../xano — never hand-typed. Change a def
// and the frontend follows (or fails to compile). Response shapes come from each
// def's `responseShape`, so `InferResponse` resolves them fully.

import type { InferInput, InferResponse } from "@xanots/sdk";

import { checkQuery } from "../../../xano/api/check.js";
import { entitlementsQuery } from "../../../xano/api/entitlements.js";
import { membersQuery } from "../../../xano/api/members.js";
import { catalogQuery } from "../../../xano/api/catalog.js";
import { ruleDetailQuery } from "../../../xano/api/rules-detail.js";
import { rulesListQuery } from "../../../xano/api/rules-list.js";
import { auditChecksQuery } from "../../../xano/api/audit-checks.js";
import { seedResetQuery } from "../../../xano/api/seed-reset.js";
import { loginQuery } from "../../../xano/api/auth-login.js";
import { meQuery } from "../../../xano/api/auth-me.js";

/** The deployed backend URL, injected by `xanots deploy --static`, or from env in dev. */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Derived types ────────────────────────────────────────────────────────────
export type CheckInput = InferInput<typeof checkQuery>;
export type CheckResult = InferResponse<typeof checkQuery>;
export type Entitlements = InferResponse<typeof entitlementsQuery>;
export type MemberRow = InferResponse<typeof membersQuery>[number];
export type CatalogRow = InferResponse<typeof catalogQuery>[number];
export type RuleDetail = InferResponse<typeof ruleDetailQuery>;
export type RuleListRow = InferResponse<typeof rulesListQuery>[number];
export type AuditRow = InferResponse<typeof auditChecksQuery>[number];
export type AuditFilters = InferInput<typeof auditChecksQuery>;
export type ResetResult = InferResponse<typeof seedResetQuery>;
export type LoginInput = InferInput<typeof loginQuery>;
export type LoginResult = InferResponse<typeof loginQuery>;
export type Me = InferResponse<typeof meQuery>;

// ── Bearer token (held in memory; RBAC is enforced server-side) ──────────────
let authToken: string | null = null;
export function setToken(t: string | null): void {
  authToken = t;
}
export function getToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  opts: { method: string; body?: unknown; auth?: boolean } = { method: "GET" },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.auth && authToken) headers["authorization"] = `Bearer ${authToken}`;
  const res = await fetch(XANO_HOST + path, {
    method: opts.method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

// ── Typed endpoint calls ─────────────────────────────────────────────────────
export function runCheck(body: CheckInput): Promise<CheckResult> {
  return request(checkQuery.getPath(), { method: checkQuery.verb, body });
}

export function getEntitlements(memberNumber: string): Promise<Entitlements> {
  return request(entitlementsQuery.getPath({ params: { member_number: memberNumber } }), {
    method: entitlementsQuery.verb,
  });
}

export function getMembers(): Promise<MemberRow[]> {
  return request(membersQuery.getPath(), { method: membersQuery.verb });
}

export function getCatalog(): Promise<CatalogRow[]> {
  return request(catalogQuery.getPath(), { method: catalogQuery.verb });
}

export function getRuleDetail(ruleId: number): Promise<RuleDetail> {
  return request(ruleDetailQuery.getPath({ params: { benefit_rule_id: String(ruleId) } }), {
    method: ruleDetailQuery.verb,
  });
}

export function getRulesList(): Promise<RuleListRow[]> {
  return request(rulesListQuery.getPath(), { method: rulesListQuery.verb, auth: true });
}

export function getAudit(filters: AuditFilters = {}): Promise<AuditRow[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) qs.set(k, String(v));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(auditChecksQuery.getPath() + suffix, { method: auditChecksQuery.verb, auth: true });
}

export function resetDemo(): Promise<ResetResult> {
  return request(seedResetQuery.getPath(), { method: seedResetQuery.verb, body: {}, auth: true });
}

export function login(body: LoginInput): Promise<LoginResult> {
  return request(loginQuery.getPath(), { method: loginQuery.verb, body });
}

export function getMe(): Promise<Me> {
  return request(meQuery.getPath(), { method: meQuery.verb, auth: true });
}

// The two seeded demo accounts (a throwaway environment; see the README).
export const DEMO_ACCOUNTS = {
  benefits_admin: { email: "admin@demo.test", password: "admin-demo-2026" },
  read_only: { email: "viewer@demo.test", password: "viewer-demo-2026" },
} as const;

// Self-contained RBAC proof: call one admin endpoint under three identities and
// report the HTTP status each gets. Uses its own tokens, so it does not disturb
// the app's current session.
export async function probeAdminGate(): Promise<{
  anonymous: number;
  read_only: number;
  benefits_admin: number;
}> {
  const path = rulesListQuery.getPath();
  const probe = async (token: string | null): Promise<number> => {
    const res = await fetch(XANO_HOST + path, {
      method: "GET",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    return res.status;
  };
  const anonymous = await probe(null);
  const ro = await login(DEMO_ACCOUNTS.read_only);
  const read_only = await probe(ro.token);
  const ad = await login(DEMO_ACCOUNTS.benefits_admin);
  const benefits_admin = await probe(ad.token);
  return { anonymous, read_only, benefits_admin };
}

// Canonical demo data for the Insurance Eligibility & Benefit Engine.
//
// Authored ONCE here and shared two ways:
//   • each table imports its slice for `table({ seed })`, so a fresh `xanots
//     deploy` ships a browsable environment with no endpoint call needed;
//   • the admin-gated `seed/reset` endpoint re-applies the reference tables from
//     the same rows (as plain JSON), so a reviewer can restore the demo state.
//
// `id`s are PINNED so the foreign keys line up deterministically across tables
// (a member's `plan_id`, a rule's `coverage_tier_id`). Seeding is the one place
// Xano preserves an explicit `id` (see fields.md). Dates are epoch-ms via a
// fixed `Date.UTC(...)` so the seed is deterministic; tenure is measured against
// the request-time clock, so a member enrolled years ago clears a tenure gate a
// recent enrollee does not.
//
// Never put a real secret in seed data. The two staff passwords below are demo
// fixtures for a throwaway environment and are hashed on write by the password
// column, exactly as a signed-up credential would be.

const day = (y: number, m: number, d: number): number => Date.UTC(y, m - 1, d);

export const PLANS = [
  { id: 1, plan_code: "SHP", name: "Standard Health Plan", description: "Core medical, dental, and mental health coverage for individual members." },
  { id: 2, plan_code: "PCP", name: "Premium Care Plan", description: "Enhanced coverage with day-one physiotherapy and vision benefits." },
] as const;

export const COVERAGE_TIERS = [
  { id: 1, name: "Standard", coverage_percent: 60, annual_limit: 1000, notes: "Base reimbursement level." },
  { id: 2, name: "Enhanced", coverage_percent: 80, annual_limit: 3000, notes: "Mid reimbursement level with a higher annual cap." },
  { id: 3, name: "Premium", coverage_percent: 100, annual_limit: 10000, notes: "Full reimbursement with the highest annual cap." },
] as const;

export const MEMBERS = [
  { id: 1, first_name: "Ava", last_name: "Chen", member_number: "SHP-1001", plan_id: 1, status: "active", enrolled_on: day(2021, 6, 15) },
  { id: 2, first_name: "Ben", last_name: "Ortiz", member_number: "SHP-1002", plan_id: 1, status: "active", enrolled_on: day(2026, 5, 27) },
  { id: 3, first_name: "Cara", last_name: "Silva", member_number: "PCP-2001", plan_id: 2, status: "suspended", enrolled_on: day(2019, 1, 10) },
  { id: 4, first_name: "Dan", last_name: "Whitfield", member_number: "PCP-2002", plan_id: 2, status: "active", enrolled_on: day(2023, 3, 1) },
  { id: 5, first_name: "Erin", last_name: "Park", member_number: "SHP-1003", plan_id: 1, status: "terminated", enrolled_on: day(2020, 4, 1) },
] as const;

// Versioned rules. Only one version per (plan, benefit) is `is_active`; the rest
// are history. Rules 1 and 4 are superseded (an older version kept for audit).
export const BENEFIT_RULES = [
  { id: 1, benefit_code: "PHYSIO", plan_id: 1, version: 1, is_active: false, min_tenure_days: 180, requires_status: "active", coverage_tier_id: 1, effective_from: day(2022, 1, 1) },
  { id: 2, benefit_code: "PHYSIO", plan_id: 1, version: 2, is_active: true, min_tenure_days: 90, requires_status: "active", coverage_tier_id: 2, effective_from: day(2024, 1, 1) },
  { id: 3, benefit_code: "DENTAL_MAJOR", plan_id: 1, version: 1, is_active: true, min_tenure_days: 365, requires_status: "active", coverage_tier_id: 2, effective_from: day(2023, 6, 1) },
  { id: 4, benefit_code: "MENTAL_HEALTH", plan_id: 1, version: 1, is_active: false, min_tenure_days: 730, requires_status: "active", coverage_tier_id: 1, effective_from: day(2021, 1, 1) },
  { id: 5, benefit_code: "MENTAL_HEALTH", plan_id: 1, version: 2, is_active: true, min_tenure_days: 180, requires_status: "active", coverage_tier_id: 2, effective_from: day(2024, 6, 1) },
  { id: 6, benefit_code: "PHYSIO", plan_id: 2, version: 1, is_active: true, min_tenure_days: 0, requires_status: "active", coverage_tier_id: 3, effective_from: day(2023, 1, 1) },
  { id: 7, benefit_code: "VISION", plan_id: 2, version: 1, is_active: true, min_tenure_days: 30, requires_status: "active", coverage_tier_id: 2, effective_from: day(2023, 1, 1) },
] as const;

export const STAFF = [
  { id: 1, email: "admin@demo.test", password: "admin-demo-2026", name: "Alex Admin", role: "benefits_admin" },
  { id: 2, email: "viewer@demo.test", password: "viewer-demo-2026", name: "Val Viewer", role: "read_only" },
] as const;

// Plain-JSON views for the reset endpoint's `c.array(...)` re-seed. `bulk.add`
// with `allowIdField` honors the pinned ids. The `JsonRow` return annotation
// keeps them assignable to the SDK's `Json[]` argument type.
type JsonRow = Record<string, string | number | boolean>;
export const PLANS_JSON: JsonRow[] = PLANS.map((r): JsonRow => ({ ...r }));
export const COVERAGE_TIERS_JSON: JsonRow[] = COVERAGE_TIERS.map((r): JsonRow => ({ ...r }));
export const MEMBERS_JSON: JsonRow[] = MEMBERS.map((r): JsonRow => ({ ...r }));
export const BENEFIT_RULES_JSON: JsonRow[] = BENEFIT_RULES.map((r): JsonRow => ({ ...r }));

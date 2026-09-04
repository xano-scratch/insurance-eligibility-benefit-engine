import { query, s, c, ref } from "@xanots/sdk";
import { seedApi } from "./groups.js";
import { staff } from "../tables/staff.js";
import { adminGuard } from "./_guards.js";
import { plans } from "../tables/plans.js";
import { coverageTiers } from "../tables/coverage-tiers.js";
import { members } from "../tables/members.js";
import { benefitRules } from "../tables/benefit-rules.js";
import { eligibilityChecks } from "../tables/eligibility-checks.js";
import { PLANS_JSON, COVERAGE_TIERS_JSON, MEMBERS_JSON, BENEFIT_RULES_JSON } from "../seed-data.js";

// Admin-gated demo reset. Clears the decision log and reloads the reference
// tables from the same seed rows, restoring the environment to a clean, known
// state. This is a governed WRITE, so it sits behind the benefits_admin role:
// a read_only token gets 403 and no token gets 401, without any row ever
// leaving the API layer (this is API-layer RBAC, not row-level security).
export const seedResetQuery = query({
  name: "reset",
  verb: "POST",
  apiGroup: seedApi,
  auth: staff,
  stack: [
    ...adminGuard(),
    // Truncate with a sequence reset so the pinned ids line up again.
    s.db.truncate({ table: eligibilityChecks, reset: true }),
    s.db.truncate({ table: benefitRules, reset: true }),
    s.db.truncate({ table: members, reset: true }),
    s.db.truncate({ table: coverageTiers, reset: true }),
    s.db.truncate({ table: plans, reset: true }),
    // Reload the reference rows with their pinned ids intact.
    s.db.bulk.add({ table: plans, items: c.array(PLANS_JSON), allowIdField: true }),
    s.db.bulk.add({ table: coverageTiers, items: c.array(COVERAGE_TIERS_JSON), allowIdField: true }),
    s.db.bulk.add({ table: members, items: c.array(MEMBERS_JSON), allowIdField: true }),
    s.db.bulk.add({ table: benefitRules, items: c.array(BENEFIT_RULES_JSON), allowIdField: true }),
    s.db.query({ table: benefitRules, returnType: "count", as: "rule_count" }),
  ],
  response: {
    ok: c.bool(true),
    message: c.text("Demo data restored: the decision log was cleared and the reference tables were reloaded."),
    rule_count: ref("rule_count"),
  },
  responseShape: null as unknown as { ok: boolean; message: string; rule_count: number },
});

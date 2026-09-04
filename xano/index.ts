import { workspace } from "@xanots/sdk";

// Tables
import { plans } from "./tables/plans.js";
import { coverageTiers } from "./tables/coverage-tiers.js";
import { members } from "./tables/members.js";
import { benefitRules } from "./tables/benefit-rules.js";
import { eligibilityChecks } from "./tables/eligibility-checks.js";
import { staff } from "./tables/staff.js";

// API groups
import { eligibilityApi, rulesApi, auditApi, seedApi, authApi } from "./api/groups.js";

// Endpoints
import { checkQuery } from "./api/check.js";
import { entitlementsQuery } from "./api/entitlements.js";
import { membersQuery } from "./api/members.js";
import { catalogQuery } from "./api/catalog.js";
import { ruleDetailQuery } from "./api/rules-detail.js";
import { rulesListQuery } from "./api/rules-list.js";
import { auditChecksQuery } from "./api/audit-checks.js";
import { seedResetQuery } from "./api/seed-reset.js";
import { loginQuery } from "./api/auth-login.js";
import { meQuery } from "./api/auth-me.js";

/**
 * Insurance Eligibility & Benefit Engine.
 *
 * One governed API that an insurer's claims tools and member portals all call to
 * answer the same question the same way: is this member eligible for this
 * benefit, at what coverage tier, and which plan rule version decided it. The
 * plan eligibility logic lives here, in one versioned, auditable layer, instead
 * of being re-encoded in every front-end system.
 */
export default workspace("insurance-eligibility-benefit-engine")
  .registerTables([plans, coverageTiers, members, benefitRules, eligibilityChecks, staff])
  .registerApiGroups([eligibilityApi, rulesApi, auditApi, seedApi, authApi])
  .registerQueries([
    checkQuery,
    entitlementsQuery,
    membersQuery,
    catalogQuery,
    ruleDetailQuery,
    rulesListQuery,
    auditChecksQuery,
    seedResetQuery,
    loginQuery,
    meQuery,
  ]);

import { table, f } from "@xanots/sdk";
import { members } from "./members.js";
import { benefitRules } from "./benefit-rules.js";
import { coverageTiers } from "./coverage-tiers.js";

// The audit log. Every eligibility check writes one row here, recording the
// decision AND the exact rule version that made it. That is what makes a past
// decision replayable: an auditor reads the row, follows `benefit_rule_id` to
// the version that fired, and sees why the answer came out the way it did.
//
// `benefit_rule_id` / `coverage_tier_id` use a `0` sentinel (default 0) rather
// than a nullable FK, because a checked benefit with no active rule has no rule
// or tier to point at, and Xano treats an optional FK as a `0` int, not null.
export const eligibilityChecks = table({
  name: "eligibility_checks",
  schema: {
    member_id: f.tableRef(members, { required: true }),
    // Denormalized from the member at check time, so the audit log filters by
    // member without a join and stays readable if a member is later renamed.
    member_number: f.text({ required: true }),
    benefit_code: f.text({ required: true }),
    decision: f.enum(["eligible", "not_eligible"], { required: true }),
    reason: f.text({ required: true }),
    benefit_rule_id: f.tableRef(benefitRules, { required: true, default: 0 }),
    coverage_tier_id: f.tableRef(coverageTiers, { required: true, default: 0 }),
    checked_by: f.text({ required: true }),
    checked_at: f.timestamp({ required: true }),
  },
});

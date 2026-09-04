import { query, input, s, c, ref, inp, col, cmp, withFilters, fl, obj } from "@xanots/sdk";
import { auditApi } from "./groups.js";
import { staff } from "../tables/staff.js";
import { adminGuard } from "./_guards.js";
import { eligibilityChecks } from "../tables/eligibility-checks.js";
import { benefitRules } from "../tables/benefit-rules.js";
import { coverageTiers } from "../tables/coverage-tiers.js";

// The decision log, newest first, joined back to the rule version and tier each
// check used. Filterable by member, benefit, or decision. Admin only: the audit
// trail is a governance surface, so it sits behind the benefits_admin role.
// Each filter is dropped when empty (`ignoreEmpty`), so no filter returns all.
export type AuditRow = {
  check_id: number;
  member_number: string;
  benefit_code: string;
  decision: string;
  reason: string;
  rule_id: number;
  rule_version: number | null;
  tier_name: string | null;
  checked_by: string;
  checked_at: number;
};

export const auditChecksQuery = query({
  name: "checks",
  verb: "GET",
  apiGroup: auditApi,
  auth: staff,
  input: {
    member_number: input.text({ required: false }),
    benefit_code: input.text({ required: false }),
    decision: input.text({ required: false }),
  },
  stack: [
    ...adminGuard(),
    s.db.query({
      table: eligibilityChecks,
      where: [
        cmp(col("member_number"), "=", inp("member_number"), { ignoreEmpty: true }),
        cmp(col("benefit_code"), "=", inp("benefit_code"), { ignoreEmpty: true }),
        cmp(col("decision"), "=", inp("decision"), { ignoreEmpty: true }),
      ],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
    s.set_var("out", c.array([])),
    s.set_var("item", c.obj()),
    s.foreach({
      as: "chk",
      list: ref("rows"),
      body: [
        s.db.get({ table: benefitRules, fieldName: "id", fieldValue: ref("chk.benefit_rule_id"), as: "rule" }),
        s.db.get({ table: coverageTiers, fieldName: "id", fieldValue: ref("chk.coverage_tier_id"), as: "tier" }),
        s.update_var(
          "item",
          obj({
            check_id: ref("chk.id"),
            member_number: ref("chk.member_number"),
            benefit_code: ref("chk.benefit_code"),
            decision: ref("chk.decision"),
            reason: ref("chk.reason"),
            rule_id: ref("chk.benefit_rule_id"),
            rule_version: ref("rule.version", { safe: true }),
            tier_name: ref("tier.name", { safe: true }),
            checked_by: ref("chk.checked_by"),
            checked_at: ref("chk.checked_at"),
          }),
        ),
        s.update_var("out", withFilters(ref("out"), fl.array_push(ref("item")))),
      ],
    }),
  ],
  response: ref("out"),
  responseShape: null as unknown as AuditRow[],
});

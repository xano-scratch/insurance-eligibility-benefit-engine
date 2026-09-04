import { query, input, s, c, ref, inp, col, expr, withFilters, fl, obj } from "@xanots/sdk";
import { eligibilityApi } from "./groups.js";
import { members } from "../tables/members.js";
import { benefitRules } from "../tables/benefit-rules.js";
import { coverageTiers } from "../tables/coverage-tiers.js";

// "What is this member covered for right now." Composed from the SAME gate logic
// the check endpoint uses, but expressed as filters: the query returns exactly
// the active rules on the member's plan that pass both the status gate (a rule's
// `requires_status` equals the member's status) and the tenure gate
// (`min_tenure_days` at or below the member's days enrolled). A suspended or
// short-tenure member simply matches fewer rows.
export type Entitlements = {
  member: { member_number: string; name: string; status: string; plan_id: number };
  tenure_days: number;
  entitlements: Array<{
    benefit_code: string;
    version: number;
    rule_id: number;
    min_tenure_days: number;
    effective_from: number;
    tier: { name: string | null; coverage_percent: number | null; annual_limit: number | null };
  }>;
};

export const entitlementsQuery = query({
  name: "entitlements/{member_number}",
  verb: "GET",
  apiGroup: eligibilityApi,
  input: { member_number: input.text({ required: true }) },
  stack: [
    s.db.get({ table: members, fieldName: "member_number", fieldValue: inp("member_number"), as: "member" }),
    s.precondition({
      expr: expr(ref("member", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No member found with that member number."),
    }),

    s.set_var("now_day", withFilters(c.now(), fl.to_epoch_day())),
    s.set_var("enrolled_day", withFilters(ref("member.enrolled_on"), fl.to_epoch_day())),
    s.set_var("tenure_days", withFilters(ref("now_day"), fl.sub(ref("enrolled_day")))),

    // Active rules on the plan the member passes: both gates as WHERE terms.
    s.db.query({
      table: benefitRules,
      where: [
        expr(col("plan_id"), "=", ref("member.plan_id")),
        expr(col("is_active"), "=", c.bool(true)),
        expr(col("requires_status"), "=", ref("member.status")),
        expr(col("min_tenure_days"), "<=", ref("tenure_days")),
      ],
      sort: [{ sortBy: "benefit_code", dir: "asc" }],
      as: "rows",
    }),

    // Enrich each with its coverage tier.
    s.set_var("out", c.array([])),
    s.set_var("item", c.obj()),
    s.foreach({
      as: "r",
      list: ref("rows"),
      body: [
        s.db.get({ table: coverageTiers, fieldName: "id", fieldValue: ref("r.coverage_tier_id"), as: "tier" }),
        s.update_var(
          "item",
          obj({
            benefit_code: ref("r.benefit_code"),
            version: ref("r.version"),
            rule_id: ref("r.id"),
            min_tenure_days: ref("r.min_tenure_days"),
            effective_from: ref("r.effective_from"),
            tier: {
              name: ref("tier.name", { safe: true }),
              coverage_percent: ref("tier.coverage_percent", { safe: true }),
              annual_limit: ref("tier.annual_limit", { safe: true }),
            },
          }),
        ),
        s.update_var("out", withFilters(ref("out"), fl.array_push(ref("item")))),
      ],
    }),
  ],
  response: {
    member: obj({
      member_number: ref("member.member_number"),
      name: withFilters(ref("member.first_name"), fl.concat(c.text(" ")), fl.concat(ref("member.last_name"))),
      status: ref("member.status"),
      plan_id: ref("member.plan_id"),
    }),
    tenure_days: ref("tenure_days"),
    entitlements: ref("out"),
  },
  responseShape: null as unknown as Entitlements,
});

import { query, s, c, ref, col, expr, withFilters, fl, obj } from "@xanots/sdk";
import { eligibilityApi } from "./groups.js";
import { benefitRules } from "../tables/benefit-rules.js";
import { plans } from "../tables/plans.js";
import { coverageTiers } from "../tables/coverage-tiers.js";

// The active benefit catalog: every currently-active rule with its plan and
// tier. The check screen reads this to offer the benefits a member's plan
// actually covers, and it doubles as a public, readable view of the governed
// rules (the "one place the logic lives" made browsable).
export type CatalogRow = {
  rule_id: number;
  benefit_code: string;
  plan_id: number;
  plan_code: string | null;
  plan_name: string | null;
  version: number;
  min_tenure_days: number;
  requires_status: string;
  effective_from: number;
  tier: { name: string | null; coverage_percent: number | null; annual_limit: number | null };
};

export const catalogQuery = query({
  name: "catalog",
  verb: "GET",
  apiGroup: eligibilityApi,
  stack: [
    s.db.query({
      table: benefitRules,
      where: [expr(col("is_active"), "=", c.bool(true))],
      sort: [{ sortBy: "benefit_code", dir: "asc" }],
      as: "rows",
    }),
    s.set_var("out", c.array([])),
    s.set_var("item", c.obj()),
    s.foreach({
      as: "r",
      list: ref("rows"),
      body: [
        s.db.get({ table: plans, fieldName: "id", fieldValue: ref("r.plan_id"), as: "plan" }),
        s.db.get({ table: coverageTiers, fieldName: "id", fieldValue: ref("r.coverage_tier_id"), as: "tier" }),
        s.update_var(
          "item",
          obj({
            rule_id: ref("r.id"),
            benefit_code: ref("r.benefit_code"),
            plan_id: ref("r.plan_id"),
            plan_code: ref("plan.plan_code", { safe: true }),
            plan_name: ref("plan.name", { safe: true }),
            version: ref("r.version"),
            min_tenure_days: ref("r.min_tenure_days"),
            requires_status: ref("r.requires_status"),
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
  response: ref("out"),
  responseShape: null as unknown as CatalogRow[],
});

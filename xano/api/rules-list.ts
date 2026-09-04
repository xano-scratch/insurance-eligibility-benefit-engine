import { query, s, c, ref, withFilters, fl, obj } from "@xanots/sdk";
import { rulesApi } from "./groups.js";
import { staff } from "../tables/staff.js";
import { adminGuard } from "./_guards.js";
import { benefitRules } from "../tables/benefit-rules.js";
import { plans } from "../tables/plans.js";
import { coverageTiers } from "../tables/coverage-tiers.js";

// The full rule history across every plan, active and superseded. Admin only:
// this is the governance view an accountable reviewer reads to audit ALL the
// versioned logic at once, so it sits behind the benefits_admin role.
export type RuleListRow = {
  rule_id: number;
  benefit_code: string;
  plan_id: number;
  plan_code: string | null;
  plan_name: string | null;
  version: number;
  is_active: boolean;
  min_tenure_days: number;
  requires_status: string;
  effective_from: number;
  tier: { name: string | null; coverage_percent: number | null; annual_limit: number | null };
};

export const rulesListQuery = query({
  name: "list",
  verb: "GET",
  apiGroup: rulesApi,
  auth: staff,
  stack: [
    ...adminGuard(),
    s.db.query({
      table: benefitRules,
      sort: [
        { sortBy: "plan_id", dir: "asc" },
        { sortBy: "benefit_code", dir: "asc" },
        { sortBy: "version", dir: "desc" },
      ],
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
            is_active: ref("r.is_active"),
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
  responseShape: null as unknown as RuleListRow[],
});

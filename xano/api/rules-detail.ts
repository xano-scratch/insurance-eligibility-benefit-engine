import { query, input, s, c, ref, inp, col, expr, withFilters, fl, obj } from "@xanots/sdk";
import { rulesApi } from "./groups.js";
import { benefitRules } from "../tables/benefit-rules.js";
import { plans } from "../tables/plans.js";
import { coverageTiers } from "../tables/coverage-tiers.js";

// One rule plus the full version history for its (plan, benefit). This is how an
// auditor answers "why did this decision come out the way it did": read the
// deciding version, then see every version before and after it, including the
// superseded ones. Public, so a reviewer can inspect the governed logic.
type Version = {
  rule_id: number;
  version: number;
  is_active: boolean;
  min_tenure_days: number;
  requires_status: string;
  effective_from: number;
  tier: { name: string | null; coverage_percent: number | null; annual_limit: number | null };
};
export type RuleDetail = {
  rule: {
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
  history: Version[];
};

export const ruleDetailQuery = query({
  name: "detail/{benefit_rule_id}",
  verb: "GET",
  apiGroup: rulesApi,
  input: { benefit_rule_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: benefitRules, fieldName: "id", fieldValue: inp("benefit_rule_id"), as: "rule" }),
    s.precondition({
      expr: expr(ref("rule", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No benefit rule with that id."),
    }),
    s.db.get({ table: plans, fieldName: "id", fieldValue: ref("rule.plan_id"), as: "plan" }),
    s.db.get({ table: coverageTiers, fieldName: "id", fieldValue: ref("rule.coverage_tier_id"), as: "ruletier" }),

    // Every version for this (plan, benefit), newest first.
    s.db.query({
      table: benefitRules,
      where: [
        expr(col("plan_id"), "=", ref("rule.plan_id")),
        expr(col("benefit_code"), "=", ref("rule.benefit_code")),
      ],
      sort: [{ sortBy: "version", dir: "desc" }],
      as: "rows",
    }),
    s.set_var("out", c.array([])),
    s.set_var("item", c.obj()),
    s.foreach({
      as: "v",
      list: ref("rows"),
      body: [
        s.db.get({ table: coverageTiers, fieldName: "id", fieldValue: ref("v.coverage_tier_id"), as: "tier" }),
        s.update_var(
          "item",
          obj({
            rule_id: ref("v.id"),
            version: ref("v.version"),
            is_active: ref("v.is_active"),
            min_tenure_days: ref("v.min_tenure_days"),
            requires_status: ref("v.requires_status"),
            effective_from: ref("v.effective_from"),
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
    rule: obj({
      rule_id: ref("rule.id"),
      benefit_code: ref("rule.benefit_code"),
      plan_id: ref("rule.plan_id"),
      plan_code: ref("plan.plan_code", { safe: true }),
      plan_name: ref("plan.name", { safe: true }),
      version: ref("rule.version"),
      is_active: ref("rule.is_active"),
      min_tenure_days: ref("rule.min_tenure_days"),
      requires_status: ref("rule.requires_status"),
      effective_from: ref("rule.effective_from"),
      tier: {
        name: ref("ruletier.name", { safe: true }),
        coverage_percent: ref("ruletier.coverage_percent", { safe: true }),
        annual_limit: ref("ruletier.annual_limit", { safe: true }),
      },
    }),
    history: ref("out"),
  },
  responseShape: null as unknown as RuleDetail,
});

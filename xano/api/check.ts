import { query, input, s, c, ref, inp, col, expr, withFilters, fl, obj } from "@xanots/sdk";
import { eligibilityApi } from "./groups.js";
import { members } from "../tables/members.js";
import { benefitRules } from "../tables/benefit-rules.js";
import { coverageTiers } from "../tables/coverage-tiers.js";
import { eligibilityChecks } from "../tables/eligibility-checks.js";

// The one governed decision. Every claims tool and portal calls THIS instead of
// re-encoding the plan rules: it resolves the member, finds the single active
// rule for their plan and benefit, evaluates the status and tenure gates, and
// returns the decision plus the exact rule version that made it. Every call
// writes one audit row, so a past decision can be replayed.
export type CheckResult = {
  decision: "eligible" | "not_eligible";
  eligible: boolean;
  reason: string;
  benefit_code: string;
  tenure_days: number;
  member: { member_number: string; name: string; status: string; plan_id: number };
  rule: { id: number; version: number | null; effective_from: number | null; min_tenure_days: number | null };
  coverage_tier: { id: number; name: string | null; coverage_percent: number | null; annual_limit: number | null };
  checked_at: number;
  check_id: number;
};

export const checkQuery = query({
  name: "check",
  verb: "POST",
  apiGroup: eligibilityApi,
  input: {
    member_number: input.text({ required: true, methods: ["trim"] }),
    benefit_code: input.text({ required: true, methods: ["trim", "upper"] }),
  },
  stack: [
    s.db.get({ table: members, fieldName: "member_number", fieldValue: inp("member_number"), as: "member" }),
    s.precondition({
      expr: expr(ref("member", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No member found with that member number."),
    }),

    // The single active rule for this member's plan + benefit (or null).
    s.db.query({
      table: benefitRules,
      where: [
        expr(col("plan_id"), "=", ref("member.plan_id")),
        expr(col("benefit_code"), "=", inp("benefit_code")),
        expr(col("is_active"), "=", c.bool(true)),
      ],
      returnType: "single",
      as: "rule",
    }),

    // Tenure in whole days = today's epoch-day minus the enrollment epoch-day.
    s.set_var("now_day", withFilters(c.now(), fl.to_epoch_day())),
    s.set_var("enrolled_day", withFilters(ref("member.enrolled_on"), fl.to_epoch_day())),
    s.set_var("tenure_days", withFilters(ref("now_day"), fl.sub(ref("enrolled_day")))),

    // Default to not_eligible; relax only when a rule exists and both gates pass.
    s.set_var("decision", c.text("not_eligible")),
    s.set_var("reason", c.text("")),
    s.set_var("rule_id", c.int(0)),
    s.set_var("tier_id", c.int(0)),
    s.conditional({
      when: expr(ref("rule", { safe: true }), "=", c.null()),
      then: [s.update_var("reason", c.text("No active benefit rule exists for this plan and benefit."))],
      else: [
        s.update_var("rule_id", ref("rule.id")),
        s.conditional({
          // Status gate: the member's status must match the rule's requirement.
          when: expr(ref("member.status"), "!=", ref("rule.requires_status")),
          then: [
            s.update_var(
              "reason",
              withFilters(
                c.text("Member status is "),
                fl.concat(ref("member.status")),
                fl.concat(c.text(", but this benefit requires status ")),
                fl.concat(ref("rule.requires_status")),
                fl.concat(c.text(".")),
              ),
            ),
          ],
          else: [
            s.conditional({
              // Tenure gate: days enrolled must meet the rule's minimum.
              when: expr(ref("tenure_days"), "<", ref("rule.min_tenure_days")),
              then: [
                s.update_var(
                  "reason",
                  withFilters(
                    c.text("Member tenure is "),
                    fl.concat(ref("tenure_days")),
                    fl.concat(c.text(" days, short of the ")),
                    fl.concat(ref("rule.min_tenure_days")),
                    fl.concat(c.text(" days this benefit requires.")),
                  ),
                ),
              ],
              else: [
                s.update_var("decision", c.text("eligible")),
                s.update_var("tier_id", ref("rule.coverage_tier_id")),
                s.update_var(
                  "reason",
                  withFilters(
                    c.text("Eligible: active member with "),
                    fl.concat(ref("tenure_days")),
                    fl.concat(c.text(" days of tenure, meeting the ")),
                    fl.concat(ref("rule.min_tenure_days")),
                    fl.concat(c.text("-day minimum.")),
                  ),
                ),
              ],
            }),
          ],
        }),
      ],
    }),

    // Resolve the deciding tier for the response (id 0 → no row → null).
    s.db.get({ table: coverageTiers, fieldName: "id", fieldValue: ref("tier_id"), as: "tier" }),

    // The audit trail: decision + the rule version + the tier that decided it.
    s.db.add({
      table: eligibilityChecks,
      row: {
        member_id: ref("member.id"),
        member_number: ref("member.member_number"),
        benefit_code: inp("benefit_code"),
        decision: ref("decision"),
        reason: ref("reason"),
        benefit_rule_id: ref("rule_id"),
        coverage_tier_id: ref("tier_id"),
        checked_by: c.text("web-demo"),
        checked_at: c.now(),
      },
      as: "check",
    }),
  ],
  response: {
    decision: ref("decision"),
    eligible: withFilters(ref("decision"), fl.eq("eligible")),
    reason: ref("reason"),
    benefit_code: inp("benefit_code"),
    tenure_days: ref("tenure_days"),
    member: obj({
      member_number: ref("member.member_number"),
      name: withFilters(ref("member.first_name"), fl.concat(c.text(" ")), fl.concat(ref("member.last_name"))),
      status: ref("member.status"),
      plan_id: ref("member.plan_id"),
    }),
    rule: obj({
      id: ref("rule_id"),
      version: ref("rule.version", { safe: true }),
      effective_from: ref("rule.effective_from", { safe: true }),
      min_tenure_days: ref("rule.min_tenure_days", { safe: true }),
    }),
    coverage_tier: obj({
      id: ref("tier_id"),
      name: ref("tier.name", { safe: true }),
      coverage_percent: ref("tier.coverage_percent", { safe: true }),
      annual_limit: ref("tier.annual_limit", { safe: true }),
    }),
    checked_at: ref("check.checked_at"),
    check_id: ref("check.id"),
  },
  responseShape: null as unknown as CheckResult,
});

import { table, f } from "@xanots/sdk";
import { plans } from "./plans.js";
import { coverageTiers } from "./coverage-tiers.js";
import { BENEFIT_RULES } from "../seed-data.js";

// The versioned rule that governs one benefit on one plan. This is the whole
// point of the engine: the eligibility logic lives here, in one place, as data a
// human can audit, instead of being re-encoded in every claims tool and portal.
//
// Only ONE version per (plan, benefit) is `is_active` at a time; older versions
// stay as history so a past decision can be explained by the exact rule that
// made it. The unique index enforces one row per (plan, benefit, version).
export const benefitRules = table({
  name: "benefit_rules",
  schema: {
    benefit_code: f.text({ required: true }),
    plan_id: f.tableRef(plans, { required: true }),
    version: f.int({ required: true }),
    is_active: f.bool({ required: true }),
    min_tenure_days: f.int({ required: true }),
    requires_status: f.enum(["active"], { required: true }),
    coverage_tier_id: f.tableRef(coverageTiers, { required: true }),
    effective_from: f.timestamp({ required: true }),
  },
  index: [
    {
      type: "unique",
      fields: [{ name: "plan_id" }, { name: "benefit_code" }, { name: "version" }],
    },
  ],
  seed: [...BENEFIT_RULES],
});

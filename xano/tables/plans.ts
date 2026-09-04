import { table, f } from "@xanots/sdk";
import { PLANS } from "../seed-data.js";

// An insurance plan. A member belongs to exactly one plan; benefit rules are
// written per plan, so the same benefit code can resolve to different coverage
// on different plans.
export const plans = table({
  name: "plans",
  // `id` (int PK) + `created_at` (epochms) are auto-injected.
  schema: {
    plan_code: f.text({ required: true }),
    name: f.text({ required: true }),
    description: f.text(),
  },
  index: [{ type: "unique", fields: [{ name: "plan_code" }] }],
  seed: [...PLANS],
});

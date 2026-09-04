import { table, f } from "@xanots/sdk";
import { COVERAGE_TIERS } from "../seed-data.js";

// A coverage tier: how much a benefit reimburses and its annual cap. A benefit
// rule points at exactly one tier, so changing a rule's tier changes the
// governed payout without touching the calling systems.
export const coverageTiers = table({
  name: "coverage_tiers",
  schema: {
    name: f.text({ required: true }),
    coverage_percent: f.int({ required: true }),
    annual_limit: f.int({ required: true }),
    notes: f.text(),
  },
  seed: [...COVERAGE_TIERS],
});

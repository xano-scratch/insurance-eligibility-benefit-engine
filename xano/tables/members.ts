import { table, f } from "@xanots/sdk";
import { plans } from "./plans.js";
import { MEMBERS } from "../seed-data.js";

// A plan member. `status` and `enrolled_on` are the two facts every eligibility
// gate reads: the status gate compares `status` to a rule's `requires_status`,
// and the tenure gate measures the days since `enrolled_on` against a rule's
// `min_tenure_days`. `enrolled_on` is stored as an epoch-ms instant so tenure is
// simple day arithmetic at request time.
export const members = table({
  name: "members",
  schema: {
    first_name: f.text({ required: true }),
    last_name: f.text({ required: true }),
    member_number: f.text({ required: true }),
    plan_id: f.tableRef(plans, { required: true }),
    status: f.enum(["active", "suspended", "terminated"], { required: true }),
    enrolled_on: f.timestamp({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "member_number" }] }],
  seed: [...MEMBERS],
});

import { apiGroup } from "@xanots/sdk";

// Each group pins its `canonical` slug so the public path is stable and
// `getPath()` resolves in the browser bundle from source alone (no lock needed).
// The slugs are prefixed `ie_` (insurance eligibility) to stay distinct on the
// shared instance, since a canonical is unique instance-wide.

// The shared governed surface: the eligibility decision and the views composed
// from the same rule evaluation. Public so the demo is browsable immediately.
export const eligibilityApi = apiGroup({ name: "eligibility", canonical: "ie_eligibility" });

// Rule inspection: one rule with its version history (public), and the full
// cross-plan version history (admin only).
export const rulesApi = apiGroup({ name: "rules", canonical: "ie_rules" });

// The decision log, admin only.
export const auditApi = apiGroup({ name: "audit", canonical: "ie_audit" });

// The admin-gated demo-data reset.
export const seedApi = apiGroup({ name: "seed", canonical: "ie_seed" });

// Sign-in and identity for the two demo roles.
export const authApi = apiGroup({ name: "auth", canonical: "ie_auth" });

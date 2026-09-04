import { table, f } from "@xanots/sdk";
import { STAFF } from "../seed-data.js";

// The auth table backing API-layer RBAC. This is NOT row-level security: access
// is controlled at the endpoint layer. A staff member signs in, receives a
// bearer token, and each protected endpoint reads the caller's `role` from this
// table and decides whether to run.
//
// Two roles: `benefits_admin` may reset the demo data and read the full rule
// history and the audit log; `read_only` may run checks, list entitlements, and
// read a single rule, but is refused the admin endpoints.
export const staff = table({
  name: "staff",
  auth: true,
  schema: {
    email: f.email({ required: true }),
    // Taken as plaintext on write and hashed by the column. Login takes the
    // submitted password as `input.text()` (never `input.password`) to avoid
    // double-hashing, then compares with `s.security.check_password`.
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(["benefits_admin", "read_only"], { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
  seed: [...STAFF],
});

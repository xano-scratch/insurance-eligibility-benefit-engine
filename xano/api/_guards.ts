import { s, c, ref, auth, expr, statements } from "@xanots/sdk";
import { staff } from "../tables/staff.js";

// API-layer RBAC. Attach `auth: staff` to the query (so a valid token is
// required before the stack runs), then spread `adminGuard()` at the top of the
// stack to refuse anyone who is not a benefits_admin. This is middleware-style
// authorization at the endpoint, NOT row-level security: the role is read fresh
// from the staff table on every call.
//
// Returning `statements(...)` (a fixed-arity tuple) rather than a plain
// `Statement[]` keeps the caller's stack a tuple, so `InferResponse` still
// traces the endpoint's own `as` bindings after the spread.
export const adminGuard = () =>
  statements(
    s.db.get_by_id({ table: staff, id: auth("id"), output: ["id", "role", "name"], as: "caller" }),
    s.precondition({
      expr: expr(ref("caller.role"), "=", c.text("benefits_admin")),
      error_type: "accessdenied",
      error: c.text("This action requires the benefits_admin role."),
    }),
  );

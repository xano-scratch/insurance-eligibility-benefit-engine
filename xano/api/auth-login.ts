import { query, input, s, c, ref, inp, expr } from "@xanots/sdk";
import { authApi } from "./groups.js";
import { staff } from "../tables/staff.js";

// Public sign-in. Verifies the credential and mints a bearer token, returning
// the caller's role so the frontend can show who is signed in and what they may
// do. The password is taken as `input.text()` (never `input.password`, which
// would double-hash) and the stored hash is pulled with an explicit `output`
// because the password column is internal.
export const loginQuery = query({
  name: "login",
  verb: "POST",
  apiGroup: authApi,
  input: {
    email: input.email({ required: true, methods: ["lower", "trim"] }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: staff,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "name", "role", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.check_password({ text_password: inp("password"), hash_password: ref("u.password"), as: "ok" }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: staff, id: ref("u.id"), as: "token" }),
  ],
  response: {
    token: ref("token"),
    id: ref("u.id"),
    email: ref("u.email"),
    name: ref("u.name"),
    role: ref("u.role"),
  },
  responseShape: null as unknown as {
    token: string;
    id: number;
    email: string;
    name: string;
    role: "benefits_admin" | "read_only";
  },
});

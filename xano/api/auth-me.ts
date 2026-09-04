import { query, s, auth, ref, obj } from "@xanots/sdk";
import { authApi } from "./groups.js";
import { staff } from "../tables/staff.js";

// The authenticated caller's own record. Requires a valid token (`auth: staff`)
// and returns the staff row for the identity in it, which the frontend uses to
// confirm a token still works and to render the signed-in role.
export const meQuery = query({
  name: "me",
  verb: "GET",
  apiGroup: authApi,
  auth: staff,
  stack: [
    s.db.get_by_id({ table: staff, id: auth("id"), output: ["id", "email", "name", "role"], as: "me" }),
  ],
  response: {
    user: obj({
      id: ref("me.id"),
      email: ref("me.email"),
      name: ref("me.name"),
      role: ref("me.role"),
    }),
  },
  responseShape: null as unknown as {
    user: { id: number; email: string; name: string; role: "benefits_admin" | "read_only" };
  },
});

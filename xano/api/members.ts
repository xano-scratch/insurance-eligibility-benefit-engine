import { query, s, c, ref, withFilters, fl, obj } from "@xanots/sdk";
import { eligibilityApi } from "./groups.js";
import { members } from "../tables/members.js";
import { plans } from "../tables/plans.js";

// The member directory that powers the pickers: each member with their plan and
// current tenure in days, so the check and entitlements screens can offer real
// members without the frontend joining tables itself.
export type MemberRow = {
  id: number;
  member_number: string;
  name: string;
  status: string;
  plan_id: number;
  plan_code: string | null;
  plan_name: string | null;
  enrolled_on: number;
  tenure_days: number;
};

export const membersQuery = query({
  name: "members",
  verb: "GET",
  apiGroup: eligibilityApi,
  stack: [
    s.db.query({ table: members, sort: [{ sortBy: "member_number", dir: "asc" }], as: "rows" }),
    s.set_var("now_day", withFilters(c.now(), fl.to_epoch_day())),
    s.set_var("out", c.array([])),
    s.set_var("item", c.obj()),
    s.foreach({
      as: "m",
      list: ref("rows"),
      body: [
        s.db.get({ table: plans, fieldName: "id", fieldValue: ref("m.plan_id"), as: "plan" }),
        s.set_var("ed", withFilters(ref("m.enrolled_on"), fl.to_epoch_day())),
        s.set_var("td", withFilters(ref("now_day"), fl.sub(ref("ed")))),
        s.update_var(
          "item",
          obj({
            id: ref("m.id"),
            member_number: ref("m.member_number"),
            name: withFilters(ref("m.first_name"), fl.concat(c.text(" ")), fl.concat(ref("m.last_name"))),
            status: ref("m.status"),
            plan_id: ref("m.plan_id"),
            plan_code: ref("plan.plan_code", { safe: true }),
            plan_name: ref("plan.name", { safe: true }),
            enrolled_on: ref("m.enrolled_on"),
            tenure_days: ref("td"),
          }),
        ),
        s.update_var("out", withFilters(ref("out"), fl.array_push(ref("item")))),
      ],
    }),
  ],
  response: ref("out"),
  responseShape: null as unknown as MemberRow[],
});

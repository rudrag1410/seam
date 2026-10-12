import type { ActivityOut } from "@seam/api-client";

/** Where an activity entry deep-links to. */
export function activityHref(e: Pick<ActivityOut, "entity_type" | "entity_id">): string | null {
  switch (e.entity_type) {
    case "session":
      return e.entity_id ? `/tailor/${e.entity_id}` : null;
    case "version":
      return e.entity_id ? `/resumes/${e.entity_id}` : null;
    case "resume":
      return "/profile";
    case "jd":
      return "/tailor/new";
    default:
      return null;
  }
}

import { type ActivityOut, EntityType } from "@seam/api-client";

export function activityHref(e: Pick<ActivityOut, "entity_type" | "entity_id">): string | null {
  switch (e.entity_type) {
    case EntityType.Session:
      return e.entity_id ? `/tailor/${e.entity_id}` : null;
    case EntityType.Version:
      return e.entity_id ? `/resumes/${e.entity_id}` : null;
    case EntityType.Resume:
      return "/profile";
    case EntityType.Jd:
      return "/tailor/new";
    default:
      return null;
  }
}

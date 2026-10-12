import type { OpName } from "@seam/api-client";

export interface Contact {
  name: string;
  headline?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  links: string[];
}

export interface Bullet {
  id: string;
  text: string;
}

export interface SummarySection {
  id: string;
  type: "summary";
  text: string;
}

export interface SkillGroup {
  id: string;
  label: string;
  items: string[];
}

export interface SkillsSection {
  id: string;
  type: "skills";
  groups: SkillGroup[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  title: string;
  location?: string | null;
  start?: string | null;
  end?: string | null;
  bullets: Bullet[];
}

export interface ExperienceSection {
  id: string;
  type: "experience";
  items: ExperienceItem[];
}

export interface ProjectItem {
  id: string;
  name: string;
  subtitle?: string | null;
  bullets: Bullet[];
}

export interface ProjectsSection {
  id: string;
  type: "projects";
  items: ProjectItem[];
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  start?: string | null;
  end?: string | null;
  details?: string | null;
}

export interface EducationSection {
  id: string;
  type: "education";
  items: EducationItem[];
}

export interface OtherSection {
  id: string;
  type: "other";
  title: string;
  lines: string[];
}

export type Section =
  | SummarySection
  | SkillsSection
  | ExperienceSection
  | ProjectsSection
  | EducationSection
  | OtherSection;

export interface Resume {
  contact: Contact;
  sections: Section[];
}

export { Decision, OpName } from "@seam/api-client";

export interface Op {
  op: OpName;
  target: string;
  payload: Record<string, unknown>;
  edited_text?: string | null;
}

import type { components } from "./schema";

type S = components["schemas"];

/** Friendly aliases. Reads use the `-Output` variants, which have every defaulted field present. */
export type Profile = S["ProfileIO-Output"];
export type Preferences = S["PreferencesIO-Output"];
export type ResumeOut = S["ResumeOut"];
export type Resume = ResumeOut["document"];
export type JDAnalysis = S["JDAnalysis"];
export type JDAnalyzeResponse = S["JDAnalyzeResponse"];
export type FitCheck = S["FitCheck"];
export type MatchScore = S["MatchScore"];
export type AtsScore = S["AtsScore"];
export type SuggestionOut = S["SuggestionOut"];
export type TailorSessionOut = S["TailorSessionOut"];
export type TailorCreate = S["TailorCreate"];
export type SessionListItem = S["SessionListItem"];
export type VersionOut = S["VersionOut"];
export type VersionDetail = S["VersionDetail"];
export type VersionCompare = S["VersionCompare"];
export type ActivityOut = S["ActivityOut"];
export type CoverLetterOut = S["CoverLetterOut"];
export type InterviewPrep = S["InterviewPrep"];
export type UserOut = S["UserOut"];

import { z } from "zod";

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : v),
  z.coerce.number().nonnegative("Enter a positive number").optional(),
);

const LINK_PATTERN = /^(https?:\/\/)?[^\s/.]+\.[^\s]{2,}$/i;

const optionalLink = z
  .string()
  .trim()
  .refine((v) => !v || LINK_PATTERN.test(v), "Enter a link, like linkedin.com/in/you")
  .optional();

export const aboutSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name"),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  headline: z.string().trim().optional(),
  current_title: z.string().trim().optional(),
  current_company: z.string().trim().optional(),
  years_experience: optionalNumber,
  linkedin: optionalLink,
  github: optionalLink,
  portfolio: optionalLink,
});
export type AboutValues = z.infer<typeof aboutSchema>;

export const compensationSchema = z.object({
  current_ctc: optionalNumber,
  expected_ctc: optionalNumber,
  ctc_currency: z.string().length(3),
  notice_period_days: optionalNumber,
});
export type CompensationValues = z.infer<typeof compensationSchema>;

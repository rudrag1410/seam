import { z } from "zod";

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : v),
  z.coerce.number().nonnegative("Enter a positive number").optional(),
);

export const aboutSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name"),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  headline: z.string().trim().optional(),
  current_title: z.string().trim().optional(),
  current_company: z.string().trim().optional(),
  years_experience: optionalNumber,
  linkedin: z.string().trim().optional(),
  github: z.string().trim().optional(),
  portfolio: z.string().trim().optional(),
});
export type AboutValues = z.infer<typeof aboutSchema>;

export const compensationSchema = z.object({
  current_ctc: optionalNumber,
  expected_ctc: optionalNumber,
  ctc_currency: z.string().length(3),
  notice_period_days: optionalNumber,
});
export type CompensationValues = z.infer<typeof compensationSchema>;

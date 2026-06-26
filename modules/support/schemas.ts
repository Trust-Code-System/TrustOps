import { z } from "zod";

/** A Help Center report. Name/email default to the signed-in user server-side. */
export const supportRequestSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Add a short subject")
    .max(140, "Keep the subject under 140 characters"),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more (at least 10 characters)")
    .max(4000, "Message is too long"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
});

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;

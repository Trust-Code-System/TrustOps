import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const customerSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(2, "Enter the customer's name").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20, "Phone number is too long"),
  email: z
    .union([z.string().trim().email("Enter a valid email"), z.literal("")])
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  notes: optionalText(1000),
});

export type CustomerInput = z.infer<typeof customerSchema>;

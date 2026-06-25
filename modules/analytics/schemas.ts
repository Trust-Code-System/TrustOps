import { z } from "zod";

const kobo = z.number().int().positive("Amount must be greater than zero");

export const dateRangeSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((d) => d.to >= d.from, {
    message: "End date must be after start date",
    path: ["to"],
  });

export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  branchId: z.string().uuid().optional().nullable(),
  category: z.string().trim().min(2, "Enter a category").max(80),
  amount: kobo,
  description: z.string().trim().max(200).optional().nullable(),
  spentAt: z.string().min(1, "Choose a date"),
});

export const archiveExpenseSchema = z.object({
  id: z.string().uuid(),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;

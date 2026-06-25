import { z } from "zod";

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amountKobo: z.number().int().positive("Amount must be greater than zero"),
  method: z.enum(["cash", "transfer", "card", "other"]),
  reference: z.string().trim().max(120).optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

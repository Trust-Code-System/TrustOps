import { z } from "zod";

/** Server-side validation for record_sale. The RPC validates again in the DB. */
export const recordSaleSchema = z.object({
  customerId: z.string().uuid("Pick a customer"),
  // Offline-capture idempotency key (client-generated). A replayed sale with the
  // same key returns the original invoice instead of creating a duplicate.
  clientUuid: z.string().uuid().optional(),
  branchId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  discountKobo: z.number().int().min(0).default(0),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().nullable().optional(),
        description: z.string().trim().min(1, "Add a description"),
        quantity: z.number().int().positive("Quantity must be at least 1"),
        unitPriceKobo: z.number().int().min(0, "Price can't be negative"),
      }),
    )
    .min(1, "Add at least one item"),
  payment: z
    .object({
      amountKobo: z.number().int().positive("Amount must be greater than zero"),
      method: z.enum(["cash", "transfer", "card", "other"]),
      reference: z.string().trim().max(120).optional().nullable(),
    })
    .nullable()
    .optional(),
});

export type RecordSaleInput = z.infer<typeof recordSaleSchema>;

export const quickCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a name").max(120),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
});

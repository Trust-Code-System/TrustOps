import { z } from "zod";

const kobo = z.number().int().min(0, "Can't be negative");

export const initialStockSchema = z.object({
  branchId: z.string().uuid(),
  quantity: z.number().int().min(0, "Can't be negative"),
  lowStockThreshold: z.number().int().min(0).default(0),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(120),
  sku: z.string().trim().max(60).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  unit: z.string().trim().max(20).default("piece"),
  costPrice: kobo.default(0),
  sellPrice: kobo.default(0),
  initialStock: z.array(initialStockSchema).default([]),
});

export const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, "Enter a product name").max(120),
  sku: z.string().trim().max(60).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  unit: z.string().trim().max(20).default("piece"),
  costPrice: kobo,
  sellPrice: kobo,
  isActive: z.boolean().default(true),
});

export const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  type: z.enum(["restock", "adjustment", "return"]),
  quantityDelta: z
    .number()
    .int()
    .refine((n) => n !== 0, "Enter a non-zero quantity"),
  reason: z.string().trim().min(1, "A reason is required").max(200),
  lowStockThreshold: z.number().int().min(0).optional().nullable(),
});

export const transferStockSchema = z
  .object({
    productId: z.string().uuid(),
    fromBranchId: z.string().uuid(),
    toBranchId: z.string().uuid(),
    quantity: z.number().int().positive("Quantity must be greater than zero"),
    reason: z.string().trim().max(200).optional().nullable(),
  })
  .refine((d) => d.fromBranchId !== d.toBranchId, {
    message: "Choose two different branches",
    path: ["toBranchId"],
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type TransferStockInput = z.infer<typeof transferStockSchema>;

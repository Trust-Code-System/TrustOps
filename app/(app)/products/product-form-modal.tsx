"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/modules/inventory/actions";
import { nairaToKobo, koboToNaira } from "@/lib/money";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import type { Branch, Product } from "@/modules/shared/types";

function toKobo(v: string): number {
  if (!v.trim()) return 0;
  try {
    return nairaToKobo(v);
  } catch {
    return 0;
  }
}
function toInt(v: string): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function ProductFormModal({
  open,
  onClose,
  product,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  branches: Branch[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "piece");
  const [cost, setCost] = useState(product ? String(koboToNaira(product.cost_price)) : "");
  const [sell, setSell] = useState(product ? String(koboToNaira(product.sell_price)) : "");
  const [stock, setStock] = useState<Record<string, { qty: string; thr: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setStockField(branchId: string, patch: Partial<{ qty: string; thr: string }>) {
    setStock((s) => {
      const prev = s[branchId] ?? { qty: "", thr: "" };
      return { ...s, [branchId]: { ...prev, ...patch } };
    });
  }

  async function submit() {
    setError(null);
    setSaving(true);

    const res = isEdit
      ? await updateProduct({
          id: product!.id,
          name,
          sku: sku.trim() || null,
          category: category.trim() || null,
          unit: unit.trim() || "piece",
          costPrice: toKobo(cost),
          sellPrice: toKobo(sell),
          isActive: product!.is_active,
        })
      : await createProduct({
          name,
          sku: sku.trim() || null,
          category: category.trim() || null,
          unit: unit.trim() || "piece",
          costPrice: toKobo(cost),
          sellPrice: toKobo(sell),
          initialStock: Object.entries(stock)
            .map(([branchId, v]) => ({
              branchId,
              quantity: toInt(v.qty),
              lowStockThreshold: toInt(v.thr),
            }))
            .filter((s) => s.quantity > 0 || s.lowStockThreshold > 0),
        });

    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast(isEdit ? "Product saved" : "Product added");
    router.refresh();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit product" : "Add product"}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <FormField id="name" label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="sku" label="SKU">
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
          </FormField>
          <FormField id="category" label="Category">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Optional" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="unit" label="Unit">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="piece" />
          </FormField>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="cost" label="Cost price">
            <Input
              inputMode="decimal"
              leadingAddon="₦"
              numeric
              placeholder="0.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </FormField>
          <FormField id="sell" label="Sell price">
            <Input
              inputMode="decimal"
              leadingAddon="₦"
              numeric
              placeholder="0.00"
              value={sell}
              onChange={(e) => setSell(e.target.value)}
            />
          </FormField>
        </div>

        {!isEdit && branches.length > 0 && (
          <div>
            <p className="mb-2 text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
              Initial stock per branch
            </p>
            <div className="space-y-3">
              {branches.map((b) => (
                <div key={b.id} className="flex items-end gap-3">
                  <span className="flex-1 truncate text-body">{b.name}</span>
                  <div className="w-24">
                    <label className="mb-1 block text-caption text-text-muted">Qty</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      numeric
                      placeholder="0"
                      value={stock[b.id]?.qty ?? ""}
                      onChange={(e) => setStockField(b.id, { qty: e.target.value })}
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-1 block text-caption text-text-muted">Low at</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      numeric
                      placeholder="0"
                      value={stock[b.id]?.thr ?? ""}
                      onChange={(e) => setStockField(b.id, { thr: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={saving}>
            {isEdit ? "Save product" : "Add product"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

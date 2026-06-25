"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { recordSale, quickAddCustomer } from "@/modules/sales/actions";
import { nairaToKobo, koboToNaira, formatNaira } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Money } from "@/components/ui/money";
import { useToast } from "@/components/ui/toast";
import type { Branch, Customer, Product } from "@/modules/shared/types";

interface ItemRow {
  productId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
}

const emptyRow = (): ItemRow => ({
  productId: null,
  description: "",
  quantity: "1",
  unitPrice: "",
});

function toKobo(v: string): number {
  if (!v.trim()) return 0;
  try {
    return nairaToKobo(v);
  } catch {
    return 0;
  }
}
function toQty(v: string): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function RecordSaleForm({
  customers: initialCustomers,
  branches,
  products,
}: {
  customers: Customer[];
  branches: Branch[];
  products: Product[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [customers, setCustomers] = useState(initialCustomers);
  const primaryBranch = branches.find((b) => b.is_primary) ?? branches[0];

  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState(primaryBranch?.id ?? "");
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [discount, setDiscount] = useState("");
  const [payNow, setPayNow] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [quickOpen, setQuickOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + toQty(it.quantity) * toKobo(it.unitPrice), 0),
    [items],
  );
  const discountKobo = toKobo(discount);
  const total = Math.max(0, subtotal - discountKobo);

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addItem() {
    setItems((rows) => [...rows, emptyRow()]);
  }
  function removeItem(idx: number) {
    setItems((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)));
  }
  function pickProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) {
      updateItem(idx, { productId: null });
      return;
    }
    updateItem(idx, {
      productId: p.id,
      description: p.name,
      unitPrice: String(koboToNaira(p.sell_price)),
    });
  }

  async function handleSubmit() {
    setError(null);

    if (!customerId) return setError("Pick a customer first");
    const cleanItems = items
      .filter((it) => it.description.trim() && toQty(it.quantity) > 0)
      .map((it) => ({
        productId: it.productId,
        description: it.description.trim(),
        quantity: toQty(it.quantity),
        unitPriceKobo: toKobo(it.unitPrice),
      }));
    if (cleanItems.length === 0) {
      return setError("Add at least one item with a description and quantity");
    }
    if (discountKobo > subtotal) {
      return setError("Discount can't be more than the subtotal");
    }

    const paymentAmountKobo = payNow
      ? payAmount.trim()
        ? toKobo(payAmount)
        : total
      : 0;
    if (payNow && paymentAmountKobo <= 0) {
      return setError("Enter a payment amount greater than zero");
    }

    setSubmitting(true);
    const res = await recordSale({
      customerId,
      branchId: branchId || null,
      discountKobo,
      items: cleanItems,
      payment: payNow
        ? {
            amountKobo: paymentAmountKobo,
            method: payMethod as "cash" | "transfer" | "card" | "other",
          }
        : null,
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast("Sale recorded");
    router.push(`/invoices/${res.invoiceId}`);
  }

  return (
    <div className="space-y-6 pb-28">
      <h1 className="text-display">Record sale</h1>

      {error && <Alert>{error}</Alert>}

      {/* Customer */}
      <Card>
        <CardHeader>
          <CardTitle>Customer</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setQuickOpen(true)}>
            <UserPlus /> New
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <FormField id="customer" label="Customer" required>
            <Select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a customer
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} · {c.phone}
                </option>
              ))}
            </Select>
          </FormField>
          {branches.length > 1 && (
            <FormField id="branch" label="Branch">
              <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <Button size="sm" variant="secondary" onClick={addItem}>
            <Plus /> Add item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-md border border-border-subtle p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
                  Item {idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    aria-label={`Remove item ${idx + 1}`}
                    className="rounded-sm p-1 text-text-muted hover:bg-gray-100 hover:text-danger-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {products.length > 0 && (
                  <Select
                    aria-label="Product"
                    value={it.productId ?? ""}
                    onChange={(e) => pickProduct(idx, e.target.value)}
                  >
                    <option value="">Free-text item</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatNaira(p.sell_price)}
                      </option>
                    ))}
                  </Select>
                )}
                <Input
                  aria-label="Description"
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) =>
                    updateItem(idx, { description: e.target.value })
                  }
                />
                <div className="flex items-end gap-3">
                  <div className="w-20">
                    <label className="mb-2 block text-caption font-[500] text-text-secondary">
                      Qty
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      numeric
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-2 block text-caption font-[500] text-text-secondary">
                      Unit price
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      leadingAddon="₦"
                      numeric
                      placeholder="0.00"
                      value={it.unitPrice}
                      onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                    />
                  </div>
                  <div className="pb-2 text-right">
                    <span className="block text-caption text-text-muted">Line</span>
                    <Money
                      kobo={toQty(it.quantity) * toKobo(it.unitPrice)}
                      className="text-body-strong"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <FormField id="discount" label="Discount">
            <Input
              type="text"
              inputMode="decimal"
              leadingAddon="₦"
              numeric
              placeholder="0.00"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
          <label className="flex items-center gap-2 text-small">
            <input
              type="checkbox"
              checked={payNow}
              onChange={(e) => setPayNow(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary-600)]"
            />
            Paid now
          </label>
        </CardHeader>
        {payNow && (
          <CardContent className="space-y-3">
            <FormField id="payAmount" label="Amount" helper="Leave blank to pay the full total.">
              <Input
                type="text"
                inputMode="decimal"
                leadingAddon="₦"
                numeric
                placeholder={formatNaira(total, { withSymbol: false })}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </FormField>
            <FormField id="payMethod" label="Method">
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </Select>
            </FormField>
          </CardContent>
        )}
      </Card>

      {/* Sticky total + submit (reachable without scrolling on phones) */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border-subtle bg-surface-card px-4 py-3 md:bottom-0 md:pl-[calc(15rem+2rem)] md:pr-8">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4">
          <div>
            <span className="block text-caption uppercase tracking-[0.04em] text-text-muted">
              Total
            </span>
            <Money kobo={total} className="text-h2" />
          </div>
          <Button size="lg" onClick={handleSubmit} isLoading={submitting}>
            Record sale
          </Button>
        </div>
      </div>

      <QuickAddCustomerModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onAdded={(c) => {
          setCustomers((list) => [c, ...list]);
          setCustomerId(c.id);
          toast("Customer added");
        }}
      />
    </div>
  );
}

function QuickAddCustomerModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (c: Customer) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    setSaving(true);
    const res = await quickAddCustomer({ fullName, phone });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    onAdded(res.customer);
    setFullName("");
    setPhone("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New customer">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <FormField id="qaName" label="Full name" required>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </FormField>
        <FormField id="qaPhone" label="Phone" required>
          <Input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </FormField>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={saving}>
            Add customer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

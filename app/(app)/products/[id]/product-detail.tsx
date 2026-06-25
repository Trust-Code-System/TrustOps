"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Pencil, SlidersHorizontal } from "lucide-react";
import {
  adjustStock,
  transferStock,
  updateProduct,
} from "@/modules/inventory/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/ui/money";
import { Badge, StockBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, titleCase } from "@/modules/shared/format";
import { cn } from "@/lib/utils";
import { ProductFormModal } from "../product-form-modal";
import type { Branch } from "@/modules/shared/types";
import type { ProductDetail } from "@/modules/inventory/queries";

function rowIsLow(q: number, thr: number) {
  return thr > 0 && q <= thr;
}

export function ProductDetailView({
  detail,
  branches,
  canManage,
}: {
  detail: ProductDetail;
  branches: Branch[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { product, inventory, movements, totalStock } = detail;

  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const anyLow = inventory.some((r) => rowIsLow(r.quantity, r.low_stock_threshold));

  async function toggleActive() {
    setBusy(true);
    const res = await updateProduct({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      costPrice: product.cost_price,
      sellPrice: product.sell_price,
      isActive: !product.is_active,
    });
    setBusy(false);
    if (!res.ok) return toast(res.error, "error");
    toast(product.is_active ? "Product deactivated" : "Product activated");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/products")}
        className="inline-flex items-center gap-1 text-small text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Products
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-display">{product.name}</h1>
            <StockBadge quantity={totalStock} isLow={anyLow} />
            {!product.is_active && <Badge tone="neutral">Inactive</Badge>}
          </div>
          <p className="mt-1 text-body text-text-secondary">
            {product.sku ? `SKU ${product.sku} · ` : ""}
            {product.category ? `${product.category} · ` : ""}
            per {product.unit}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal /> Adjust stock
            </Button>
            {branches.length > 1 && (
              <Button variant="secondary" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight /> Transfer
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            <Button variant="ghost" onClick={toggleActive} isLoading={busy}>
              {product.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="p-4 sm:p-6">
          <p className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            Total stock
          </p>
          <p className="mt-2 text-metric tabular text-text-primary">{totalStock}</p>
        </Card>
        <Card className="p-4 sm:p-6">
          <p className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            Sell price
          </p>
          <p className="mt-2 text-metric tabular text-text-primary">
            <Money kobo={product.sell_price} />
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <p className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            Cost price
          </p>
          <p className="mt-2 text-metric tabular text-text-primary">
            <Money kobo={product.cost_price} />
          </p>
        </Card>
      </div>

      {/* Stock by branch */}
      <Card>
        <CardHeader>
          <CardTitle>Stock by branch</CardTitle>
        </CardHeader>
        <CardContent className={inventory.length === 0 ? "p-0" : "p-0"}>
          {inventory.length === 0 ? (
            <EmptyState
              icon={SlidersHorizontal}
              title="No stock recorded"
              description="Use Adjust stock to add a starting quantity for a branch."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {inventory.map((r) => (
                <li key={r.branch_id} className="flex items-center justify-between gap-4 p-4 sm:px-6">
                  <div>
                    <p className="text-body">{r.branch?.name ?? "—"}</p>
                    {r.low_stock_threshold > 0 && (
                      <p className="text-small text-text-muted">
                        Low at {r.low_stock_threshold}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular text-body-strong">{r.quantity}</span>
                    <StockBadge
                      quantity={r.quantity}
                      isLow={rowIsLow(r.quantity, r.low_stock_threshold)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Movement ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Stock movements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <EmptyState
              icon={SlidersHorizontal}
              title="No movements yet"
              description="Stock changes (sales, restocks, transfers) will appear here."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 p-4 sm:px-6">
                  <div>
                    <p className="text-body">
                      {titleCase(m.type.replace(/_/g, " "))}
                      <span className="text-text-muted"> · {m.branch?.name ?? "—"}</span>
                    </p>
                    <p className="text-small text-text-muted">
                      {formatDateTime(m.created_at)}
                      {m.reason ? ` · ${m.reason}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "tabular text-body-strong",
                      m.quantity_delta > 0 ? "text-success-500" : "text-danger-500",
                    )}
                  >
                    {m.quantity_delta > 0 ? "+" : ""}
                    {m.quantity_delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <>
          <ProductFormModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            product={product}
            branches={branches}
          />
          <AdjustStockModal
            open={adjustOpen}
            onClose={() => setAdjustOpen(false)}
            productId={product.id}
            branches={branches}
          />
          {branches.length > 1 && (
            <TransferStockModal
              open={transferOpen}
              onClose={() => setTransferOpen(false)}
              productId={product.id}
              branches={branches}
            />
          )}
        </>
      )}
    </div>
  );
}

function AdjustStockModal({
  open,
  onClose,
  productId,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  branches: Branch[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [type, setType] = useState<"restock" | "adjustment" | "return">("restock");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    const raw = parseInt(qty, 10);
    if (!Number.isFinite(raw) || raw === 0) return setError("Enter a non-zero quantity");
    // restock/return add stock; adjustment can be + or − (as typed).
    const delta = type === "adjustment" ? raw : Math.abs(raw);
    if (!reason.trim()) return setError("A reason is required");

    setSaving(true);
    const res = await adjustStock({
      productId,
      branchId,
      type,
      quantityDelta: delta,
      reason: reason.trim(),
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast("Stock updated");
    router.refresh();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Adjust stock">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <FormField id="adjBranch" label="Branch">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="adjType" label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="restock">Restock (add)</option>
            <option value="return">Return (add)</option>
            <option value="adjustment">Adjustment (+/−)</option>
          </Select>
        </FormField>
        <FormField
          id="adjQty"
          label="Quantity"
          helper={type === "adjustment" ? "Use a negative number to reduce." : undefined}
        >
          <Input
            type="number"
            inputMode="numeric"
            numeric
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </FormField>
        <FormField id="adjReason" label="Reason" required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </FormField>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={saving}>
            Save adjustment
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TransferStockModal({
  open,
  onClose,
  productId,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  branches: Branch[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [fromBranchId, setFrom] = useState(branches[0]?.id ?? "");
  const [toBranchId, setTo] = useState(branches[1]?.id ?? "");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    const quantity = parseInt(qty, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return setError("Enter a quantity greater than zero");
    }
    if (fromBranchId === toBranchId) return setError("Choose two different branches");

    setSaving(true);
    const res = await transferStock({
      productId,
      fromBranchId,
      toBranchId,
      quantity,
      reason: reason.trim() || null,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast("Stock transferred");
    router.refresh();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Transfer stock">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <FormField id="from" label="From">
            <Select value={fromBranchId} onChange={(e) => setFrom(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="to" label="To">
            <Select value={toBranchId} onChange={(e) => setTo(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField id="trQty" label="Quantity">
          <Input
            type="number"
            inputMode="numeric"
            numeric
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </FormField>
        <FormField id="trReason" label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
        </FormField>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={saving}>
            Transfer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

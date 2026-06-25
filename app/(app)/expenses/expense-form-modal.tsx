"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { koboToNaira, nairaToKobo } from "@/lib/money";
import { archiveExpense, saveExpense } from "@/modules/analytics/actions";
import type { ExpenseRow } from "@/modules/analytics/queries";
import type { Branch } from "@/modules/shared/types";

function toKobo(value: string): number {
  try {
    return nairaToKobo(value);
  } catch {
    return 0;
  }
}

function dateInputValue(iso?: string) {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return new Date(iso).toISOString().slice(0, 10);
}

export function ExpenseFormModal({
  open,
  onClose,
  expense,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  expense: ExpenseRow | null;
  branches: Branch[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!expense;
  const [category, setCategory] = useState(expense?.category ?? "");
  const [branchId, setBranchId] = useState(expense?.branch_id ?? "");
  const [amount, setAmount] = useState(
    expense ? String(koboToNaira(expense.amount)) : "",
  );
  const [spentAt, setSpentAt] = useState(dateInputValue(expense?.spent_at));
  const [description, setDescription] = useState(expense?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSaving(true);
    const res = await saveExpense({
      id: expense?.id,
      category,
      branchId: branchId || null,
      amount: toKobo(amount),
      description: description.trim() || null,
      spentAt,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast(isEdit ? "Expense saved" : "Expense added");
    router.refresh();
    onClose();
  }

  async function archive() {
    if (!expense) return;
    setError(null);
    setDeleting(true);
    const res = await archiveExpense(expense.id);
    setDeleting(false);
    if (!res.ok) return setError(res.error);
    toast("Expense archived");
    router.refresh();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit expense" : "Add expense"}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <FormField id="category" label="Category" required>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Rent, fuel, supplies"
          />
        </FormField>

        <FormField id="branch" label="Branch">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Company-wide</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField id="amount" label="Amount" required>
            <Input
              inputMode="decimal"
              leadingAddon="₦"
              numeric
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
          <FormField id="spentAt" label="Date" required>
            <Input
              type="date"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
            />
          </FormField>
        </div>

        <FormField id="description" label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note"
          />
        </FormField>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
          {isEdit ? (
            <Button
              type="button"
              variant="danger"
              onClick={archive}
              isLoading={deleting}
            >
              Archive expense
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} isLoading={saving}>
              {isEdit ? "Save expense" : "Add expense"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

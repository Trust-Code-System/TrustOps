"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { Building2, Plus, Pencil } from "lucide-react";
import { saveBranch } from "@/modules/companies/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { Branch } from "@/modules/shared/types";

export function BranchesSection({
  branches,
  canManage,
}: {
  branches: Branch[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<Branch | null>(null);
  const [open, setOpen] = useState(false);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(b: Branch) {
    setEditing(b);
    setOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branches</CardTitle>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={openAdd}>
            <Plus /> Add branch
          </Button>
        )}
      </CardHeader>
      <CardContent className={branches.length === 0 ? "p-0" : undefined}>
        {branches.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No branches yet"
            description="Add a branch to organize sales by location."
            action={
              canManage ? <Button onClick={openAdd}>Add branch</Button> : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {branches.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="flex items-center gap-2 text-body">
                  {b.name}
                  {b.is_primary && <Badge tone="success">Primary</Badge>}
                </span>
                {canManage && (
                  <Button size="sm" variant="ghost" onClick={() => openEdit(b)} aria-label={`Edit ${b.name}`}>
                    <Pencil /> Edit
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {canManage && (
        <BranchModal
          key={editing?.id ?? "new"}
          open={open}
          onClose={() => setOpen(false)}
          branch={editing}
        />
      )}
    </Card>
  );
}

function BranchModal({
  open,
  onClose,
  branch,
}: {
  open: boolean;
  onClose: () => void;
  branch: Branch | null;
}) {
  const [state, formAction] = useFormState(saveBranch, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.ok) {
      toast(branch ? "Branch updated" : "Branch added");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={branch ? "Edit branch" : "Add branch"}
    >
      <form action={formAction} className="space-y-4" noValidate>
        {state?.error && <Alert>{state.error}</Alert>}
        {branch && <input type="hidden" name="id" value={branch.id} />}
        <FormField id="name" label="Branch name" required error={state?.fieldErrors?.name}>
          <Input name="name" defaultValue={branch?.name ?? ""} required />
        </FormField>
        <label className="flex items-center gap-2 text-body">
          <input
            type="checkbox"
            name="isPrimary"
            defaultChecked={branch?.is_primary ?? false}
            className="h-4 w-4 accent-[var(--color-primary-600)]"
          />
          Set as primary branch
        </label>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton>{branch ? "Save branch" : "Add branch"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

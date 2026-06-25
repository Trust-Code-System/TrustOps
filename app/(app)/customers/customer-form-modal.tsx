"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { saveCustomer } from "@/modules/customers/actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import type { Customer } from "@/modules/shared/types";

/**
 * Add / edit customer — a bottom sheet on mobile, centered modal on desktop.
 * One column, validate on submit (server-side via Zod).
 */
export function CustomerFormModal({
  open,
  onClose,
  customer,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSaved?: () => void;
}) {
  const [state, formAction] = useFormState(saveCustomer, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.ok) {
      toast(customer ? "Customer saved" : "Customer added");
      onSaved?.();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? "Edit customer" : "Add customer"}
    >
      <form action={formAction} className="space-y-4" noValidate>
        {state?.error && <Alert>{state.error}</Alert>}
        {customer && <input type="hidden" name="id" value={customer.id} />}

        <FormField id="fullName" label="Full name" required error={state?.fieldErrors?.fullName}>
          <Input name="fullName" defaultValue={customer?.full_name ?? ""} autoComplete="name" required />
        </FormField>

        <FormField id="phone" label="Phone" required error={state?.fieldErrors?.phone}>
          <Input
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={customer?.phone ?? ""}
            autoComplete="tel"
            required
          />
        </FormField>

        <FormField id="email" label="Email" error={state?.fieldErrors?.email}>
          <Input
            name="email"
            type="email"
            inputMode="email"
            defaultValue={customer?.email ?? ""}
            autoComplete="email"
          />
        </FormField>

        <FormField id="notes" label="Notes" error={state?.fieldErrors?.notes}>
          <Textarea name="notes" defaultValue={customer?.notes ?? ""} rows={3} />
        </FormField>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton>{customer ? "Save customer" : "Add customer"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

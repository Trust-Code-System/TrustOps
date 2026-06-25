"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { updateCompany } from "@/modules/companies/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import type { Company } from "@/modules/shared/types";

export function CompanySection({
  company,
  canManage,
}: {
  company: Company;
  canManage: boolean;
}) {
  const [state, formAction] = useFormState(updateCompany, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.ok) toast("Company details saved");
  }, [state, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company profile</CardTitle>
      </CardHeader>
      <CardContent>
        {!canManage ? (
          <dl className="space-y-3 text-body">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Name</dt>
              <dd>{company.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Currency</dt>
              <dd>{company.currency}</dd>
            </div>
          </dl>
        ) : (
          <form action={formAction} className="max-w-form space-y-4" noValidate>
            {state?.error && <Alert>{state.error}</Alert>}
            <FormField id="name" label="Company name" required error={state?.fieldErrors?.name}>
              <Input name="name" defaultValue={company.name} required />
            </FormField>
            <FormField
              id="currency"
              label="Currency"
              required
              helper="3-letter code, e.g. NGN."
              error={state?.fieldErrors?.currency}
            >
              <Input
                name="currency"
                defaultValue={company.currency}
                maxLength={3}
                className="uppercase"
                required
              />
            </FormField>
            <div className="flex justify-end">
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

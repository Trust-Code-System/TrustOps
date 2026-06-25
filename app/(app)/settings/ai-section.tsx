"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { saveAiSettings } from "@/modules/ai/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { formatUsd } from "@/modules/ai/pricing";
import type { AiSettings } from "@/modules/shared/types";

export function AiSection({
  settings,
  monthSpendUsdCents,
  isOwner,
}: {
  settings: AiSettings;
  monthSpendUsdCents: number;
  isOwner: boolean;
}) {
  const [state, formAction] = useFormState(saveAiSettings, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.ok) toast("AI settings saved");
  }, [state, toast]);

  const capDollars =
    settings.monthly_cap_usd_cents === null
      ? ""
      : String(Math.round(settings.monthly_cap_usd_cents / 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-small text-text-muted">
          The assistant answers questions about your own data using read-only,
          company-scoped tools. It never changes money or stock. Spend this month:{" "}
          <span className="tabular font-[600] text-text-primary">
            {formatUsd(monthSpendUsdCents)}
          </span>
          .
        </p>

        {!isOwner ? (
          <p className="text-small text-text-muted">
            Only the owner can change AI settings.
          </p>
        ) : (
          <form action={formAction} className="space-y-6" noValidate>
            {state?.error && <Alert>{state.error}</Alert>}

            <label className="flex items-center gap-2 text-body">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={settings.enabled}
                className="h-4 w-4 accent-[var(--color-primary-600)]"
              />
              Enable the assistant for everyone in this company
            </label>

            <FormField
              id="capUsd"
              label="Monthly spend cap (USD)"
              helper="Blank means no cap. The assistant stops answering once this month's spend reaches the cap."
            >
              <Input
                name="capUsd"
                type="number"
                inputMode="numeric"
                numeric
                min={0}
                max={100000}
                defaultValue={capDollars}
                placeholder="No cap"
                className="w-32"
              />
            </FormField>

            <div className="flex justify-end">
              <SubmitButton>Save AI settings</SubmitButton>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

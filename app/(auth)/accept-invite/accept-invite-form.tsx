"use client";

import { useFormState } from "react-dom";
import { acceptInvite } from "@/modules/auth/actions";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function AcceptInviteForm() {
  const [state, formAction] = useFormState(acceptInvite, null);

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-h1">Set your password</h1>
          <p className="mt-1 text-small text-text-muted">
            Finish joining your team. Choose a password to sign in.
          </p>
        </div>

        {state?.error && <Alert>{state.error}</Alert>}

        <form action={formAction} className="space-y-4" noValidate>
          <FormField
            id="password"
            label="Password"
            required
            helper="At least 8 characters."
            error={state?.fieldErrors?.password}
          >
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </FormField>

          <FormField
            id="confirmPassword"
            label="Confirm password"
            required
            error={state?.fieldErrors?.confirmPassword}
          >
            <Input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </FormField>

          <SubmitButton size="lg" className="w-full">
            Join team
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

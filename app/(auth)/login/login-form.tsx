"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { login } from "@/modules/auth/actions";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function LoginForm() {
  const [state, formAction] = useFormState(login, null);

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-h1">Log in</h1>
          <p className="mt-1 text-small text-text-muted">
            Welcome back. Sign in to your business.
          </p>
        </div>

        {state?.error && <Alert>{state.error}</Alert>}

        <form action={formAction} className="space-y-4" noValidate>
          <FormField
            id="email"
            label="Email"
            error={state?.fieldErrors?.email}
          >
            <Input
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
            />
          </FormField>

          <FormField
            id="password"
            label="Password"
            error={state?.fieldErrors?.password}
          >
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </FormField>

          <SubmitButton size="lg" className="w-full">
            Log in
          </SubmitButton>
        </form>

        <p className="text-center text-small text-text-muted">
          New to TrustOps?{" "}
          <Link href="/signup" className="font-[600] text-primary-600">
            Create a company
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

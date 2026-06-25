"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { signupCompany } from "@/modules/auth/actions";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function SignupForm() {
  const [state, formAction] = useFormState(signupCompany, null);

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-h1">Create your company</h1>
          <p className="mt-1 text-small text-text-muted">
            You&apos;ll be the owner. Add your team later.
          </p>
        </div>

        {state?.error && <Alert>{state.error}</Alert>}

        <form action={formAction} className="space-y-4" noValidate>
          <FormField
            id="companyName"
            label="Company name"
            required
            error={state?.fieldErrors?.companyName}
          >
            <Input name="companyName" autoComplete="organization" required />
          </FormField>

          <FormField
            id="fullName"
            label="Your full name"
            required
            error={state?.fieldErrors?.fullName}
          >
            <Input name="fullName" autoComplete="name" required />
          </FormField>

          <FormField
            id="email"
            label="Email"
            required
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

          <SubmitButton size="lg" className="w-full">
            Create company
          </SubmitButton>
        </form>

        <p className="text-center text-small text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-[600] text-primary-600">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

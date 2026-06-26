"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { Building2, User, Mail, Lock } from "lucide-react";
import { signupCompany } from "@/modules/auth/actions";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

const AUTH_BUTTON =
  "w-full bg-gradient-to-r from-primary-600 to-fuchsia-500 hover:from-primary-700 hover:to-fuchsia-600 shadow-md";

export function SignupForm() {
  const [state, formAction] = useFormState(signupCompany, null);

  return (
    <div className="space-y-6">
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
          <Input
            name="companyName"
            autoComplete="organization"
            placeholder="Acme Stores"
            leadingIcon={<Building2 />}
            required
          />
        </FormField>

        <FormField
          id="fullName"
          label="Your full name"
          required
          error={state?.fieldErrors?.fullName}
        >
          <Input
            name="fullName"
            autoComplete="name"
            placeholder="Ada Obi"
            leadingIcon={<User />}
            required
          />
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
            placeholder="you@company.com"
            leadingIcon={<Mail />}
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
          <PasswordInput
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            leadingIcon={<Lock />}
            required
          />
        </FormField>

        <SubmitButton size="lg" className={AUTH_BUTTON}>
          Create company
        </SubmitButton>
      </form>

      <p className="text-center text-small text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-[600] text-primary-600 hover:text-primary-700">
          Log in
        </Link>
      </p>
    </div>
  );
}

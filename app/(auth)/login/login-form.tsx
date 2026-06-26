"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { login } from "@/modules/auth/actions";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

/** Gradient CTA shared across the auth forms — echoes the brand panel. */
const AUTH_BUTTON =
  "w-full bg-gradient-to-r from-primary-600 to-fuchsia-500 hover:from-primary-700 hover:to-fuchsia-600 shadow-md";

export function LoginForm() {
  const [state, formAction] = useFormState(login, null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Welcome back</h1>
        <p className="mt-1 text-small text-text-muted">
          Sign in to your business.
        </p>
      </div>

      {state?.error && <Alert>{state.error}</Alert>}

      <form action={formAction} className="space-y-4" noValidate>
        <FormField id="email" label="Email" error={state?.fieldErrors?.email}>
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
          error={state?.fieldErrors?.password}
        >
          <PasswordInput
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            leadingIcon={<Lock />}
            required
          />
        </FormField>

        <SubmitButton size="lg" className={AUTH_BUTTON}>
          Log in
        </SubmitButton>
      </form>

      <p className="text-center text-small text-text-muted">
        New to TrustOps?{" "}
        <Link href="/signup" className="font-[600] text-primary-600 hover:text-primary-700">
          Create a company
        </Link>
      </p>
    </div>
  );
}

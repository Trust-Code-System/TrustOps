"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { submitSupportRequest } from "@/modules/support/actions";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";

/**
 * Help Center contact form. Posts to the platform support inbox (visible only to
 * the operator at /admin). The reporter's name and company are taken from their
 * session server-side; only the reply-to email is editable here.
 */
export function SupportForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useFormState(submitSupportRequest, null);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast("Message sent. We'll get back to you.");
      formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}

      <FormField id="subject" label="Subject" required error={state?.fieldErrors?.subject}>
        <Input id="subject" name="subject" placeholder="What do you need help with?" />
      </FormField>

      <FormField
        id="email"
        label="Reply-to email"
        error={state?.fieldErrors?.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          placeholder="you@business.com"
        />
      </FormField>

      <FormField id="message" label="Message" required error={state?.fieldErrors?.message}>
        <Textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Describe the issue or question in as much detail as you can."
        />
      </FormField>

      <div className="flex justify-end">
        <SubmitButton>Send message</SubmitButton>
      </div>
    </form>
  );
}

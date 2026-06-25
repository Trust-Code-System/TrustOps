"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button bound to the enclosing <form>'s pending state via useFormStatus.
 * Shows the loading spinner (width-locked) while the server action runs.
 */
export function SubmitButton(props: ButtonProps) {
  const { pending } = useFormStatus();
  return <Button type="submit" isLoading={pending} {...props} />;
}

"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSessionContext,
  requirePlatformAdmin,
} from "@/modules/auth/session";
import type { ActionState } from "@/modules/auth/schemas";
import type { SupportRequest } from "@/modules/shared/types";
import { EmailProvider } from "@/modules/messaging/email";
import { WhatsAppProvider } from "@/modules/messaging/whatsapp";
import { supportRequestSchema } from "./schemas";

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path[0];
    if (typeof k === "string" && !out[k]) out[k] = i.message;
  }
  return out;
}

function adminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

function adminWhatsappNumbers(): string[] {
  return (process.env.PLATFORM_ADMIN_WHATSAPP ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

/**
 * Sanitize a value for a WhatsApp template parameter: Meta rejects newlines,
 * tabs, and runs of 4+ spaces in body params, so collapse whitespace and cap
 * the length.
 */
function tmplParam(value: string, max = 600): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Submit a Help Center report. Any signed-in user may send one. The row is
 * written with the service-role client because support_requests is a
 * cross-tenant table with no RLS policies (only the platform admin reads it).
 * We snapshot the reporter's identity from the trusted session, never the form.
 */
export async function submitSupportRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Your session has expired. Log in again." };

  const parsed = supportRequestSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  // Reporter's company name, snapshotted so the report stays self-contained.
  const supabase = createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", ctx.profile.company_id)
    .single();

  const email = parsed.data.email?.trim() || ctx.email || null;

  const admin = createAdminClient();
  const { error } = await admin.from("support_requests").insert({
    company_id: ctx.profile.company_id,
    user_id: ctx.userId,
    company_name: company?.name ?? null,
    name: ctx.profile.full_name,
    email,
    subject: parsed.data.subject,
    message: parsed.data.message,
    status: "open",
  });

  if (error) return { error: "Could not send your message. Please try again." };

  // Best-effort notifications to the platform admin(s) over email and WhatsApp.
  // Never blocks the user: unconfigured channels log in dev, failures are
  // swallowed, and the report is already saved regardless.
  const notice = [
    `New Help Center report from ${ctx.profile.full_name} (${email ?? "no email"})`,
    company?.name ? `Company: ${company.name}` : "",
    ``,
    `Subject: ${parsed.data.subject}`,
    ``,
    parsed.data.message,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const emails = adminEmails();
    if (emails.length > 0) {
      const provider = new EmailProvider();
      await Promise.all(
        emails.map((to) =>
          provider.send({
            channel: "email",
            to,
            companyId: ctx.profile.company_id,
            template: "support_request",
            body: notice,
          }),
        ),
      );
    }
  } catch {
    // email is best-effort
  }

  try {
    const numbers = adminWhatsappNumbers();
    if (numbers.length > 0) {
      const provider = new WhatsAppProvider();
      // Cold alerts to the operator need an approved template. When its name is
      // configured we send the template; otherwise we fall back to free-form
      // text (delivers only inside a 24h window / simulated in dev).
      const templateName = process.env.PLATFORM_ADMIN_WHATSAPP_TEMPLATE?.trim();
      const whatsappTemplate = templateName
        ? {
            name: templateName,
            language:
              process.env.PLATFORM_ADMIN_WHATSAPP_TEMPLATE_LANG?.trim() || "en",
            // Template body must use {{1}} {{2}} {{3}} in this order.
            bodyParams: [
              tmplParam(
                `${ctx.profile.full_name}${company?.name ? ` (${company.name})` : ""}`,
                120,
              ),
              tmplParam(parsed.data.subject, 140),
              tmplParam(parsed.data.message),
            ],
          }
        : undefined;

      await Promise.all(
        numbers.map((to) =>
          provider.send({
            channel: "whatsapp",
            to,
            companyId: ctx.profile.company_id,
            template: "support_request",
            body: notice,
            whatsappTemplate,
          }),
        ),
      );
    }
  } catch {
    // WhatsApp is best-effort
  }

  return { ok: true };
}

/** List all support requests, newest first. Platform admin only. */
export async function listSupportRequests(): Promise<SupportRequest[]> {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as SupportRequest[];
}

/** Flip a request between open and resolved. Platform admin only. */
export async function setSupportRequestStatus(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "open" && status !== "resolved")) return;

  const admin = createAdminClient();
  await admin.from("support_requests").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

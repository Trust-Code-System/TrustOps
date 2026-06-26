import type { Metadata } from "next";
import { Mail, Inbox, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { requirePlatformAdmin } from "@/modules/auth/session";
import {
  listSupportRequests,
  setSupportRequestStatus,
} from "@/modules/support/actions";

export const metadata: Metadata = {
  title: "Admin · TrustOps",
};

// Always render fresh: this is an operator inbox, not a cacheable page.
export const dynamic = "force-dynamic";

/**
 * Platform admin area (route "/admin"). Gated to the TrustOps operator only via
 * requirePlatformAdmin() — anyone else gets a 404, so the page's existence stays
 * hidden. Shows every Help Center report across all tenants (read through the
 * service-role client) and lets the operator resolve / reopen each one.
 */
export default async function AdminPage() {
  await requirePlatformAdmin();
  const requests = await listSupportRequests();
  const openCount = requests.filter((r) => r.status === "open").length;

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-600 text-text-on-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-display">Admin</h1>
          <p className="mt-1 text-body text-text-secondary">
            Help Center reports from every business using TrustOps.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Stat label="Open" value={openCount} tone="warning" />
        <Stat label="Total" value={requests.length} tone="neutral" />
      </div>

      <section aria-label="Support requests" className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Inbox}
                title="No reports yet"
                description="When someone submits a message from the Help Center, it lands here."
              />
            </CardContent>
          </Card>
        ) : (
          requests.map((r) => {
            const nextStatus = r.status === "open" ? "resolved" : "open";
            return (
              <Card key={r.id}>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-h3 text-text-primary">{r.subject}</h2>
                        <Badge tone={r.status === "open" ? "warning" : "success"}>
                          {r.status === "open" ? "Open" : "Resolved"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-small text-text-muted">
                        {r.name}
                        {r.company_name ? ` · ${r.company_name}` : ""}
                        {" · "}
                        {new Date(r.created_at).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {r.email && (
                        <a
                          href={`mailto:${r.email}?subject=Re: ${encodeURIComponent(r.subject)}`}
                          className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-small font-[600] text-primary-700 hover:bg-gray-100"
                        >
                          <Mail className="h-4 w-4" aria-hidden="true" />
                          Reply
                        </a>
                      )}
                      <form action={setSupportRequestStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={nextStatus} />
                        <SubmitButton variant="secondary" size="sm">
                          {r.status === "open" ? "Mark resolved" : "Reopen"}
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-body text-text-secondary">
                    {r.message}
                  </p>
                  {r.email && (
                    <p className="text-small text-text-muted">
                      Reply-to: <span className="text-text-secondary">{r.email}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "warning" | "neutral";
}) {
  return (
    <Card className="min-w-[140px] flex-1">
      <CardContent className="py-4">
        <p className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
          {label}
        </p>
        <p
          className={
            "mt-1 text-metric tabular " +
            (tone === "warning" && value > 0
              ? "text-warning-700"
              : "text-text-primary")
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

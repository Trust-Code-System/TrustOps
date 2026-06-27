"use client";

import { useState } from "react";
import { Copy, ExternalLink, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { setStorefront } from "@/modules/storefront/actions";

export function StorefrontManager({
  initialEnabled,
  initialWhatsapp,
  initialToken,
}: {
  initialEnabled: boolean;
  initialWhatsapp: string;
  initialToken: string | null;
}) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [token, setToken] = useState(initialToken);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/shop/${token}` : null;

  async function save() {
    setError(null);
    setSaving(true);
    const res = await setStorefront({ enabled, whatsapp: whatsapp.trim() || null });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    setToken(res.token);
    toast("Storefront updated", "success");
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied", "success");
    } catch {
      toast("Could not copy", "error");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        {error && <Alert>{error}</Alert>}

        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-body-strong text-text-primary">Publish catalog</span>
            <span className="block text-small text-text-muted">
              When on, anyone with the link can view your active, priced products.
            </span>
          </span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5 accent-primary-600"
            aria-label="Publish catalog"
          />
        </label>

        <FormField id="whatsapp" label="WhatsApp order number" helper="Customers tap 'Order on WhatsApp' to message this number. Include the country code, e.g. 23480…">
          <Input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="2348012345678"
            inputMode="tel"
          />
        </FormField>

        <div className="flex justify-end">
          <Button onClick={save} isLoading={saving}>
            Save
          </Button>
        </div>

        {enabled && link && (
          <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
            <p className="mb-2 flex items-center gap-2 text-body-strong text-text-primary">
              <Store className="h-4 w-4" /> Your catalog link
            </p>
            <p className="break-all rounded-md bg-surface-card p-2 text-small text-text-secondary">
              {link}
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={copy}>
                <Copy /> Copy link
              </Button>
              <a
                href={link}
                target="_blank"
                rel="noopener"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border-default px-4 text-body-strong text-text-secondary hover:bg-surface-card"
              >
                <ExternalLink className="h-4 w-4" /> Preview
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

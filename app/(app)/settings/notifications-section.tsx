"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { updateNotificationSettings } from "@/modules/notifications/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import type { NotificationChannel, NotificationSettings } from "@/modules/shared/types";

const CHANNELS: { value: NotificationChannel; label: string }[] = [
  { value: "in_app", label: "In-app" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

function ChannelSelect({ name, value }: { name: string; value: NotificationChannel }) {
  return (
    <Select name={name} defaultValue={value} className="h-9 min-h-0 w-36">
      {CHANNELS.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </Select>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-body">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-[var(--color-primary-600)]"
      />
      {label}
    </label>
  );
}

export function NotificationsSection({
  settings,
  canManage,
}: {
  settings: NotificationSettings;
  canManage: boolean;
}) {
  const [state, formAction] = useFormState(updateNotificationSettings, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.ok) toast("Notification settings saved");
  }, [state, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications & automation</CardTitle>
      </CardHeader>
      <CardContent>
        {!canManage ? (
          <p className="text-small text-text-muted">
            Only an owner or manager can change notification settings.
          </p>
        ) : (
          <form action={formAction} className="space-y-6" noValidate>
            {state?.error && <Alert>{state.error}</Alert>}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Toggle name="remindersEnabled" label="Invoice reminders" defaultChecked={settings.reminders_enabled} />
                <ChannelSelect name="reminderChannel" value={settings.reminder_channel} />
              </div>
              <FormField id="reminderDaysBefore" label="Remind this many days before due">
                <Input
                  name="reminderDaysBefore"
                  type="number"
                  inputMode="numeric"
                  numeric
                  min={0}
                  max={60}
                  defaultValue={settings.reminder_days_before}
                  className="w-24"
                />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
              <Toggle name="stockAlertsEnabled" label="Low-stock alerts" defaultChecked={settings.stock_alerts_enabled} />
              <ChannelSelect name="stockAlertChannel" value={settings.stock_alert_channel} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
              <Toggle name="dailyReportEnabled" label="Daily report" defaultChecked={settings.daily_report_enabled} />
              <ChannelSelect name="dailyReportChannel" value={settings.daily_report_channel} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
              <Toggle name="receiptsEnabled" label="Send receipts on sale" defaultChecked={settings.receipts_enabled} />
              <ChannelSelect name="receiptChannel" value={settings.receipt_channel} />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border-subtle pt-4">
              <FormField id="quietHoursStart" label="Quiet hours start (0–23)">
                <Input
                  name="quietHoursStart"
                  type="number"
                  inputMode="numeric"
                  numeric
                  min={0}
                  max={23}
                  defaultValue={settings.quiet_hours_start ?? ""}
                  placeholder="—"
                />
              </FormField>
              <FormField id="quietHoursEnd" label="Quiet hours end (0–23)">
                <Input
                  name="quietHoursEnd"
                  type="number"
                  inputMode="numeric"
                  numeric
                  min={0}
                  max={23}
                  defaultValue={settings.quiet_hours_end ?? ""}
                  placeholder="—"
                />
              </FormField>
            </div>

            <FormField id="senderIdentity" label="Sender identity" helper="Business name shown on messages.">
              <Input name="senderIdentity" defaultValue={settings.sender_identity ?? ""} />
            </FormField>

            <div className="flex justify-end">
              <SubmitButton>Save settings</SubmitButton>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

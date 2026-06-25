import { z } from "zod";

const channel = z.enum(["whatsapp", "email", "in_app"]);

export const notificationSettingsSchema = z.object({
  remindersEnabled: z.boolean(),
  reminderChannel: channel,
  reminderDaysBefore: z.number().int().min(0).max(60),
  stockAlertsEnabled: z.boolean(),
  stockAlertChannel: channel,
  dailyReportEnabled: z.boolean(),
  dailyReportChannel: channel,
  receiptsEnabled: z.boolean(),
  receiptChannel: channel,
  quietHoursStart: z.number().int().min(0).max(23).nullable(),
  quietHoursEnd: z.number().int().min(0).max(23).nullable(),
  senderIdentity: z.string().trim().max(80).nullable(),
});

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

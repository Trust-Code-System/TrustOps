import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional().nullable(),
  text: z.string().trim().min(1, "Type a message").max(2000, "Message is too long"),
});

export const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  // Monthly spend cap in whole US dollars; null/blank = no cap.
  capUsd: z
    .number()
    .int()
    .min(0)
    .max(100000)
    .nullable(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;

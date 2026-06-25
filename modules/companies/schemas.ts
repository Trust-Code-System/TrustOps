import { z } from "zod";

export const updateCompanySchema = z.object({
  name: z.string().trim().min(2, "Company name is too short").max(120),
  currency: z.string().trim().length(3, "Use a 3-letter currency code").toUpperCase(),
});

export const branchSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Branch name is too short").max(120),
  isPrimary: z.coerce.boolean().optional().default(false),
});

// Owners are created at sign-up only; invites are limited to these roles.
export const invitableRoles = ["manager", "staff", "accountant"] as const;

export const inviteStaffSchema = z.object({
  fullName: z.string().trim().min(2, "Enter their full name").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  role: z.enum(invitableRoles),
});

export const updateRoleSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(invitableRoles),
});

export const setActiveSchema = z.object({
  profileId: z.string().uuid(),
  isActive: z.coerce.boolean(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type BranchInput = z.infer<typeof branchSchema>;
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { UserPlus, Users } from "lucide-react";
import {
  inviteStaff,
  updateStaffRole,
  setStaffActive,
} from "@/modules/companies/actions";
import { invitableRoles } from "@/modules/companies/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { titleCase } from "@/modules/shared/format";
import type { Profile } from "@/modules/shared/types";

export function StaffSection({
  staff,
  canManage,
  currentUserId,
}: {
  staff: Profile[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const columns: Column<Profile>[] = [
    {
      key: "name",
      header: "Name",
      hideLabelOnMobile: true,
      cell: (p) => (
        <span>
          {p.full_name}
          {p.id === currentUserId && (
            <span className="ml-2 text-caption text-text-muted">You</span>
          )}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (p) =>
        canManage && p.role !== "owner" && p.id !== currentUserId ? (
          <RolePicker profile={p} />
        ) : (
          <span className="capitalize">{p.role}</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) =>
        p.is_active ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="danger">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) =>
        canManage && p.role !== "owner" && p.id !== currentUserId ? (
          <ActiveToggle profile={p} />
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff</CardTitle>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => setInviteOpen(true)}>
            <UserPlus /> Invite staff
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          rows={staff}
          rowKey={(p) => p.id}
          emptyState={
            <EmptyState
              icon={Users}
              title="No teammates yet"
              description="Invite a manager or staff member to help run the business."
              action={
                canManage ? (
                  <Button onClick={() => setInviteOpen(true)}>Invite staff</Button>
                ) : undefined
              }
            />
          }
        />
      </CardContent>

      {canManage && (
        <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      )}
    </Card>
  );
}

function InviteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(inviteStaff, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.ok) {
      toast("Invite sent");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title="Invite staff" description="They'll get an email to set a password and join.">
      <form action={formAction} className="space-y-4" noValidate>
        {state?.error && <Alert>{state.error}</Alert>}
        <FormField id="fullName" label="Full name" required error={state?.fieldErrors?.fullName}>
          <Input name="fullName" autoComplete="name" required />
        </FormField>
        <FormField id="email" label="Email" required error={state?.fieldErrors?.email}>
          <Input name="email" type="email" inputMode="email" required />
        </FormField>
        <FormField id="role" label="Role" required error={state?.fieldErrors?.role}>
          <Select name="role" defaultValue="staff" required>
            {invitableRoles.map((r) => (
              <option key={r} value={r}>
                {titleCase(r)}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton>Send invite</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

/** Inline role change — submits on change. */
function RolePicker({ profile }: { profile: Profile }) {
  const [state, formAction] = useFormState(updateStaffRole, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.ok) toast("Role updated");
    if (state?.error) toast(state.error, "error");
  }, [state, toast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="profileId" value={profile.id} />
      <Select
        name="role"
        defaultValue={profile.role}
        aria-label={`Role for ${profile.full_name}`}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 min-h-0 w-auto"
      >
        {invitableRoles.map((r) => (
          <option key={r} value={r}>
            {titleCase(r)}
          </option>
        ))}
      </Select>
    </form>
  );
}

/** Activate / deactivate toggle. */
function ActiveToggle({ profile }: { profile: Profile }) {
  const [state, formAction] = useFormState(setStaffActive, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.ok) toast(profile.is_active ? "Staff deactivated" : "Staff activated");
    if (state?.error) toast(state.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="profileId" value={profile.id} />
      <input type="hidden" name="isActive" value={profile.is_active ? "false" : "true"} />
      <SubmitButton size="sm" variant={profile.is_active ? "ghost" : "secondary"}>
        {profile.is_active ? "Deactivate" : "Activate"}
      </SubmitButton>
    </form>
  );
}

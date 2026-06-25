"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerFormModal } from "./customer-form-modal";
import type { Customer } from "@/modules/shared/types";

export function CustomersClient({
  customers,
  query,
}: {
  customers: Customer[];
  query: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(query);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  function runSearch(value: string) {
    setTerm(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      router.replace(`/customers${params.size ? `?${params}` : ""}`);
    });
  }

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Name",
      hideLabelOnMobile: true,
      cell: (c) => c.full_name,
    },
    { key: "phone", header: "Phone", cell: (c) => c.phone },
    {
      key: "email",
      header: "Email",
      cell: (c) => c.email ?? <span className="text-text-muted">—</span>,
    },
  ];

  const isEmptySearch = customers.length === 0 && query.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-display">Customers</h1>
        <Button onClick={openAdd}>
          <Plus /> Add customer
        </Button>
      </div>

      <div className="relative max-w-form">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <Input
          value={term}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="Search by name or phone"
          aria-label="Search customers"
          className="pl-10"
        />
      </div>

      <div aria-busy={pending ? "true" : undefined}>
        {isEmptySearch ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`No customers match "${query}". Try a different name or phone.`}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={customers}
            rowKey={(c) => c.id}
            onRowClick={(c) => router.push(`/customers/${c.id}`)}
            emptyState={
              <EmptyState
                icon={Users}
                title="No customers yet"
                description="Add your first customer to start recording sales."
                action={<Button onClick={openAdd}>Add customer</Button>}
              />
            }
          />
        )}
      </div>

      <CustomerFormModal
        key={editing?.id ?? "new"}
        open={open}
        onClose={() => setOpen(false)}
        customer={editing}
      />
    </div>
  );
}

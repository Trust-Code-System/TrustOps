import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/modules/auth/session";
import { listCustomers } from "@/modules/customers/queries";
import { listProducts } from "@/modules/inventory/queries";
import type { Branch, Product } from "@/modules/shared/types";
import { RecordSaleForm } from "./record-sale-form";

/** Record sale — target of the FAB. The most optimized screen (brief #8). */
export default async function NewSalePage() {
  await requireSession();
  const supabase = createClient();

  const [customers, products, { data: branches }] = await Promise.all([
    listCustomers(),
    listProducts({ active: "active" }),
    supabase
      .from("branches")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("name"),
  ]);

  return (
    <RecordSaleForm
      customers={customers}
      branches={(branches as Branch[] | null) ?? []}
      products={products as Product[]}
    />
  );
}

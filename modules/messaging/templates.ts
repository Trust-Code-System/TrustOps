import { formatNaira } from "@/lib/money";

type Payload = Record<string, unknown>;

const str = (p: Payload, k: string, d = "") => (p[k] == null ? d : String(p[k]));
const num = (p: Payload, k: string) => (typeof p[k] === "number" ? (p[k] as number) : 0);

/**
 * Render a notification template + payload to a plain-text body. Money values in
 * the payload are integer kobo and formatted to ₦ here, at display time.
 */
export function renderTemplate(template: string, payload: Payload): string {
  switch (template) {
    case "invoice_reminder":
      return `Hi ${str(payload, "customer_name", "there")}, invoice ${str(
        payload,
        "invoice_number",
      )} of ${formatNaira(num(payload, "balance"))} is ${str(
        payload,
        "stage",
        "due",
      )}. Kindly arrange payment. Thank you — ${str(payload, "company_name")}.`;

    case "receipt":
      return `Thank you for your purchase. Receipt ${str(
        payload,
        "invoice_number",
      )}: ${formatNaira(num(payload, "total"))}. — ${str(payload, "company_name")}.`;

    case "stock_alert":
      return `Low stock: ${str(payload, "product_name")} at ${str(
        payload,
        "branch_name",
      )} is down to ${num(payload, "quantity")} (threshold ${num(
        payload,
        "threshold",
      )}).`;

    case "daily_report":
      return `Daily summary — revenue ${formatNaira(
        num(payload, "revenue"),
      )}, ${num(payload, "sales_count")} sales, unpaid ${formatNaira(
        num(payload, "unpaid_total"),
      )}, ${num(payload, "low_stock_count")} low-stock items.`;

    default:
      return str(payload, "message", `Notification: ${template}`);
  }
}

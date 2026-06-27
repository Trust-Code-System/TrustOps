/**
 * Shared domain types. These mirror the database schema (see
 * /supabase/migrations). Money fields are integer kobo. Hand-maintained for now;
 * a future seam is to generate these from the DB with `supabase gen types`.
 */

export type UUID = string;
export type Kobo = number;
export type ISODateTime = string;

export type UserRole = "owner" | "manager" | "staff" | "accountant";

export type InvoiceStatus =
  | "draft"
  | "unpaid"
  | "partial"
  | "paid"
  | "overdue"
  | "archived";

export type PaymentMethod = "cash" | "transfer" | "card" | "other";

export type StockMovementType =
  | "sale"
  | "restock"
  | "adjustment"
  | "transfer_in"
  | "transfer_out"
  | "return";

export type NotificationChannel = "whatsapp" | "email" | "in_app";
export type NotificationStatus = "queued" | "sent" | "failed" | "delivered";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "dead";

// NOTE: these are `type` aliases (not `interface`) on purpose — object type
// aliases carry an implicit index signature, so they satisfy the Supabase
// client's `Record<string, unknown>` schema constraint. Interfaces do not.

export type Company = {
  id: UUID;
  name: string;
  currency: string; // ISO 4217, default 'NGN'
  storefront_token: string | null;
  storefront_enabled: boolean;
  storefront_whatsapp: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type Branch = {
  id: UUID;
  company_id: UUID;
  name: string;
  is_primary: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type Profile = {
  id: UUID; // = auth.users.id
  company_id: UUID;
  branch_id: UUID | null;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type Customer = {
  id: UUID;
  company_id: UUID;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type Invoice = {
  id: UUID;
  company_id: UUID;
  branch_id: UUID | null;
  customer_id: UUID;
  invoice_number: string; // per-company sequential, e.g. INV-0001
  status: InvoiceStatus;
  subtotal: Kobo;
  discount: Kobo;
  total: Kobo;
  issued_at: ISODateTime;
  due_at: ISODateTime | null;
  deleted_at: ISODateTime | null;
  client_uuid: UUID | null; // offline-capture idempotency key (migration 0014)
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type InvoiceItem = {
  id: UUID;
  company_id: UUID;
  invoice_id: UUID;
  product_id: UUID | null;
  description: string;
  quantity: number;
  unit_price: Kobo;
  line_total: Kobo;
  created_at: ISODateTime;
};

export type Product = {
  id: UUID;
  company_id: UUID;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  cost_price: Kobo;
  sell_price: Kobo;
  is_active: boolean;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type Inventory = {
  id: UUID;
  company_id: UUID;
  branch_id: UUID;
  product_id: UUID;
  quantity: number;
  low_stock_threshold: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type StockMovement = {
  id: UUID;
  company_id: UUID;
  branch_id: UUID;
  product_id: UUID;
  type: StockMovementType;
  quantity_delta: number;
  reason: string | null;
  reference: string | null;
  actor_id: UUID | null;
  created_at: ISODateTime;
};

export type Payment = {
  id: UUID;
  company_id: UUID;
  invoice_id: UUID;
  amount: Kobo;
  method: PaymentMethod;
  reference: string | null;
  paid_at: ISODateTime;
  created_at: ISODateTime;
};

export type PaymentProvider = "paystack" | "monnify" | "simulated";
export type PaymentIntentStatus = "pending" | "success" | "failed" | "expired";

/** An online charge for one invoice (pay-by-link). See migration 0013. */
export type PaymentIntent = {
  id: UUID;
  company_id: UUID;
  invoice_id: UUID;
  provider: PaymentProvider;
  reference: string;
  provider_reference: string | null;
  amount: Kobo;
  status: PaymentIntentStatus;
  authorization_url: string | null;
  public_token: string;
  customer_email: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  paid_at: ISODateTime | null;
};

export type AuditLog = {
  id: UUID;
  company_id: UUID;
  actor_id: UUID | null;
  entity_type: string;
  entity_id: UUID;
  action: string;
  metadata: Record<string, unknown>;
  created_at: ISODateTime;
};

export type NotificationSettings = {
  company_id: UUID;
  reminders_enabled: boolean;
  reminder_channel: NotificationChannel;
  reminder_days_before: number;
  stock_alerts_enabled: boolean;
  stock_alert_channel: NotificationChannel;
  daily_report_enabled: boolean;
  daily_report_channel: NotificationChannel;
  receipts_enabled: boolean;
  receipt_channel: NotificationChannel;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  sender_identity: string | null;
  updated_at: ISODateTime;
};

export type Notification = {
  id: UUID;
  company_id: UUID;
  channel: NotificationChannel;
  template: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  target: string | null;
  scheduled_for: ISODateTime;
  sent_at: ISODateTime | null;
  read_at: ISODateTime | null;
  error: string | null;
  attempts: number;
  dedupe_key: string | null;
  created_at: ISODateTime;
};

export type Job = {
  id: UUID;
  company_id: UUID | null;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  run_at: ISODateTime;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  locked_at: ISODateTime | null;
  locked_by: string | null;
  dedupe_key: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type JobRun = {
  id: UUID;
  job_id: UUID;
  company_id: UUID | null;
  attempt: number;
  status: string;
  error: string | null;
  finished_at: ISODateTime;
};

export type ScheduledJob = {
  id: UUID;
  name: string;
  type: string;
  interval_seconds: number;
  enabled: boolean;
  last_run_at: ISODateTime | null;
  next_run_at: ISODateTime;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type DailyMetric = {
  id: UUID;
  company_id: UUID;
  branch_id: UUID | null;
  date: string;
  revenue: Kobo;
  sales_count: number;
  new_customers: number;
  expenses: Kobo;
  cogs: Kobo;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type Expense = {
  id: UUID;
  company_id: UUID;
  branch_id: UUID | null;
  category: string;
  amount: Kobo;
  description: string | null;
  spent_at: ISODateTime;
  created_by: UUID | null;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

/** Shape returned by the record_sale RPC. */
export type RecordSaleResult = {
  invoice: Invoice;
  items: InvoiceItem[];
  payment: Payment | null;
};

// --- Phase 6: AI assistant -------------------------------------------------
// AI provider spend is genuinely USD, so it is integer USD cents (not kobo).

export type AiSettings = {
  company_id: UUID;
  enabled: boolean;
  monthly_cap_usd_cents: number | null;
  updated_at: ISODateTime;
};

export type AiConversation = {
  id: UUID;
  company_id: UUID;
  user_id: UUID;
  title: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  deleted_at: ISODateTime | null;
};

/** A figure cited behind an assistant answer (for grounding/transparency). */
export type AiSource = { tool: string; label: string; value: string };

export type AiMessage = {
  id: UUID;
  company_id: UUID;
  user_id: UUID;
  conversation_id: UUID;
  role: "user" | "assistant";
  content: string;
  sources: AiSource[];
  created_at: ISODateTime;
};

export type AiUsage = {
  id: UUID;
  company_id: UUID;
  user_id: UUID | null;
  conversation_id: UUID | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd_cents: number;
  created_at: ISODateTime;
};

export type AiInsightSeverity = "positive" | "warning" | "danger" | "neutral";

export type AiInsight = {
  id: UUID;
  company_id: UUID;
  kind: string;
  severity: AiInsightSeverity;
  title: string;
  body: string;
  created_at: ISODateTime;
};

export type SupportRequestStatus = "open" | "resolved";

/**
 * A Help Center report sent from any tenant to the platform operator. Stored in
 * a cross-tenant table that only the service-role client (gated to the platform
 * admin in app code) can read — see supabase/migrations/0011_support.sql.
 */
export type SupportRequest = {
  id: UUID;
  company_id: UUID | null;
  user_id: UUID | null;
  company_name: string | null;
  name: string;
  email: string | null;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  created_at: ISODateTime;
};

export type AiActionType =
  | "send_reminder"
  | "send_receipt"
  | "record_payment"
  | "create_payment_link";
export type AiActionStatus = "pending" | "approved" | "rejected" | "executed" | "failed";

/** A copilot-proposed action awaiting the user's yes/no. See migration 0016. */
export type AiAction = {
  id: UUID;
  company_id: UUID;
  user_id: UUID;
  conversation_id: UUID | null;
  type: AiActionType;
  params: Record<string, unknown>;
  summary: string;
  status: AiActionStatus;
  result: Record<string, unknown> | null;
  created_at: ISODateTime;
  decided_at: ISODateTime | null;
};

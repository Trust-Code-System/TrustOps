/**
 * Minimal hand-written Database type for typing the Supabase client.
 * Seam: replace with `supabase gen types typescript` output once the project
 * is linked. Covers the tables built in Phase 0 + the schema for Phase 1.
 */
import type {
  Company,
  Branch,
  Profile,
  Customer,
  Invoice,
  InvoiceItem,
  Payment,
  AuditLog,
  Product,
  Inventory,
  StockMovement,
  NotificationSettings,
  Notification,
  Job,
  JobRun,
  ScheduledJob,
  RecordSaleResult,
  DailyMetric,
  Expense,
  AiSettings,
  AiConversation,
  AiMessage,
  AiUsage,
  AiInsight,
  SupportRequest,
  PaymentIntent,
  AiAction,
} from "@/modules/shared/types";

type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

interface Table<T> {
  Row: Row<T>;
  Insert: Insert<T>;
  Update: Update<T>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      companies: Table<Company>;
      branches: Table<Branch>;
      profiles: Table<Profile>;
      customers: Table<Customer>;
      invoices: Table<Invoice>;
      invoice_items: Table<InvoiceItem>;
      payments: Table<Payment>;
      audit_logs: Table<AuditLog>;
      products: Table<Product>;
      inventory: Table<Inventory>;
      stock_movements: Table<StockMovement>;
      notification_settings: Table<NotificationSettings>;
      notifications: Table<Notification>;
      jobs: Table<Job>;
      job_runs: Table<JobRun>;
      scheduled_jobs: Table<ScheduledJob>;
      daily_metrics: Table<DailyMetric>;
      expenses: Table<Expense>;
      ai_settings: Table<AiSettings>;
      ai_conversations: Table<AiConversation>;
      ai_messages: Table<AiMessage>;
      ai_usage: Table<AiUsage>;
      ai_insights: Table<AiInsight>;
      support_requests: Table<SupportRequest>;
      payment_intents: Table<PaymentIntent>;
      ai_actions: Table<AiAction>;
    };
    Views: Record<string, never>;
    Functions: {
      auth_company_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      bootstrap_company: {
        Args: { p_company_name: string; p_full_name: string };
        Returns: string;
      };
      record_sale: {
        Args: { p_payload: unknown };
        Returns: RecordSaleResult;
      };
      record_payment: {
        Args: { p_payload: unknown };
        Returns: unknown;
      };
      archive_invoice: {
        Args: { p_invoice_id: string };
        Returns: undefined;
      };
      create_product: {
        Args: { p_payload: unknown };
        Returns: Product;
      };
      update_product: {
        Args: { p_payload: unknown };
        Returns: Product;
      };
      adjust_stock: {
        Args: { p_payload: unknown };
        Returns: Inventory;
      };
      transfer_stock: {
        Args: { p_payload: unknown };
        Returns: unknown;
      };
      enqueue_job: {
        Args: {
          p_type: string;
          p_payload?: unknown;
          p_company?: string | null;
          p_run_at?: string;
          p_dedupe?: string | null;
          p_max?: number;
        };
        Returns: string | null;
      };
      enqueue_notification: {
        Args: {
          p_company: string;
          p_channel: string;
          p_template: string;
          p_payload: unknown;
          p_target?: string | null;
          p_dedupe?: string | null;
          p_scheduled?: string;
        };
        Returns: string | null;
      };
      claim_job: { Args: { p_worker: string }; Returns: Job[] };
      complete_job: { Args: { p_job: string }; Returns: undefined };
      fail_job: { Args: { p_job: string; p_error: string }; Returns: undefined };
      requeue_stuck_jobs: { Args: { p_timeout?: string }; Returns: number };
      tick_scheduler: { Args: Record<string, never>; Returns: number };
      mark_notification_result: {
        Args: { p_id: string; p_ok: boolean; p_error?: string | null };
        Returns: undefined;
      };
      transition_overdue_invoices: {
        Args: Record<string, never>;
        Returns: number;
      };
      mark_notification_read: { Args: { p_id: string }; Returns: undefined };
      mark_all_notifications_read: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      save_expense: {
        Args: { p_payload: unknown };
        Returns: Expense;
      };
      archive_expense: {
        Args: { p_expense_id: string };
        Returns: undefined;
      };
      aggregate_daily_metrics: {
        Args: { p_from?: string; p_to?: string };
        Returns: number;
      };
      analytics_top_products: {
        Args: { p_from: string; p_to: string; p_limit?: number };
        Returns: {
          product_id: string;
          product_name: string;
          quantity_sold: number;
          revenue: number;
        }[];
      };
      analytics_top_customers: {
        Args: { p_from: string; p_to: string; p_limit?: number };
        Returns: {
          customer_id: string;
          customer_name: string;
          spend: number;
          invoice_count: number;
        }[];
      };
      save_ai_settings: {
        Args: { p_enabled: boolean; p_cap_usd_cents: number | null };
        Returns: AiSettings;
      };
      ai_month_usd_cents: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_payment_intent: {
        Args: { p_payload: unknown };
        Returns: PaymentIntent;
      };
      update_payment_intent_link: {
        Args: { p_payload: unknown };
        Returns: undefined;
      };
      reconcile_gateway_payment: {
        Args: { p_payload: unknown };
        Returns: unknown;
      };
      get_public_invoice: {
        Args: { p_ref: string };
        Returns: unknown;
      };
      propose_ai_action: {
        Args: { p_type: string; p_params: unknown; p_summary: string; p_conversation: string | null };
        Returns: AiAction;
      };
      set_storefront: {
        Args: { p_enabled: boolean; p_whatsapp: string | null };
        Returns: unknown;
      };
      get_public_catalog: {
        Args: { p_token: string };
        Returns: unknown;
      };
      set_ai_action_status: {
        Args: { p_id: string; p_status: string; p_result: unknown };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: "owner" | "manager" | "staff" | "accountant";
      invoice_status:
        | "draft"
        | "unpaid"
        | "partial"
        | "paid"
        | "overdue"
        | "archived";
      payment_method: "cash" | "transfer" | "card" | "other";
    };
  };
}

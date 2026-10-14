import { getSupabaseAdmin } from "./supabase";

export type FinanceTransaction = {
  id: number;
  description: string;
  category: string;
  counterparty: string;
  kind: "income" | "expense";
  amountCents: number;
  occurredAt: string;
  createdAt: string;
};

export type MonthlyDue = {
  id: number;
  memberName: string;
  patrol: string;
  referenceMonth: string;
  amountCents: number;
  status: "paid" | "overdue" | "pending";
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
};

type TransactionInsert = Omit<FinanceTransaction, "id" | "createdAt">;

function mapTransaction(row: Record<string, unknown>): FinanceTransaction {
  return {
    id: Number(row.id),
    description: String(row.description ?? ""),
    category: String(row.category ?? ""),
    counterparty: String(row.counterparty ?? ""),
    kind: row.kind as "income" | "expense",
    amountCents: Number(row.amount_cents),
    occurredAt: String(row.occurred_at ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapDue(row: Record<string, unknown>): MonthlyDue {
  return {
    id: Number(row.id),
    memberName: String(row.member_name ?? ""),
    patrol: String(row.patrol ?? ""),
    referenceMonth: String(row.reference_month ?? ""),
    amountCents: Number(row.amount_cents),
    status: row.status as "paid" | "overdue" | "pending",
    dueDate: String(row.due_date ?? ""),
    paidAt: row.paid_at ? String(row.paid_at) : null,
    createdAt: String(row.created_at ?? ""),
  };
}

export async function listFinanceData() {
  const supabase = getSupabaseAdmin();

  const [transactionsResult, duesResult] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("*")
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50),
    supabase
      .from("monthly_dues")
      .select("*")
      .order("status", { ascending: true })
      .order("member_name", { ascending: true }),
  ]);

  if (transactionsResult.error) throw transactionsResult.error;
  if (duesResult.error) throw duesResult.error;

  return {
    transactions: (transactionsResult.data ?? []).map(mapTransaction),
    dues: (duesResult.data ?? []).map(mapDue),
  };
}

export async function addTransaction(input: TransactionInsert) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      description: input.description,
      category: input.category,
      counterparty: input.counterparty,
      kind: input.kind,
      amount_cents: input.amountCents,
      occurred_at: input.occurredAt,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapTransaction(data);
}

export async function markDuePaid(id: number) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("monthly_dues")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data ? mapDue(data) : null;
}

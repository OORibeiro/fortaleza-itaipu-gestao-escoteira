import type { Due, Transaction } from "@/types/app";

export type Session = { token: string; user: { id: number; name: string; email: string; global_role: string; mustChangePassword: boolean } };
export type Branch = { id: number; name: string };
export type TransactionInput = Omit<Transaction, "id">;
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function request<T>(path: string, token?: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/render${path}`, {
      method, cache: "no-store", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new ApiError("Não foi possível conectar. Atualize os dados antes de repetir uma operação de gravação.", 0); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const fallback = response.status === 404 ? "Rota indisponível. Confira se a atualização do backend foi publicada no Render." : response.status === 401 ? "Sessão inválida. Entre novamente." : "Não foi possível concluir a solicitação.";
    const detail = data && typeof data === "object" ? data as { error?: unknown; message?: unknown } : {};
    const message = detail.error || detail.message;
    throw new ApiError(typeof message === "string" ? message : fallback, response.status);
  }
  return data as T;
}
type Row = Record<string, unknown>;
function cents(value: unknown) {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) throw new Error("Valor financeiro inválido recebido do servidor.");
  return Math.round(n * 100);
}
function day(value: unknown) { return String(value ?? "").slice(0, 10); }
export function mapTransaction(row: Row): Transaction {
  if (row.type !== "receita" && row.type !== "despesa") throw new Error("Tipo de movimentação desconhecido.");
  return { id: Number(row.id), description: String(row.description ?? ""), category: String(row.category || "outros"), counterparty: String(row.branch_name || "Caixa geral"), branchId: row.branch_id == null ? null : Number(row.branch_id), kind: row.type === "receita" ? "income" : "expense", amountCents: cents(row.amount), occurredAt: `${day(row.transaction_date)}T12:00:00-03:00` };
}
export function mapDue(row: Row): Due {
  const status = row.status_calculado ?? row.status;
  if (!["pago", "pendente", "atrasado"].includes(String(status))) throw new Error("Status de mensalidade desconhecido.");
  return { id: Number(row.id), memberName: String(row.member_name ?? ""), patrol: String(row.branch_name || "Sem ramo"), referenceMonth: day(row.reference_month).slice(0, 7), amountCents: cents(row.amount), status: status === "pago" ? "paid" : status === "atrasado" ? "overdue" : "pending", dueDate: day(row.due_date), paidAt: row.payment_date ? day(row.payment_date) : null };
}
export function transactionPayload(input: TransactionInput) {
  return { description: input.description, amount: input.amountCents / 100, type: input.kind === "income" ? "receita" : "despesa", transaction_date: input.occurredAt.slice(0, 10), branch_id: input.branchId ?? null, category: input.category };
}
export const financeService = {
  login: (email: string, password: string) => request<Session>("/auth/login", undefined, "POST", { email, password }),
  changePassword: (token: string, newPassword: string) => request("/auth/change-password", token, "POST", { newPassword }),
  async load(token: string, month: string) {
    const [transactions, dues] = await Promise.all([request<Row[]>("/finances", token), request<Row[]>(`/dues?month=${encodeURIComponent(month + "-01")}`, token)]);
    if (!Array.isArray(transactions) || !Array.isArray(dues)) throw new Error("Resposta inesperada do servidor.");
    return { transactions: transactions.map(mapTransaction), dues: dues.map(mapDue) };
  },
  branches: (token: string) => request<Branch[]>("/branches", token),
  create: (token: string, input: TransactionInput) => request("/finances", token, "POST", transactionPayload(input)),
  update: (token: string, id: number, input: TransactionInput) => request(`/finances/${id}`, token, "PUT", transactionPayload(input)),
  remove: (token: string, id: number) => request(`/finances/${id}`, token, "DELETE"),
  pay: (token: string, id: number) => request(`/dues/${id}/pay`, token, "PUT"),
    generateDues: (
    token: string,
    input: {
      branch_id: number;
      reference_month: string;
      amount: number;
      due_day: number;
    },
  ) => request<{
    message: string;
    dues: Row[];
  }>("/dues/generate", token, "POST", input),
};

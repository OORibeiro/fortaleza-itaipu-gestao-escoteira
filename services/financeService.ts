import { referenceMonths } from "@/utils/reportPeriod";
import type { Due, Transaction } from "@/types/app";

export type Session = { token: string; user: { id: number; name: string; email: string; global_role: string; mustChangePassword: boolean } };
export type Member = { id: number; name: string; branch_id: number };
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
  async load(token: string, month: string, count = 1) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || ![1, 3, 6, 12].includes(count)) throw new Error("Período inválido.");
    const [year, number] = month.split("-").map(Number);
    const months = Array.from({ length: count }, (_, index) => {
      const date = new Date(year, number - count + index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    });
    const transactionsPromise = request<Row[]>("/finances", token);
    const duesPromise = (async () => {
      const result: Due[] = [];
      // Limita a três consultas simultâneas para não sobrecarregar a API.
      for (let offset = 0; offset < months.length; offset += 3) {
        const pages = await Promise.all(months.slice(offset, offset + 3).map(value => request<Row[]>(`/dues?month=${encodeURIComponent(value)}`, token)));
        for (const page of pages) {
          if (!Array.isArray(page)) throw new Error("Resposta inesperada de mensalidades.");
          result.push(...page.map(mapDue));
        }
      }
      return Array.from(new Map(result.map(due => [due.id, due])).values()).sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth) || a.memberName.localeCompare(b.memberName, "pt-BR"));
    })();
    const [transactions, dues] = await Promise.all([transactionsPromise, duesPromise]);
    if (!Array.isArray(transactions)) throw new Error("Resposta inesperada do servidor.");
    return { transactions: transactions.map(mapTransaction), dues };
  },
  async duesForRange(token: string, from: string, to: string) {
    const months = referenceMonths(from, to);
    const result: Due[] = [];
    for (let offset = 0; offset < months.length; offset += 3) {
      const pages = await Promise.all(months.slice(offset, offset + 3).map(month => request<Row[]>(`/dues?month=${encodeURIComponent(month)}`, token)));
      for (const page of pages) {
        if (!Array.isArray(page)) throw new Error("Resposta inesperada de mensalidades.");
        result.push(...page.map(mapDue));
      }
    }
    return Array.from(new Map(result.map(due => [due.id, due])).values());
  },
  branches: (token: string) => request<Branch[]>("/branches", token),
  async membersForDues(token: string, branchId: number) {
    const rows = await request<Member[]>(`/dues/members?branch_id=${encodeURIComponent(branchId)}`, token);
    if (!Array.isArray(rows)) throw new Error("Resposta inesperada ao carregar membros.");
    return rows.map((row) => {
      const id = Number(row.id);
      const branch_id = Number(row.branch_id);
      if (!Number.isSafeInteger(id) || id <= 0 || branch_id !== branchId || typeof row.name !== "string") {
        throw new Error("Dados de membro inválidos recebidos do servidor.");
      }
      return { id, name: row.name, branch_id };
    });
  },
  create: (token: string, input: TransactionInput) => request("/finances", token, "POST", transactionPayload(input)),
  update: (token: string, id: number, input: TransactionInput) => request(`/finances/${id}`, token, "PUT", transactionPayload(input)),
  remove: (token: string, id: number) => request(`/finances/${id}`, token, "DELETE"),
  updateDue: (token: string, id: number, input: { amount: number; due_date: string }) => request(`/dues/${id}`, token, "PUT", input),
  deleteDue: (token: string, id: number) => request(`/dues/${id}`, token, "DELETE"),
  pay: (token: string, id: number) => request(`/dues/${id}/pay`, token, "PUT"),
    generateDues: (
    token: string,
    input: {
      branch_id: number;
      member_id: number;
      reference_month: string;
      amount: number;
      due_day: number;
      repeat_months?: 1 | 6 | 12;
    },
  ) => request<{
    message: string;
    dues: Row[];
  }>((input.repeat_months === 6 || input.repeat_months === 12) ? "/dues/generate-member-series" : "/dues/generate-member", token, "POST", input),
};


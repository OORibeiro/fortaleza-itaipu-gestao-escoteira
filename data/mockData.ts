import type { Due, Transaction } from "@/types/app";

export const fallbackTransactions: Transaction[] = [
  { id: 1, description: "Mensalidades — agosto", category: "Mensalidades", counterparty: "18 contribuições", kind: "income", amountCents: 216000, occurredAt: "2026-08-19T10:24:00-03:00" },
  { id: 2, description: "Materiais para acampamento", category: "Atividades", counterparty: "Loja Trilha & Campo", kind: "expense", amountCents: 74890, occurredAt: "2026-08-18T16:40:00-03:00" },
  { id: 3, description: "Campanha do agasalho", category: "Doações", counterparty: "Comunidade", kind: "income", amountCents: 132000, occurredAt: "2026-08-17T09:12:00-03:00" },
  { id: 4, description: "Transporte — atividade externa", category: "Transporte", counterparty: "Viação Litoral", kind: "expense", amountCents: 59000, occurredAt: "2026-08-15T14:05:00-03:00" },
  { id: 5, description: "Mensalidades — julho", category: "Mensalidades", counterparty: "47 contribuições", kind: "income", amountCents: 564000, occurredAt: "2026-08-05T11:30:00-03:00" },
  { id: 6, description: "Manutenção da sede", category: "Infraestrutura", counterparty: "Serviços Gerais", kind: "expense", amountCents: 96500, occurredAt: "2026-08-02T15:20:00-03:00" },
];

export const fallbackDues: Due[] = [
  [1, "Gabriel Lima", "321", "overdue", "2026-08-07"],
  [2, "Ana Souza", "3342", "overdue", "2026-08-11"],
  [3, "Rafael Freitas", "321", "overdue", "2026-08-14"],
  [4, "Marina Costa", "1234", "overdue", "2026-08-15"],
  [5, "Lucas Martins", "123", "overdue", "2026-08-16"],
  [6, "Beatriz Alves", "3342", "overdue", "2026-08-17"],
  [7, "Carlos Eduardo", "321", "paid", "2026-08-07"],
  [8, "Fernanda Lima", "321", "paid", "2026-08-07"],
  [9, "João Henrique", "321", "pending", "2026-08-25"],
  [10, "Eduardo Becari", "321", "pending", "2026-08-25"],
].map(([id, memberName, patrol, status, dueDate]) => ({
  id: Number(id), memberName: String(memberName), patrol: String(patrol), referenceMonth: "2026-08",
  amountCents: 12000, status: status as Due["status"], dueDate: String(dueDate), paidAt: status === "paid" ? "2026-08-06" : null,
}));

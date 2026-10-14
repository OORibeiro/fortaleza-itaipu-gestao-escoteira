export type View = "overview" | "finance" | "dues" | "reports";

export type Transaction = {
  id: number;
  description: string;
  category: string;
  counterparty: string;
  branchId?: number | null;
  kind: "income" | "expense";
  amountCents: number;
  occurredAt: string;
};

export type Due = {
  id: number;
  memberName: string;
  patrol: string;
  referenceMonth: string;
  amountCents: number;
  status: "paid" | "overdue" | "pending";
  dueDate: string;
  paidAt: string | null;
};

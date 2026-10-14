"use client";

import { AlertTriangle, CheckCircle2, Clock3, Download, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { SectionSearch, normalizeSearch } from "@/components/ui/SectionSearch";
import type { Due } from "@/types/app";
import { initials, money, shortDate } from "@/utils/formatters";

type StatusFilter = "all" | Due["status"];

function monthLabel(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export function DuesView({ dues, onMarkPaid, savingId, referenceMonth }: { referenceMonth: string; dues: Due[]; onMarkPaid: (id: number) => void; savingId: number | null }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const monthDues = dues;

  const filtered = useMemo(
    () => monthDues.filter((due) => (status === "all" || due.status === status) && normalizeSearch(`${due.memberName} ${due.patrol} ${due.referenceMonth}`).includes(normalizeSearch(query))),
    [monthDues, status, query],
  );

  const totals = useMemo(() => {
    const paid = monthDues.filter((due) => due.status === "paid");
    const pending = monthDues.filter((due) => due.status === "pending");
    const overdue = monthDues.filter((due) => due.status === "overdue");
    return {
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      receivedCents: paid.reduce((sum, due) => sum + due.amountCents, 0),
      expectedCents: monthDues.reduce((sum, due) => sum + due.amountCents, 0),
    };
  }, [monthDues]);

  function exportCsv() {
    const rows = [
      ["Membro", "Ramo", "Referência", "Vencimento", "Status", "Valor", "Pago em"],
      ...filtered.map((due) => [
        due.memberName,
        due.patrol,
        due.referenceMonth,
        due.dueDate,
        due.status === "paid" ? "Pago" : due.status === "overdue" ? "Em atraso" : "Pendente",
        (due.amountCents / 100).toFixed(2).replace(".", ","),
        due.paidAt ?? "",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mensalidades-${referenceMonth === "all" ? "todas" : referenceMonth}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="dues-summary" aria-label="Resumo das mensalidades">
        <article className="dues-summary-card">
          <span className="dues-summary-icon received"><WalletCards size={18} /></span>
          <div><small>Recebido</small><strong>{money.format(totals.receivedCents / 100)}</strong><span>{totals.paidCount} mensalidade{totals.paidCount === 1 ? "" : "s"} paga{totals.paidCount === 1 ? "" : "s"}</span></div>
        </article>
        <article className="dues-summary-card">
          <span className="dues-summary-icon expected"><CheckCircle2 size={18} /></span>
          <div><small>Previsto</small><strong>{money.format(totals.expectedCents / 100)}</strong><span>{monthDues.length} cobrança{monthDues.length === 1 ? "" : "s"} no período</span></div>
        </article>
        <article className="dues-summary-card">
          <span className="dues-summary-icon pending"><Clock3 size={18} /></span>
          <div><small>Pendentes</small><strong>{totals.pendingCount}</strong><span>Aguardando vencimento/pagamento</span></div>
        </article>
        <article className="dues-summary-card">
          <span className="dues-summary-icon overdue"><AlertTriangle size={18} /></span>
          <div><small>Em atraso</small><strong>{totals.overdueCount}</strong><span>Precisam de acompanhamento</span></div>
        </article>
      </section>

      <SectionSearch value={query} onChange={setQuery} label="Buscar nas Mensalidades" placeholder="Buscar membro, ramo ou referência..." />
      <article className="panel data-panel">
        <div className="data-toolbar dues-toolbar">
          <div className="dues-toolbar-left">
            <div className="status-tabs" role="tablist" aria-label="Filtrar mensalidades por status">
              {(["all", "overdue", "pending", "paid"] as const).map((item) => (
                <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>
                  {item === "all" ? "Todas" : item === "overdue" ? "Em atraso" : item === "pending" ? "Pendentes" : "Pagas"}
                </button>
              ))}
            </div>

          </div>
          <button className="outline-inline" onClick={exportCsv} disabled={filtered.length === 0}><Download size={16} /> Exportar CSV</button>
        </div>

        <div className="dues-result-info">
          <span>{filtered.length} mensalidade{filtered.length === 1 ? "" : "s"} exibida{filtered.length === 1 ? "" : "s"}</span>
          {(status !== "all" || query !== "") && <button onClick={() => { setStatus("all"); setQuery(""); }}>Limpar filtros</button>}
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Membro</th><th>Ramo</th><th>Referência</th><th>Vencimento</th><th>Status</th><th>Valor</th><th>Pagamento</th><th /></tr></thead>
            <tbody>
              {filtered.map((due) => (
                <tr key={due.id}>
                  <td><div className="person-cell"><span>{initials(due.memberName)}</span><strong>{due.memberName}</strong></div></td>
                  <td>{due.patrol}</td>
                  <td className="reference-cell">{monthLabel(due.referenceMonth)}</td>
                  <td>{due.dueDate ? shortDate.format(new Date(`${due.dueDate}T12:00:00`)) : "—"}</td>
                  <td><span className={`status-pill ${due.status}`}>{due.status === "paid" ? "Pago" : due.status === "overdue" ? "Em atraso" : "Pendente"}</span></td>
                  <td><strong>{money.format(due.amountCents / 100)}</strong></td>
                  <td>{due.paidAt ? shortDate.format(new Date(`${due.paidAt}T12:00:00`)) : "—"}</td>
                  <td>{due.status !== "paid" ? <button className="row-action" disabled={savingId !== null} onClick={() => onMarkPaid(due.id)}>{savingId === due.id ? "Salvando..." : "Registrar pagamento"}</button> : <span className="paid-check"><CheckCircle2 size={17} /> Confirmado</span>}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8}><div className="empty-table-state"><strong>Nenhuma mensalidade encontrada</strong><span>Altere ou limpe os filtros para visualizar outras cobranças.</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}

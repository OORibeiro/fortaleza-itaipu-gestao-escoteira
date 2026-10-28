
"use client";

import { AlertTriangle, CheckCircle2, Clock3, Download, WalletCards, PlusCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { SectionSearch, normalizeSearch } from "@/components/ui/SectionSearch";
import type { Due } from "@/types/app";
import type { Branch } from "@/services/financeService";
import { initials, money, shortDate } from "@/utils/formatters";

type StatusFilter = "all" | Due["status"];

function monthLabel(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export function DuesView({
  dues,
  onMarkPaid,
  savingId,
  referenceMonth,
  branches,
  saving,
  onGenerate,
}: {
  referenceMonth: string;
  dues: Due[];
  onMarkPaid: (id: number) => void;
  savingId: number | null;
  branches: Branch[];
  saving: boolean;
  onGenerate: (input: { branch_id: number; reference_month: string; amount: number; due_day: number }) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [showGenerator, setShowGenerator] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [generateError, setGenerateError] = useState("");
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

  async function submitGeneration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerateError("");

    const branch = Number(branchId);
    const value = Number(amount.replace(",", "."));
    const day = Number(dueDay);

    if (!Number.isInteger(branch) || branch <= 0) {
      setGenerateError("Selecione um ramo.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setGenerateError("Informe um valor válido para a mensalidade.");
      return;
    }
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      setGenerateError("Informe um dia de vencimento entre 1 e 28.");
      return;
    }

    const reference = `${referenceMonth}-01`;
    if (!window.confirm(`Gerar mensalidades do ramo selecionado para ${monthLabel(referenceMonth)}, no valor de ${money.format(value)} e vencimento no dia ${day}?`)) return;

    try {
      await onGenerate({
        branch_id: branch,
        reference_month: reference,
        amount: value,
        due_day: day,
      });
      setShowGenerator(false);
      setAmount("");
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Não foi possível gerar as mensalidades.");
    }
  }

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

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
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

      <div className="data-toolbar dues-toolbar">
        <button className="primary-button" disabled={saving || branches.length === 0} onClick={() => { setGenerateError(""); setShowGenerator((open) => !open); }}>
          <PlusCircle size={16} /> Gerar mensalidades
        </button>
        {branches.length === 0 && <span>Não há ramos disponíveis.</span>}
      </div>

      {showGenerator && (
        <article className="panel" style={{ padding: 20, marginBottom: 20 }}>
          <h3>Gerar mensalidades do mês</h3>
          <p>Referência: <strong>{monthLabel(referenceMonth)}</strong>. As mensalidades serão solicitadas ao backend para o ramo escolhido.</p>
          <form onSubmit={submitGeneration} style={{ display: "grid", gap: 12, maxWidth: 480 }}>
            <label>
              Ramo
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)} required disabled={saving}>
                <option value="">Selecione o ramo</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label>
              Valor por mensalidade (R$)
              <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ex.: 50,00" inputMode="decimal" required disabled={saving} />
            </label>
            <label>
              Dia do vencimento (1 a 28)
              <input type="number" min="1" max="28" value={dueDay} onChange={(event) => setDueDay(event.target.value)} required disabled={saving} />
            </label>
            {generateError && <p role="alert" style={{ color: "var(--danger, #b91c1c)" }}>{generateError}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Gerando..." : "Confirmar geração"}</button>
              <button className="outline-inline" type="button" disabled={saving} onClick={() => setShowGenerator(false)}>Cancelar</button>
            </div>
          </form>
        </article>
      )}

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
                  <td>{due.status !== "paid" ? <button className="row-action" disabled={savingId !== null || saving} onClick={() => onMarkPaid(due.id)}>{savingId === due.id ? "Salvando..." : "Registrar pagamento"}</button> : <span className="paid-check"><CheckCircle2 size={17} /> Confirmado</span>}</td>
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

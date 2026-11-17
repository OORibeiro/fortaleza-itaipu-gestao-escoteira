"use client";

import { AlertTriangle, CheckCircle2, Clock3, Download, WalletCards, PlusCircle, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { SectionSearch, normalizeSearch } from "@/components/ui/SectionSearch";
import { DueEditForm } from "@/components/modals/DueEditForm";
import { dueSchedule } from "@/utils/dueSchedule";
import type { Due } from "@/types/app";
import type { Branch, Member } from "@/services/financeService";
import { initials, money, shortDate } from "@/utils/formatters";
import "./DuesGenerator.css";

type StatusFilter = "all" | Due["status"];

function monthLabel(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export function DuesView({
  dues,
  onMarkPaid,
  onUpdateDue,
  onDeleteDue,
  savingId,
  referenceMonth,
  branches,
  saving,
  onGenerate,
  onLoadMembers,
  period,
  onChangeMonth,
  onChangePeriod,
}: {
  referenceMonth: string;
  period: number;
  onChangeMonth: (value: string) => void;
  onChangePeriod: (value: number) => void;
  dues: Due[];
  onMarkPaid: (id: number) => void;
  onUpdateDue: (id: number, input: { amount: number; due_date: string }) => Promise<void>;
  onDeleteDue: (due: Due) => void;
  savingId: number | null;
  branches: Branch[];
  saving: boolean;
  onLoadMembers: (branchId: number) => Promise<Member[]>;
  onGenerate: (input: { branch_id: number; member_id: number; reference_month: string; amount: number; due_day: number; repeat_months?: 1 | 6 | 12 }) => Promise<void>;
}) {
  const [editingDue, setEditingDue] = useState<Due | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [showGenerator, setShowGenerator] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [memberState, setMemberState] = useState<{ branchId: string; members: Member[]; loading: boolean; error: string }>({ branchId: "", members: [], loading: false, error: "" });
  const [memberRetry, setMemberRetry] = useState(0);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueDateText, setDueDateText] = useState("");
  const [repeatMonths, setRepeatMonths] = useState<1 | 6 | 12>(1);
  const schedule = dueDate.slice(0, 7) === referenceMonth ? dueSchedule(referenceMonth, Number(dueDate.slice(8, 10)), repeatMonths) : [];
  const [generateError, setGenerateError] = useState("");
  const monthDues = dues;
  const lastDay = new Date(
    Number(referenceMonth.slice(0, 4)),
    Number(referenceMonth.slice(5, 7)),
    0,
  ).getDate();
  const minDueDate = `${referenceMonth}-01`;
  const maxDueDate = `${referenceMonth}-${String(lastDay).padStart(2, "0")}`;

  useEffect(() => {
    if (!showGenerator || !branchId) return;
    let cancelled = false;
    void onLoadMembers(Number(branchId)).then(
      (members) => {
        if (!cancelled) setMemberState({ branchId, members, loading: false, error: "" });
      },
      (error: unknown) => {
        if (!cancelled) setMemberState({ branchId, members: [], loading: false, error: error instanceof Error ? error.message : "Não foi possível carregar os membros." });
      },
    );
    return () => { cancelled = true; };
  }, [branchId, showGenerator, onLoadMembers, memberRetry]);

  const membersLoading = Boolean(branchId) && (memberState.branchId !== branchId || memberState.loading);
  const members = memberState.branchId === branchId ? memberState.members : [];
  const membersError = memberState.branchId === branchId ? memberState.error : "";

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
    if (saving) return;

    const branch = Number(branchId);
    const selectedMember = members.find((member) => member.id === Number(memberId));
    const value = Number(amount.replace(",", "."));
    const day = Number(dueDate.slice(8, 10));
    if (!Number.isInteger(branch) || branch <= 0) {
      setGenerateError("Selecione um ramo.");
      return;
    }
    if (membersLoading || membersError || !selectedMember || selectedMember.branch_id !== branch) {
      setGenerateError("Selecione um membro do ramo antes de gerar a mensalidade.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setGenerateError("Informe um valor válido para a mensalidade.");
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      dueDate.slice(0, 7) !== referenceMonth ||
      !Number.isInteger(day) || day < 1 || day > lastDay
    ) {
      setGenerateError("Selecione uma data válida dentro do mês de referência.");
      return;
    }

    const reference = `${referenceMonth}-01`;
    if (repeatMonths > 1 && schedule.length !== repeatMonths) { setGenerateError("Confira a data de vencimento para gerar as mensalidades."); return; }
    if (!window.confirm(repeatMonths > 1 ? `Gerar ${repeatMonths} mensalidades para ${selectedMember.name}, de ${monthLabel(referenceMonth)} até ${monthLabel(schedule[repeatMonths - 1].slice(0,7))}, por ${money.format(value)} cada (total previsto ${money.format(value * repeatMonths)})? Cobranças existentes serão mantidas, sem duplicar.` : `Gerar mensalidade para ${selectedMember.name}, referente a ${monthLabel(referenceMonth)}, no valor de ${money.format(value)} e vencimento em ${dueDate.split("-").reverse().join("/")}?`)) return;

    try {
      await onGenerate({
        branch_id: branch,
        member_id: selectedMember.id,
        reference_month: reference,
        amount: value,
        due_day: day,
        repeat_months: repeatMonths,
      });
      setShowGenerator(false);
      setAmount("");
      setRepeatMonths(1);
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
    anchor.download = `mensalidades-${period}-meses-ate-${referenceMonth}.csv`;
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
        <article className="panel dues-generator">
          <header className="dues-generator-heading">
            <div className="dues-generator-title"><span className="dues-generator-icon"><WalletCards size={23} /></span><div><h3>Nova mensalidade</h3><p>Escolha a pessoa e preencha os dados da cobrança.</p></div></div>
            <span className="dues-generator-reference"><small>Referência</small><strong>{monthLabel(referenceMonth)}</strong></span>
          </header>
          <form onSubmit={submitGeneration} className="dues-generator-form">
            <label className="form-field">
              <span>Ramo</span>
              <select value={branchId} onChange={(event) => {
                const next = event.target.value;
                setBranchId(next);
                setMemberId("");
                setGenerateError("");
                setMemberState({ branchId: next, members: [], loading: Boolean(next), error: "" });
              }} required disabled={saving}>
                <option value="">Selecione o ramo</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Pessoa que será cobrada</span>
              <select value={memberId} onChange={(event) => setMemberId(event.target.value)} required disabled={saving || !branchId || membersLoading || Boolean(membersError)}>
                <option value="">{membersLoading ? "Carregando membros..." : "Selecione a pessoa"}</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name} (ID {member.id})</option>)}
              </select>
            </label>
            {membersLoading && <p role="status">Carregando membros...</p>}
            {membersError && <div role="alert"><p>{membersError}</p><button type="button" disabled={saving} onClick={() => {
              setMemberId("");
              setMemberState({ branchId, members: [], loading: true, error: "" });
              setMemberRetry((value) => value + 1);
            }}>Tentar novamente</button></div>}
            {branchId && !membersLoading && !membersError && members.length === 0 && <p>Nenhum membro encontrado neste ramo.</p>}
            <label className="form-field">
              <span>Valor da mensalidade</span>
              <div className="dues-generator-money"><span aria-hidden="true">R$</span><input aria-label="Valor da mensalidade em reais" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" inputMode="decimal" required disabled={saving} /></div>
            </label>
            <div className="form-field">
              <label htmlFor="due-date-text">Data de vencimento</label>
              <div className="dues-date-control">
                <input id="due-date-text" type="text" inputMode="numeric" placeholder="dd/mm/yyyy" maxLength={10} pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" value={dueDateText} required disabled={saving} aria-describedby="due-date-hint" onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
                  const formatted = digits.slice(0, 2) + (digits.length > 2 ? "/" + digits.slice(2, 4) : "") + (digits.length > 4 ? "/" + digits.slice(4) : "");
                  setDueDateText(formatted);
                  setDueDate(digits.length === 8 ? `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}` : "");
                }} />
                <span className="dues-date-calendar">
                  <CalendarDays size={19} aria-hidden="true" />
                  <input type="date" aria-label="Escolher vencimento no calendário" value={dueDate} min={minDueDate} max={maxDueDate} disabled={saving} onClick={(event) => { try { event.currentTarget.showPicker?.(); } catch { /* Usa o seletor padrão do navegador. */ } }} onChange={(event) => {
                    setDueDate(event.target.value);
                    setDueDateText(event.target.value ? event.target.value.split("-").reverse().join("/") : "");
                  }} />
                </span>
              </div>
              <small id="due-date-hint">Formato: dia/mês/ano. Escolha uma data dentro do mês de referência.</small>
            </div>
            <div className="dues-repeat-control">
              <span id="dues-repeat-label">Gerar mensalidades para</span>
              <div role="group" aria-labelledby="dues-repeat-label" style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                {([1 /*, 6, 12 */] as const).map(count => <button key={count} type="button" className="outline-inline" aria-pressed={repeatMonths === count} disabled={saving} onClick={() => setRepeatMonths(count)}>
                  <CalendarDays size={17} />{count === 1 ? "Somente este mês" : `${count} meses`}
                </button>)}
              </div>
              <p>{repeatMonths > 1 ? `${repeatMonths} cobranças: mês selecionado e os ${repeatMonths - 1} seguintes. Não registra pagamentos.` : "Será criada uma cobrança somente no mês selecionado."}</p>
              {repeatMonths > 1 && schedule.length === repeatMonths && <><ul>{schedule.map(date => <li key={date}>{date.split("-").reverse().join("/")}</li>)}</ul><small>Se o dia não existir em algum mês, será usado o último dia desse mês. Cobranças existentes serão mantidas.</small></>}
            </div>
            {generateError && <p role="alert" style={{ color: "var(--danger, #b91c1c)" }}>{generateError}</p>}
            <div className="dues-generator-actions"><p>A cobrança será criada apenas para a pessoa selecionada.</p>
              <button className="primary-button" type="submit" disabled={saving || !memberId || membersLoading || Boolean(membersError)}><PlusCircle size={16} />{saving ? "Gerando..." : repeatMonths > 1 ? `Gerar ${repeatMonths} mensalidades` : "Gerar mensalidade"}</button>
              <button className="outline-inline" type="button" disabled={saving} onClick={() => setShowGenerator(false)}>Cancelar</button>
            </div>
          </form>
        </article>
      )}

      {editingDue && <DueEditForm key={editingDue.id} due={editingDue} saving={saving} onClose={() => setEditingDue(null)} onSave={async (input) => { await onUpdateDue(editingDue.id, input); setEditingDue(null); }} />}
      <SectionSearch value={query} onChange={setQuery} label="Buscar nas Mensalidades" placeholder="Buscar membro, ramo ou referência..." />
      <article className="panel data-panel">
        <div className="data-toolbar dues-toolbar">
          <div className="dues-toolbar-left dues-period-toolbar">
            <label className="dues-period-field"><span>{period === 1 ? "Mês" : "Mês final"}</span><input type="month" value={referenceMonth} disabled={saving} onChange={(event) => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) onChangeMonth(event.target.value); }} /></label>
            <label className="dues-period-field"><span>Período</span><select value={period} disabled={saving} onChange={(event) => onChangePeriod(Number(event.target.value))}><option value={1}>Somente este mês</option><option value={3}>Últimos 3 meses</option><option value={6}>Últimos 6 meses</option><option value={12}>Últimos 12 meses</option></select></label>
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
            <thead><tr><th>Membro</th><th>Ramo</th><th>Referência</th><th>Vencimento</th><th>Status</th><th>Valor</th><th>Pagamento</th><th>Ações</th></tr></thead>
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
                  <td><div className="dues-row-actions">{due.status !== "paid" ? <button className="row-action" disabled={savingId !== null || saving} onClick={() => onMarkPaid(due.id)}>{savingId === due.id ? "Salvando..." : "Registrar pagamento"}</button> : <span className="paid-check"><CheckCircle2 size={17} /> Confirmado</span>}
                    <button className="row-action" aria-label={`Editar mensalidade de ${due.memberName}`} title={due.status === "paid" ? "Pagamento registrado: edição bloqueada" : "Editar mensalidade"} disabled={saving || due.status === "paid"} onClick={() => setEditingDue(due)}><Pencil size={15} /> Editar</button>
                    <button className="row-action dues-delete" aria-label={`Excluir mensalidade de ${due.memberName}`} title={due.status === "paid" ? "Pagamento registrado: exclusão bloqueada" : "Excluir mensalidade"} disabled={saving || due.status === "paid"} onClick={() => onDeleteDue(due)}><Trash2 size={15} /> Excluir</button>
                  </div></td>
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


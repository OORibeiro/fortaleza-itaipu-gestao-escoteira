"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Download, FileText, FilterX, Pencil, Plus, ReceiptText, Trash2, WalletCards } from "lucide-react";
import { SectionSearch, normalizeSearch } from "@/components/ui/SectionSearch";
import type { Due, Transaction } from "@/types/app";
import { initials, money, shortDate } from "@/utils/formatters";

type FinanceViewProps = {
  transactions: Transaction[];
  dues: Due[];
  onOpenModal: () => void;
  onShowDues: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
};

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function FinanceView({ transactions, dues, onOpenModal, onShowDues, onEditTransaction, onDeleteTransaction }: FinanceViewProps) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | Transaction["kind"]>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const categories = useMemo(() => Array.from(new Set(transactions.map((item) => item.category))).sort(), [transactions]);
  const invalidRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const visibleTransactions = useMemo(() => {
    if (invalidRange) return [];
    return transactions.filter((item) => {
      const day = item.occurredAt.slice(0, 10);
      if (!normalizeSearch(`${item.description} ${item.category} ${item.counterparty}`).includes(normalizeSearch(query))) return false;
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [transactions, query, kindFilter, categoryFilter, dateFrom, dateTo, invalidRange]);

  const income = transactions.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amountCents, 0);
  const expense = transactions.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amountCents, 0);
  const balance = income - expense;
  const overdue = dues.filter((due) => due.status === "overdue");
  const paidCount = dues.filter((due) => due.status === "paid").length;
  const duesRate = dues.length ? Math.round((paidCount / dues.length) * 100) : 0;
  const hasFilters = Boolean(query.trim()) || kindFilter !== "all" || categoryFilter !== "all" || Boolean(dateFrom) || Boolean(dateTo);

  function clearFilters() {
    setQuery("");
    setKindFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  function exportCsv() {
    if (!visibleTransactions.length) return;
    const rows: Array<Array<string | number>> = [
      ["Data", "Tipo", "Descrição", "Categoria", "Ramo / caixa", "Valor"],
      ...visibleTransactions.map((item) => [
        item.occurredAt.slice(0, 10),
        item.kind === "income" ? "Entrada" : "Saída",
        item.description,
        item.category,
        item.counterparty,
        (item.amountCents / 100).toFixed(2).replace(".", ","),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `movimentacoes-${dateFrom || "inicio"}-${dateTo || "atual"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="metrics" aria-label="Resumo financeiro">
        <article className="metric-card balance-card"><div className="metric-icon"><WalletCards size={21} /></div><span>Saldo calculado</span><strong>{money.format(balance / 100)}</strong><small>Entradas menos saídas registradas</small></article>
        <article className="metric-card"><div className="metric-top"><div className="metric-icon income"><ArrowDownLeft size={21} /></div></div><span>Entradas registradas</span><strong>{money.format(income / 100)}</strong><small>{transactions.filter((item) => item.kind === "income").length} lançamentos</small></article>
        <article className="metric-card"><div className="metric-top"><div className="metric-icon expense"><ArrowUpRight size={21} /></div></div><span>Saídas registradas</span><strong>{money.format(expense / 100)}</strong><small>{transactions.filter((item) => item.kind === "expense").length} lançamentos</small></article>
        <article className="metric-card dues-card"><div className="metric-top"><div className="metric-icon gold"><CircleDollarSign size={21} /></div><em>{duesRate}%</em></div><span>Mensalidades</span><strong>{paidCount} de {dues.length}</strong><div className="progress"><i style={{ width: `${duesRate}%` }} /></div><small>{overdue.length} em atraso · {dues.filter((due) => due.status === "pending").length} pendentes</small></article>
      </section>

      <SectionSearch value={query} onChange={setQuery} label="Buscar no Financeiro" placeholder="Buscar descrição, categoria ou ramo..." />
      <section className="finance-filters" aria-label="Filtros das movimentações">
        <label><span>Tipo</span><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)}><option value="all">Todos</option><option value="income">Entradas</option><option value="expense">Saídas</option></select></label>
        <label><span>Categoria</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Todas</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label><span>De</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label><span>Até</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <div className="filter-actions"><button className="clear-filters" onClick={clearFilters} disabled={!hasFilters}><FilterX size={14} /> Limpar</button><button className="clear-filters export-filtered" onClick={exportCsv} disabled={!visibleTransactions.length || invalidRange}><Download size={14} /> CSV</button></div>
      </section>
      {invalidRange && <div className="inline-alert error" role="alert">A data inicial não pode ser posterior à data final.</div>}

      <section className="dashboard-grid">
        <article className="panel transactions-panel">
          <div className="panel-head"><div><h2>Histórico de movimentações</h2><p>{visibleTransactions.length} lançamento{visibleTransactions.length === 1 ? "" : "s"} encontrado{visibleTransactions.length === 1 ? "" : "s"}</p></div><button onClick={onOpenModal}><Plus size={16} /> Adicionar</button></div>
          <div className="transactions-list">
            {visibleTransactions.length === 0 && !invalidRange && <div className="rich-empty-state"><span><ReceiptText size={25} /></span><strong>{hasFilters ? "Nenhuma movimentação encontrada" : "Ainda não há movimentações"}</strong><p>{hasFilters ? "Tente limpar ou alterar os filtros selecionados." : "Cadastre a primeira entrada ou saída para começar o controle financeiro."}</p>{hasFilters ? <button onClick={clearFilters}>Limpar filtros</button> : <button onClick={onOpenModal}>Novo lançamento</button>}</div>}
            {visibleTransactions.map((item) => <div className="transaction" key={item.id}>
              <div className={`transaction-icon ${item.kind === "income" ? "in" : "out"}`}>{item.kind === "income" ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}</div>
              <div className="transaction-main"><strong>{item.description}</strong><span>{item.counterparty || item.category}</span></div>
              <time>{shortDate.format(new Date(item.occurredAt))}</time>
              <b className={item.kind === "income" ? "in" : "out"}>{item.kind === "income" ? "+ " : "− "}{money.format(item.amountCents / 100)}</b>
              <div className="transaction-actions"><button title="Editar lançamento" aria-label={`Editar ${item.description}`} onClick={() => onEditTransaction(item)}><Pencil size={15} /></button><button className="danger" title="Excluir lançamento" aria-label={`Excluir ${item.description}`} onClick={() => onDeleteTransaction(item)}><Trash2 size={15} /></button></div>
            </div>)}
          </div>
        </article>
        <aside className="panel attention-panel"><div className="panel-head"><div><h2>Precisa de atenção</h2><p>Pendências de mensalidades</p></div></div><div className="attention-stat"><div><span>Mensalidades em atraso</span><strong>{money.format(overdue.reduce((sum, due) => sum + due.amountCents, 0) / 100)}</strong></div><b>{overdue.length}</b></div>{overdue.length ? <div className="attention-list">{overdue.slice(0, 3).map((due, index) => <div key={due.id}><span className={`member-dot tone-${index}`}>{initials(due.memberName)}</span><p><strong>{due.memberName}</strong><small>Ramo {due.patrol} · venceu em {shortDate.format(new Date(`${due.dueDate}T12:00:00`))}</small></p><b>{money.format(due.amountCents / 100)}</b></div>)}</div> : <div className="attention-empty"><CircleDollarSign size={24} /><strong>Nenhum atraso</strong><span>As mensalidades estão em dia nos dados atuais.</span></div>}<button className="outline-button" onClick={onShowDues}><FileText size={17} /> Gerenciar mensalidades</button></aside>
      </section>
    </>
  );
}

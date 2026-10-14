"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Download, Printer, Scale, WalletCards } from "lucide-react";
import type { Due, Transaction } from "@/types/app";
import { money } from "@/utils/formatters";

type PeriodPreset = "all" | "3m" | "6m" | "12m";

type ReportsViewProps = {
  transactions: Transaction[];
  dues: Due[];
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

function parseLocalDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1)).replace(" de ", "/");
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function ReportsView({ transactions, dues }: ReportsViewProps) {
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const latestTransactionDate = useMemo(() => {
    if (!transactions.length) return null;
    return transactions.reduce((latest, item) => {
      const current = parseLocalDate(item.occurredAt);
      return current > latest ? current : latest;
    }, parseLocalDate(transactions[0].occurredAt));
  }, [transactions]);

  const presetRange = useMemo(() => {
    if (preset === "all" || !latestTransactionDate) return { from: "", to: "" };
    const months = preset === "3m" ? 3 : preset === "6m" ? 6 : 12;
    const from = new Date(latestTransactionDate.getFullYear(), latestTransactionDate.getMonth() - (months - 1), 1);
    const to = new Date(latestTransactionDate.getFullYear(), latestTransactionDate.getMonth() + 1, 0);
    return {
      from: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`,
      to: `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`,
    };
  }, [preset, latestTransactionDate]);

  const effectiveFrom = dateFrom || presetRange.from;
  const effectiveTo = dateTo || presetRange.to;
  const invalidRange = Boolean(effectiveFrom && effectiveTo && effectiveFrom > effectiveTo);

  const filteredTransactions = useMemo(() => invalidRange ? [] : transactions.filter((item) => {
    const day = item.occurredAt.slice(0, 10);
    if (effectiveFrom && day < effectiveFrom) return false;
    if (effectiveTo && day > effectiveTo) return false;
    return true;
  }), [transactions, effectiveFrom, effectiveTo, invalidRange]);

  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((item) => item.kind === "income")
      .reduce((sum, item) => sum + item.amountCents, 0);
    const expense = filteredTransactions
      .filter((item) => item.kind === "expense")
      .reduce((sum, item) => sum + item.amountCents, 0);
    return {
      income,
      expense,
      result: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const monthlyData = useMemo(() => {
    const values = new Map<string, { income: number; expense: number }>();
    for (const item of filteredTransactions) {
      const key = monthKey(parseLocalDate(item.occurredAt));
      const current = values.get(key) ?? { income: 0, expense: 0 };
      current[item.kind] += item.amountCents;
      values.set(key, current);
    }

    if (!values.size && !effectiveFrom && !effectiveTo) return [];

    const keys = Array.from(values.keys()).sort();
    const firstDate = effectiveFrom
      ? parseLocalDate(effectiveFrom)
      : keys.length
        ? new Date(Number(keys[0].slice(0, 4)), Number(keys[0].slice(5, 7)) - 1, 1)
        : latestTransactionDate;
    const lastDate = effectiveTo
      ? parseLocalDate(effectiveTo)
      : keys.length
        ? new Date(Number(keys[keys.length - 1].slice(0, 4)), Number(keys[keys.length - 1].slice(5, 7)) - 1, 1)
        : latestTransactionDate;

    if (!firstDate || !lastDate) return [];

    const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const end = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
    const rows: { key: string; income: number; expense: number }[] = [];

    while (cursor <= end) {
      const key = monthKey(cursor);
      const value = values.get(key) ?? { income: 0, expense: 0 };
      rows.push({ key, ...value });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return rows.slice(-12);
  }, [filteredTransactions, effectiveFrom, effectiveTo, latestTransactionDate]);

  const maxMonthlyValue = Math.max(1, ...monthlyData.flatMap((item) => [item.income, item.expense]));

  const categoryData = useMemo(() => {
    const categories = new Map<string, number>();
    for (const item of filteredTransactions) {
      if (item.kind !== "expense") continue;
      categories.set(item.category, (categories.get(item.category) ?? 0) + item.amountCents);
    }
    return Array.from(categories.entries())
      .map(([category, amount]) => ({ category, amount, percent: totals.expense ? Math.round((amount / totals.expense) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, totals.expense]);

  const filteredDues = useMemo(() => invalidRange ? [] : dues.filter((due) => {
    const referenceDay = `${due.referenceMonth}-01`;
    if (effectiveFrom && referenceDay < effectiveFrom.slice(0, 7) + "-01") return false;
    if (effectiveTo && referenceDay > effectiveTo.slice(0, 7) + "-01") return false;
    return true;
  }), [dues, effectiveFrom, effectiveTo, invalidRange]);

  const duesSummary = useMemo(() => {
    const paid = filteredDues.filter((due) => due.status === "paid");
    const pending = filteredDues.filter((due) => due.status === "pending");
    const overdue = filteredDues.filter((due) => due.status === "overdue");
    const expected = filteredDues.reduce((sum, due) => sum + due.amountCents, 0);
    const received = paid.reduce((sum, due) => sum + due.amountCents, 0);
    return {
      paid: paid.length,
      pending: pending.length,
      overdue: overdue.length,
      expected,
      received,
      rate: expected ? Math.round((received / expected) * 100) : 0,
    };
  }, [filteredDues]);

  function applyPreset(next: PeriodPreset) {
    setPreset(next);
    setDateFrom("");
    setDateTo("");
  }

  function exportReport() {
    const rows: Array<Array<string | number>> = [
      ["RELATÓRIO FINANCEIRO"],
      ["Período inicial", effectiveFrom || "Todos"],
      ["Período final", effectiveTo || "Todos"],
      [],
      ["RESUMO"],
      ["Entradas", (totals.income / 100).toFixed(2).replace(".", ",")],
      ["Saídas", (totals.expense / 100).toFixed(2).replace(".", ",")],
      ["Resultado", (totals.result / 100).toFixed(2).replace(".", ",")],
      ["Quantidade de lançamentos", totals.count],
      [],
      ["MOVIMENTAÇÕES"],
      ["Data", "Tipo", "Descrição", "Categoria", "Favorecido/Origem", "Valor"],
      ...filteredTransactions.map((item) => [
        item.occurredAt.slice(0, 10),
        item.kind === "income" ? "Entrada" : "Saída",
        item.description,
        item.category,
        item.counterparty,
        (item.amountCents / 100).toFixed(2).replace(".", ","),
      ]),
      [],
      ["MENSALIDADES"],
      ["Pagas", duesSummary.paid],
      ["Pendentes", duesSummary.pending],
      ["Em atraso", duesSummary.overdue],
      ["Recebido", (duesSummary.received / 100).toFixed(2).replace(".", ",")],
      ["Previsto", (duesSummary.expected / 100).toFixed(2).replace(".", ",")],
    ];

    const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relatorio-financeiro-${effectiveFrom || "inicio"}-${effectiveTo || "atual"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="report-toolbar" aria-label="Filtros dos relatórios">
        <div className="report-presets">
          <span>Período</span>
          <div>
            {(["all", "3m", "6m", "12m"] as const).map((item) => (
              <button key={item} className={preset === item && !dateFrom && !dateTo ? "active" : ""} onClick={() => applyPreset(item)}>
                {item === "all" ? "Tudo" : item === "3m" ? "3 meses" : item === "6m" ? "6 meses" : "12 meses"}
              </button>
            ))}
          </div>
        </div>
        <label><span>De</span><input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPreset("all"); }} /></label>
        <label><span>Até</span><input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPreset("all"); }} /></label>
        <div className="report-actions"><button className="report-print" onClick={() => window.print()} disabled={invalidRange}><Printer size={16} /> Imprimir / PDF</button><button className="report-export" onClick={exportReport} disabled={invalidRange || (!filteredTransactions.length && !filteredDues.length)}><Download size={16} /> Exportar CSV</button></div>
      </section>

      {invalidRange && <div className="inline-alert error" role="alert">A data inicial não pode ser posterior à data final.</div>}
      <div className="print-report-header"><strong>Grupo Escoteiro 45º — Fortaleza de Itaipu</strong><span>Relatório financeiro · {effectiveFrom || "início"} a {effectiveTo || "atual"}</span></div>

      <section className="report-metrics" aria-label="Resumo do relatório">
        <article><span className="report-metric-icon income"><ArrowDownLeft size={18} /></span><div><small>Entradas</small><strong>{money.format(totals.income / 100)}</strong><em>{filteredTransactions.filter((item) => item.kind === "income").length} lançamentos</em></div></article>
        <article><span className="report-metric-icon expense"><ArrowUpRight size={18} /></span><div><small>Saídas</small><strong>{money.format(totals.expense / 100)}</strong><em>{filteredTransactions.filter((item) => item.kind === "expense").length} lançamentos</em></div></article>
        <article><span className={`report-metric-icon ${totals.result >= 0 ? "result-positive" : "result-negative"}`}><Scale size={18} /></span><div><small>Resultado</small><strong className={totals.result < 0 ? "negative-value" : ""}>{money.format(totals.result / 100)}</strong><em>Entradas menos saídas</em></div></article>
        <article><span className="report-metric-icon dues"><WalletCards size={18} /></span><div><small>Mensalidades recebidas</small><strong>{duesSummary.rate}%</strong><em>{money.format(duesSummary.received / 100)} de {money.format(duesSummary.expected / 100)}</em></div></article>
      </section>

      <section className="reports-grid report-main-grid">
        <article className="panel chart-panel report-chart-panel">
          <div className="panel-head">
            <div><h2>Entradas x saídas</h2><p>Evolução mensal dos lançamentos no período selecionado</p></div>
            <div className="legend"><span className="income-key">Entradas</span><span className="expense-key">Saídas</span></div>
          </div>
          {monthlyData.length ? (
            <div className="report-bar-chart">
              {monthlyData.map((bar) => (
                <div className="report-bar-group" key={bar.key}>
                  <div className="report-bar-values"><span>{money.format(bar.income / 100)}</span><span>{money.format(bar.expense / 100)}</span></div>
                  <div className="report-bar-track">
                    <i className="report-income-bar" style={{ height: `${Math.max(bar.income ? 5 : 0, (bar.income / maxMonthlyValue) * 100)}%` }} title={`Entradas: ${money.format(bar.income / 100)}`} />
                    <i className="report-expense-bar" style={{ height: `${Math.max(bar.expense ? 5 : 0, (bar.expense / maxMonthlyValue) * 100)}%` }} title={`Saídas: ${money.format(bar.expense / 100)}`} />
                  </div>
                  <strong>{monthLabel(bar.key)}</strong>
                </div>
              ))}
            </div>
          ) : <div className="report-empty">Nenhuma movimentação encontrada no período selecionado.</div>}
        </article>

        <article className="panel report-category-panel">
          <div className="panel-head"><div><h2>Despesas por categoria</h2><p>{money.format(totals.expense / 100)} em saídas</p></div></div>
          {categoryData.length ? (
            <div className="report-category-list">
              {categoryData.map((item, index) => (
                <div className="report-category-row" key={item.category}>
                  <div className="report-category-heading"><span><i className={`report-category-dot tone-${index % 5}`} />{item.category}</span><strong>{money.format(item.amount / 100)}</strong></div>
                  <div className="report-category-progress"><i style={{ width: `${item.percent}%` }} /></div>
                  <small>{item.percent}% das despesas</small>
                </div>
              ))}
            </div>
          ) : <div className="report-empty small">Nenhuma despesa registrada no período.</div>}
        </article>
      </section>

      <section className="report-bottom-grid">
        <article className="panel report-dues-panel">
          <div className="panel-head"><div><h2>Situação das mensalidades</h2><p>Cobranças no período selecionado</p></div></div>
          <div className="report-dues-content">
            <div className="report-dues-rate"><strong>{duesSummary.rate}%</strong><span>do valor previsto recebido</span></div>
            <div className="report-dues-progress" aria-label={`${duesSummary.rate}% das mensalidades recebidas`}><i style={{ width: `${duesSummary.rate}%` }} /></div>
            <div className="report-dues-statuses">
              <div><span className="due-status-icon paid"><CheckCircle2 size={16} /></span><p><strong>{duesSummary.paid}</strong><small>Pagas</small></p></div>
              <div><span className="due-status-icon pending"><WalletCards size={16} /></span><p><strong>{duesSummary.pending}</strong><small>Pendentes</small></p></div>
              <div><span className="due-status-icon overdue"><AlertTriangle size={16} /></span><p><strong>{duesSummary.overdue}</strong><small>Em atraso</small></p></div>
            </div>
          </div>
        </article>

        <article className="panel report-summary-panel">
          <div className="panel-head"><div><h2>Resumo do período</h2><p>Indicadores dos lançamentos filtrados</p></div></div>
          <div className="report-summary-list">
            <div><span>Total de movimentações</span><strong>{totals.count}</strong></div>
            <div><span>Maior entrada</span><strong>{money.format(Math.max(0, ...filteredTransactions.filter((item) => item.kind === "income").map((item) => item.amountCents)) / 100)}</strong></div>
            <div><span>Maior saída</span><strong>{money.format(Math.max(0, ...filteredTransactions.filter((item) => item.kind === "expense").map((item) => item.amountCents)) / 100)}</strong></div>
            <div><span>Média por movimentação</span><strong>{money.format((totals.count ? (totals.income + totals.expense) / totals.count : 0) / 100)}</strong></div>
          </div>
        </article>
      </section>
    </>
  );
}

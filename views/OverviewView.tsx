import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CircleDollarSign,
  FileText,
  Cloud,
  Plus,
  RotateCcw,
} from "lucide-react";
import type { Due, Transaction, View } from "@/types/app";
import { money, shortDate } from "@/utils/formatters";

type OverviewViewProps = {
  transactions: Transaction[];
  dues: Due[];
  onOpenTransaction: () => void;
  onChooseView: (view: View) => void;
  onRefresh: () => void;
};

export function OverviewView({ transactions, dues, onOpenTransaction, onChooseView, onRefresh }: OverviewViewProps) {
  const income = transactions.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amountCents, 0);
  const expense = transactions.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amountCents, 0);
  const balance = income - expense;
  const pendingDues = dues.filter((due) => due.status !== "paid");
  const pendingValue = pendingDues.reduce((sum, due) => sum + due.amountCents, 0);
  const recentTransactions = [...transactions].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 4);

  return (
    <>
      <section className="overview-cards">
        <article><span className="overview-icon"><Banknote size={22} /></span><div><p>Saldo calculado</p><strong>{money.format(balance / 100)}</strong></div></article>
        <article><span className="overview-icon gold-bg"><ArrowDownLeft size={22} /></span><div><p>Entradas</p><strong>{money.format(income / 100)}</strong></div></article>
        <article><span className="overview-icon blue-bg"><ArrowUpRight size={22} /></span><div><p>Saídas</p><strong>{money.format(expense / 100)}</strong></div></article>
        <article><span className="overview-icon coral-bg"><CircleDollarSign size={22} /></span><div><p>Mensalidades pendentes</p><strong>{money.format(pendingValue / 100)}</strong></div></article>
      </section>

      <section className="overview-grid">
        <article className="panel quick-panel">
          <div className="panel-head"><div><h2>Ações rápidas</h2><p>Atalhos para as principais funções financeiras</p></div></div>
          <div className="quick-actions">
            <button onClick={onOpenTransaction}><Plus size={20} />Novo lançamento</button>
            <button onClick={() => onChooseView("finance")}><FileText size={20} />Ver movimentações</button>
            <button onClick={() => onChooseView("dues")}><CircleDollarSign size={20} />Mensalidades</button>
            <button onClick={() => onChooseView("reports")}><BarChart3 size={20} />Relatórios</button>
          </div>
        </article>

        <article className="panel next-panel">
          <div className="panel-head"><div><h2>Situação das mensalidades</h2><p>Resumo das cobranças atuais</p></div></div>
          <div className="next-activity"><span>{pendingDues.length}</span><div><strong>Pagamentos pendentes</strong><p>{dues.filter((due) => due.status === "overdue").length} em atraso · {dues.filter((due) => due.status === "pending").length} aguardando pagamento</p></div><b>{money.format(pendingValue / 100)}</b></div>
        </article>
      </section>

      <section className="overview-grid overview-secondary-grid">
        <article className="panel recent-panel">
          <div className="panel-head"><div><h2>Movimentações recentes</h2><p>Últimos lançamentos registrados</p></div><button onClick={() => onChooseView("finance")}>Ver todas</button></div>
          {recentTransactions.length ? <div className="recent-list">{recentTransactions.map((item) => <div key={item.id}><span className={item.kind}>{item.kind === "income" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><p><strong>{item.description}</strong><small>{shortDate.format(new Date(item.occurredAt))} · {item.category}</small></p><b className={item.kind}>{item.kind === "income" ? "+ " : "− "}{money.format(item.amountCents / 100)}</b></div>)}</div> : <div className="rich-empty-state compact"><FileText size={23} /><strong>Sem movimentações</strong><p>Cadastre um lançamento para ele aparecer aqui.</p></div>}
        </article>

        <article className="panel local-data-panel">
          <div className="panel-head"><div><h2>Dados do grupo</h2><p>Informações compartilhadas</p></div></div>
          <div className="local-data-content"><span><Cloud size={24} /></span><div><strong>Salvos no servidor</strong><p>Consulte os registros mais recentes salvos pela equipe.</p></div><button onClick={onRefresh}><RotateCcw size={15} /> Atualizar dados</button></div>
        </article>
      </section>
    </>
  );
}

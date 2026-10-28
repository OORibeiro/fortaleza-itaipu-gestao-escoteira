"use client";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { PageHeading } from "@/components/layout/PageHeading";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { Toast, type ToastKind } from "@/components/ui/Toast";
import { Login, ChangePassword } from "@/components/Login";
import { ApiError, financeService, type Session, type Branch } from "@/services/financeService";
import type { Due, Transaction, View } from "@/types/app";
import { DuesView } from "@/views/DuesView";
import { FinanceView } from "@/views/FinanceView";
import { OverviewView } from "@/views/OverviewView";
import { ReportsView } from "@/views/ReportsView";

function currentMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function errorText(error: unknown) { return error instanceof Error ? error.message : "Não foi possível concluir a operação."; }
function parseAmount(value: FormDataEntryValue | null) {
  let raw = String(value ?? "").trim().replace(/\s/g, "");
  if (raw.includes(",")) raw = raw.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, "");
  return Number(raw);
}
export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>("finance");
  const [month, setMonth] = useState(currentMonth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDueId, setSavingDueId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const generation = useRef(0);
  const writing = useRef(false);

  const logout = useCallback((message = "") => {
    generation.current++; setSession(null); setTransactions([]); setDues([]); setBranches([]);
    setModalOpen(false); setEditingTransaction(null); setToast(null); setNotice(message); setLoadError("");
  }, []);
  const refresh = useCallback(async () => {
    if (!session || session.user.mustChangePassword) return;
    const version = ++generation.current;
    setLoading(true); setLoadError("");
    try {
      const [data, branchList] = await Promise.all([financeService.load(session.token, month), financeService.branches(session.token)]);
      if (version !== generation.current) return;
      setTransactions(data.transactions); setDues(data.dues); setBranches(branchList);
    } catch (error) {
      if (version !== generation.current) return;
      setTransactions([]); setDues([]);
      if (error instanceof ApiError && error.status === 401) logout("Sua sessão expirou. Entre novamente.");
      else setLoadError(errorText(error));
    } finally { if (version === generation.current) setLoading(false); }
  }, [session, month, logout]);
  const invalidate = useCallback(() => { generation.current++; }, []);
  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    return () => { clearTimeout(timer); invalidate(); };
  }, [refresh, invalidate]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000); return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function close(event: KeyboardEvent) { if (event.key === "Escape" && !writing.current) setModalOpen(false); }
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, []);
  function failure(error: unknown, inForm = false) {
    if (error instanceof ApiError && error.status === 401) { logout("Sua sessão expirou. Entre novamente."); return; }
    if (inForm) setFormError(errorText(error)); else setToast({ message: errorText(error), kind: "error" });
  }
  function chooseView(next: View) { setView(next); setMobileOpen(false); }
  function openNewTransaction() { if (loading || loadError || writing.current) return; setEditingTransaction(null); setFormError(""); setModalOpen(true); }
  function editTransaction(transaction: Transaction) { if (writing.current) return; setEditingTransaction(transaction); setFormError(""); setModalOpen(true); }
  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session || writing.current) return;
    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") ?? "").trim();
    const amount = parseAmount(data.get("amount"));
    const date = String(data.get("occurredAt") ?? "");
    const branchId = data.get("branchId") ? Number(data.get("branchId")) : null;
    const category = String(data.get("category") ?? "");
    if (description.length < 3 || !Number.isFinite(amount) || amount <= 0 || amount > 10000000 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || !category) { setFormError("Confira descrição, valor, data e categoria."); return; }
    if (category === "evento de ramo" && !branchId) { setFormError("Selecione o ramo para este evento."); return; }
    writing.current = true; setSaving(true); setFormError("");
    const input: Omit<Transaction, "id"> = { description, category, counterparty: "", branchId, kind: data.get("kind") === "expense" ? "expense" : "income", amountCents: Math.round(amount * 100), occurredAt: date };
    try {
      if (editingTransaction) await financeService.update(session.token, editingTransaction.id, input);
      else await financeService.create(session.token, input);
      setModalOpen(false); setEditingTransaction(null);
      setToast({ message: "Lançamento salvo no servidor.", kind: "success" });
      await refresh();
    } catch (error) { failure(error, true); }
    finally { writing.current = false; setSaving(false); }
  }
  async function deleteTransaction(transaction: Transaction) {
    if (!session || writing.current || !window.confirm(`Excluir o lançamento "${transaction.description}" do sistema?`)) return;
    writing.current = true; setSaving(true);
    try { await financeService.remove(session.token, transaction.id); setToast({ message: "Lançamento excluído.", kind: "success" }); await refresh(); }
    catch (error) { failure(error); }
    finally { writing.current = false; setSaving(false); }
  }
  async function markPaid(id: number) {
    const due = dues.find((item) => item.id === id);
    if (!session || !due || due.status === "paid" || writing.current || !window.confirm(`Confirmar pagamento de ${due.memberName}? A receita será registrada automaticamente.`)) return;
    writing.current = true; setSaving(true); setSavingDueId(id);
    try { await financeService.pay(session.token, id); setToast({ message: "Pagamento confirmado e receita registrada.", kind: "success" }); await refresh(); }
    catch (error) { failure(error); }
    finally { writing.current = false; setSaving(false); setSavingDueId(null); }
  }
  async function generateDues(input: {
    branch_id: number;
    reference_month: string;
    amount: number;
    due_day: number;
  }) {
    if (!session || writing.current) return;

    writing.current = true;
    setSaving(true);

    try {
      const result = await financeService.generateDues(session.token, input);
      setToast({
        message: result.message || "Solicitação de geração concluída.",
        kind: "success",
      });
      await refresh();
    } catch (error) {
      failure(error);
      throw error instanceof Error ? error : new Error("Não foi possível gerar as mensalidades.");
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }
  if (!session) return <Login notice={notice} onLogin={(value) => { setLoading(true); setNotice(""); setSession(value); }} />;
  if (session.user.mustChangePassword) return <ChangePassword session={session} onDone={() => logout("Senha alterada. Entre com sua nova senha.")} onCancel={() => logout()} />;
  return <main className="app-shell">
    {mobileOpen && <button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
    <Sidebar view={view} mobileOpen={mobileOpen} onChooseView={chooseView} />
    <section className="workspace">
      <Topbar overdueCount={dues.filter((due) => due.status === "overdue").length} onOpenMenu={() => setMobileOpen(true)} onShowDues={() => chooseView("dues")} />
      <div className="content">
        <div className="remote-toolbar"><span>{session.user.name}</span><button disabled={saving || loading} onClick={() => void refresh()}>Atualizar</button><button disabled={saving} onClick={() => logout()}>Sair</button></div>
        <PageHeading view={view} disabled={saving || loading || Boolean(loadError)} onOpenTransaction={openNewTransaction} />
        <label className="remote-month">Mês das mensalidades <input type="month" value={month} disabled={saving} onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value)) { setLoading(true); setMonth(event.target.value); } }} /></label>
        <p className="month-note">Resumos e relatórios de mensalidades consideram o mês selecionado. Movimentações financeiras mantêm seus próprios filtros de período.</p>
        {loading ? <div className="remote-state" role="status">Carregando dados do grupo...</div> : loadError ? <div className="remote-state" role="alert"><p>{loadError}</p><button className="primary-button" onClick={() => void refresh()}>Tentar novamente</button></div> : <>
          {view === "finance" && <FinanceView transactions={transactions} dues={dues} onOpenModal={openNewTransaction} onShowDues={() => chooseView("dues")} onEditTransaction={editTransaction} onDeleteTransaction={deleteTransaction} />}
          
<DuesView
  referenceMonth={month}
  dues={dues}
  onMarkPaid={markPaid}
  savingId={savingDueId}
  branches={branches}
  saving={saving}
  onGenerate={generateDues}
/>

          {view === "reports" && <ReportsView transactions={transactions} dues={dues} />}
          {view === "overview" && <OverviewView transactions={transactions} dues={dues} onOpenTransaction={openNewTransaction} onChooseView={chooseView} onRefresh={() => void refresh()} />}
        </>}
      </div>
    </section>
    <TransactionModal branches={branches} open={modalOpen} saving={saving} formError={formError} transaction={editingTransaction} onClose={() => setModalOpen(false)} onSubmit={submitTransaction} />
    <Toast message={toast?.message ?? ""} kind={toast?.kind} onClose={() => setToast(null)} />
  </main>;
}

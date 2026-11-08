"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { DateInput } from "@/components/ui/DateInput";
import type { Due } from "@/types/app";

export function DueEditForm({ due, saving, onClose, onSave }: {
  due: Due; saving: boolean; onClose: () => void;
  onSave: (input: { amount: number; due_date: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState((due.amountCents / 100).toFixed(2).replace(".", ","));
  const [date, setDate] = useState(due.dueDate);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  useEffect(() => { input.current?.focus(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || submitting.current) return;
    const value = Number(amount.trim().replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || value > 10000000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) {
      setError("Informe um valor positivo com até duas casas decimais (ex.: 50,00)."); return;
    }
    if (!date || date.slice(0, 7) !== due.referenceMonth) {
      setError("Escolha um vencimento válido dentro do mês de referência."); return;
    }
    submitting.current = true; setError("");
    try { await onSave({ amount: value, due_date: date }); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); }
    finally { submitting.current = false; }
  }
  return <section className="panel dues-edit" aria-labelledby="due-edit-title">
    <h2 id="due-edit-title">Editar mensalidade</h2>
    <p><strong>{due.memberName}</strong> · {due.patrol} · Referência: {due.referenceMonth.split("-").reverse().join("/")}</p>
    <form onSubmit={submit}>
      <fieldset disabled={saving} className="form-row">
        <legend className="sr-only">Dados da mensalidade</legend>
        <label className="form-field"><span>Valor (R$)</span><input ref={input} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
        <DateInput label="Data de vencimento" value={date} onChange={setDate} />
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <footer><button className="outline-inline" type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button></footer>
    </form>
  </section>;
}

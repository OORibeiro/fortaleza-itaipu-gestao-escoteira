import { ArrowDownLeft, ArrowUpRight, BadgeDollarSign, X } from "lucide-react";
import type { FormEvent } from "react";
import type { Branch } from "@/services/financeService";
import type { Transaction } from "@/types/app";

const categories = ["mensalidade", "doação", "atividade", "evento de ramo", "transporte", "infraestrutura", "materiais", "outros"];

type TransactionModalProps = {
  branches: Branch[];
  open: boolean;
  saving: boolean;
  formError: string;
  transaction?: Transaction | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function amountForInput(amountCents?: number) {
  if (amountCents == null) return "";
  return (amountCents / 100).toFixed(2).replace(".", ",");
}

function todayLocal() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TransactionModal({ branches, open, saving, formError, transaction, onClose, onSubmit }: TransactionModalProps) {
  if (!open) return null;
  const editing = Boolean(transaction);

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header>
          <div>
            <span className="modal-icon"><BadgeDollarSign size={22} /></span>
            <div>
              <h2 id="modal-title">{editing ? "Editar lançamento" : "Novo lançamento"}</h2>
              <p>{editing ? "Atualize os dados da movimentação." : "Registre uma entrada ou saída no caixa."}</p>
            </div>
          </div>
          <button aria-label="Fechar" disabled={saving} onClick={onClose}><X size={20} /></button>
        </header>
        <form key={transaction?.id ?? "new"} onSubmit={onSubmit} noValidate>
          <fieldset className="kind-switch">
            <legend>Tipo</legend>
            <label><input type="radio" name="kind" value="income" defaultChecked={!transaction || transaction.kind === "income"} /><span><ArrowDownLeft size={17} /> Entrada</span></label>
            <label><input type="radio" name="kind" value="expense" defaultChecked={transaction?.kind === "expense"} /><span><ArrowUpRight size={17} /> Saída</span></label>
          </fieldset>
          <label className="form-field"><span>Descrição *</span><input name="description" required minLength={3} maxLength={120} placeholder="Ex.: Compra de materiais" defaultValue={transaction?.description ?? ""} /></label>
          <div className="form-row">
            <label className="form-field"><span>Valor *</span><div className="money-input"><i>R$</i><input name="amount" inputMode="decimal" required placeholder="0,00" defaultValue={amountForInput(transaction?.amountCents)} /></div></label>
            <label className="form-field"><span>Data *</span><input name="occurredAt" type="date" required defaultValue={transaction?.occurredAt?.slice(0, 10) ?? todayLocal()} /></label>
          </div>
          <div className="form-row">
            <label className="form-field"><span>Categoria *</span><select name="category" defaultValue={transaction?.category ?? "outros"}>{Array.from(new Set([...categories, ...(transaction ? [transaction.category] : [])])).map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="form-field"><span>Ramo / caixa</span><select name="branchId" defaultValue={transaction?.branchId ?? ""}><option value="">Caixa geral</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          </div>
          <p className="form-hint">* Campos obrigatórios. Os dados serão salvos no sistema do grupo.</p>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <footer><button type="button" className="cancel-button" disabled={saving} onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Salvar lançamento"}</button></footer>
        </form>
      </section>
    </div>
  );
}

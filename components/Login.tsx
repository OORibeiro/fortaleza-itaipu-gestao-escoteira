"use client";
import { useState, type FormEvent } from "react";
import { financeService, type Session } from "@/services/financeService";
import { ScoutMark } from "@/components/ui/ScoutMark";
export function Login({ onLogin, notice }: { onLogin: (session: Session) => void; notice: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      const session = await financeService.login(String(data.get("email")).trim(), String(data.get("password")));
      if (!session.token || !session.user) throw new Error("Resposta de login inválida.");
      onLogin(session);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao entrar."); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><form className="login-card" onSubmit={submit}><ScoutMark /><h1>Fortaleza de Itaipu</h1><p>Entre para acessar a gestão financeira.</p>
    {notice && <p role="status">{notice}</p>}
    <label className="form-field"><span>E-mail</span><input name="email" type="email" autoComplete="username" required /></label>
    <label className="form-field"><span>Senha</span><input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button>
  </form></main>;
}
export function ChangePassword({ session, onDone, onCancel }: { session: Session; onDone: () => void; onCancel: () => void }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget); const password = String(data.get("password"));
    if (password !== data.get("confirm")) { setError("As senhas precisam ser iguais."); return; }
    setBusy(true); setError("");
    try { await financeService.changePassword(session.token, password); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha ao alterar senha."); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><form className="login-card" onSubmit={submit}><h1>Defina sua senha</h1><p>Troque a senha inicial para continuar. Depois, entre com a nova senha.</p>
    <label className="form-field"><span>Nova senha</span><input name="password" type="password" minLength={6} autoComplete="new-password" required /></label>
    <label className="form-field"><span>Confirme a nova senha</span><input name="confirm" type="password" minLength={6} autoComplete="new-password" required /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" disabled={busy}>{busy ? "Salvando..." : "Alterar senha"}</button><button className="cancel-button" type="button" disabled={busy} onClick={onCancel}>Voltar</button>
  </form></main>;
}

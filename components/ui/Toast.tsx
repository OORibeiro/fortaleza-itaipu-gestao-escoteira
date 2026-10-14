import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

export function Toast({ message, kind = "success", onClose }: { message: string; kind?: ToastKind; onClose: () => void }) {
  if (!message) return null;
  const Icon = kind === "error" ? AlertCircle : kind === "info" ? Info : CheckCircle2;
  return (
    <div className={`toast ${kind}`} role="status" aria-live="polite">
      <Icon size={19} />
      <span>{message}</span>
      <button aria-label="Fechar aviso" onClick={onClose}><X size={16} /></button>
    </div>
  );
}

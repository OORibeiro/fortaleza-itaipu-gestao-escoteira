import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogOut, Menu, RefreshCw } from "lucide-react";

type TopbarProps = {
  userName: string;
  loading: boolean;
  saving: boolean;
  onOpenMenu: () => void;
  onRefresh: () => void;
  onLogout: () => void;
};

export function Topbar({ userName, loading, saving, onOpenMenu, onRefresh, onLogout }: TopbarProps) {
  return (
    <header className="topbar account-topbar">
      <button type="button" className="icon-button mobile-menu" aria-label="Abrir menu" onClick={onOpenMenu}><Menu size={20} /></button>
      <ThemeToggle />
      <div className="account-controls">
        <div className="account-profile" title={userName}>
          <span className="account-name">{userName}</span>
        </div>
        <button type="button" className="account-button" disabled={saving || loading} aria-busy={loading} onClick={onRefresh}>
          <RefreshCw size={16} aria-hidden="true" className={loading ? "refresh-spinning" : undefined} />
          <span>{loading ? "Atualizando..." : "Atualizar"}</span>
        </button>
        <button type="button" className="account-button account-logout" disabled={saving} onClick={onLogout}>
          <LogOut size={16} aria-hidden="true" /><span>Logout</span>
        </button>
      </div>
    </header>
  );
}


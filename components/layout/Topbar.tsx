import { Bell, Menu } from "lucide-react";

type TopbarProps = {
  overdueCount: number;
  onOpenMenu: () => void;
  onShowDues: () => void;
};

export function Topbar({ overdueCount, onOpenMenu, onShowDues }: TopbarProps) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={onOpenMenu}><Menu size={20} /></button>
      <button className="icon-button notification" aria-label={overdueCount ? `${overdueCount} mensalidades em atraso` : "Sem mensalidades em atraso"} title={overdueCount ? `${overdueCount} mensalidades em atraso` : "Sem mensalidades em atraso"} onClick={onShowDues}>
        <Bell size={20} />
        {overdueCount > 0 && <span className="notification-count">{overdueCount > 9 ? "9+" : overdueCount}</span>}
      </button>
    </header>
  );
}

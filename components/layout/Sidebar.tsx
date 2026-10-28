import { Cloud } from "lucide-react";
import { navItems } from "@/data/navigation";
import type { View } from "@/types/app";
import { ScoutMark } from "@/components/ui/ScoutMark";

type SidebarProps = {
  view: View;
  mobileOpen: boolean;
  onChooseView: (view: View) => void;
};

export function Sidebar({ view, mobileOpen, onChooseView }: SidebarProps) {
  return (
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="brand">
        <ScoutMark />
        <div>
          <strong>Fortaleza de Itaipu</strong>
          <span>Grupo Escoteiro 455º</span>
        </div>
      </div>

      <nav className="nav" aria-label="Navegação principal">
        <p className="nav-label">FINANCEIRO</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => onChooseView(item.id)}>
              <Icon size={19} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="avatar">MF</div>
        <div>
          <strong>Módulo Financeiro</strong>
          <span>Gestão financeira</span>
        </div>
        <Cloud size={17} />
      </div>
    </aside>
  );
}

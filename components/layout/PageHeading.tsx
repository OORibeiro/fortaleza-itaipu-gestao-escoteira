import { Cloud, Plus } from "lucide-react";
import { viewMeta } from "@/data/navigation";
import type { View } from "@/types/app";

type PageHeadingProps = {
  view: View;
  disabled?: boolean;
  onOpenTransaction: () => void;
};

export function PageHeading({ view, disabled, onOpenTransaction }: PageHeadingProps) {
  const meta = viewMeta[view];

  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{meta.eyebrow}</p>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
      </div>

      <div className="heading-actions">
        <span className="local-mode-badge"><Cloud size={16} /> Conta conectada</span>
        {view === "finance" && (
          <button className="primary-button" disabled={disabled} onClick={onOpenTransaction}>
            <Plus size={19} /> Novo lançamento
          </button>
        )}
      </div>
    </div>
  );
}

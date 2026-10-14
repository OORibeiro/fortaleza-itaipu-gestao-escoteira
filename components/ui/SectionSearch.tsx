"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function SectionSearch({ value, onChange, label, placeholder }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return <div className="section-search" role="search" aria-label={label}>
    <Search size={19} aria-hidden="true" />
    <input ref={input} type="search" value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} placeholder={placeholder} />
    {value && <button type="button" onClick={() => { onChange(""); input.current?.focus(); }} aria-label="Limpar pesquisa"><X size={17} /></button>}
    <kbd>Ctrl K</kbd>
  </div>;
}

export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

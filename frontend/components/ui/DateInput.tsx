"use client";

import { useId, useState } from "react";
import { CalendarDays } from "lucide-react";
import "./DateInput.css";

function display(value: string) { return value ? value.split("-").reverse().join("/") : ""; }
function parse(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return "";
  const [day, month, year] = value.split("/").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > lastDay) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function DateInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const id = useId();
  const [state, setState] = useState({ source: value, text: display(value) });
  if (state.source !== value) setState({ source: value, text: display(value) });
  const invalid = state.text !== "" && !parse(state.text);
  return <div className="br-date-field">
    <label htmlFor={id}>{label}</label>
    <div className="br-date-control">
      <input id={id} type="text" inputMode="numeric" placeholder="dd/mm/yyyy" maxLength={10} value={state.text} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined} onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
        const text = digits.slice(0, 2) + (digits.length > 2 ? "/" + digits.slice(2, 4) : "") + (digits.length > 4 ? "/" + digits.slice(4) : "");
        const next = parse(text);
        setState({ source: next, text });
        onChange(next);
      }} />
      <span className="br-date-calendar"><CalendarDays size={17} aria-hidden="true" /><input type="date" aria-label={`${label}: escolher data no calendário`} value={value} onClick={(event) => { try { event.currentTarget.showPicker?.(); } catch { /* Calendário nativo padrão. */ } }} onChange={(event) => {
        const next = event.target.value;
        setState({ source: next, text: display(next) });
        onChange(next);
      }} /></span>
    </div>
    {invalid && <small id={`${id}-error`}>Informe uma data válida em dd/mm/yyyy para aplicar o filtro.</small>}
  </div>;
}

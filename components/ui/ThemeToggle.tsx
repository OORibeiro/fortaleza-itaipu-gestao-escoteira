"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "fortaleza-theme";
let memoryTheme: "light" | "dark" | null = null;
function snapshot(): "light" | "dark" {
  if (memoryTheme) return memoryTheme;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* O tema continua funcionando sem armazenamento disponível. */ }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const storage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) { memoryTheme = null; callback(); }
  };
  window.addEventListener("fortaleza-theme-change", callback);
  window.addEventListener("storage", storage);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("fortaleza-theme-change", callback);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", callback);
  };
}
function useTheme() {
  return useSyncExternalStore(subscribe, snapshot, () => "light" as const);
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return <>{children}</>;
}
export function ThemeToggle() {
  const theme = useTheme();
  const target = theme === "dark" ? "light" : "dark";
  const label = target === "dark" ? "Ativar tema escuro" : "Ativar tema claro";
  return <button type="button" className="theme-toggle" title={label} aria-label={label} onClick={() => {
    memoryTheme = target;
    try { localStorage.setItem(KEY, target); } catch { /* Preferência mantida nesta sessão. */ }
    document.documentElement.dataset.theme = target;
    window.dispatchEvent(new Event("fortaleza-theme-change"));
  }}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}<span>{target === "dark" ? "Tema escuro" : "Tema claro"}</span></button>;
}

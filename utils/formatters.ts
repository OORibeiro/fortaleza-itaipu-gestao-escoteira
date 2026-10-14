export const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("");
}

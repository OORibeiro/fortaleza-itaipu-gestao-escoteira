// Inclui o mês atual até hoje e os meses anteriores.
export function financePeriod(months: 3 | 6 | 12, today = new Date()) {
  const first = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);
  const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { from: format(first), to: format(today) };
}

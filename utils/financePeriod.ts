/** Intervalo inclusivo de N meses até a data local informada. */
export function financePeriod(months: 3 | 6 | 12, today = new Date()) {
  if (![3, 6, 12].includes(months) || Number.isNaN(today.getTime())) {
    throw new Error("Período inválido.");
  }
  // Parte do dia 1 para evitar que 31 de maio menos três meses avance para março.
  const first = new Date(today.getFullYear(), today.getMonth() - months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(today.getDate(), lastDay));
  const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { from: format(first), to: format(today) };
}

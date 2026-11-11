// Usa a data contábil recebida da API, sem conversão de fuso horário.
export function overviewTransactions<T extends { occurredAt: string }>(
  transactions: T[], referenceMonth: string, period = 1,
): T[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth) || ![1, 3, 6, 12].includes(period)) return [];
  const [year, month] = referenceMonth.split("-").map(Number);
  const last = year * 12 + month - 1;
  const first = last - period + 1;
  return transactions.filter((item) => {
    const key = item.occurredAt.slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return false;
    const [itemYear, itemMonth] = key.split("-").map(Number);
    const index = itemYear * 12 + itemMonth - 1;
    return index >= first && index <= last;
  });
}

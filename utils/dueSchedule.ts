export function dueSchedule(referenceMonth: string, day: number, count: 1 | 6 | 12) {
  if (![1, 6, 12].includes(count)) return [];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth)) return [];
  const [year, month] = referenceMonth.split('-').map(Number);
  if (year < 1000 || year > 9998 || !Number.isInteger(day) || day < 1 || day > new Date(year, month, 0).getDate()) return [];
  return Array.from({length:count}, (_, index) => {
    const date = new Date(year, month - 1 + index, 1);
    const lastDay = new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(Math.min(day,lastDay)).padStart(2,'0')}`;
  });
}

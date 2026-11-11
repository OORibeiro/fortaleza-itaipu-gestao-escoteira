export function monthRange(reference: string, count: number) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(reference) || ![1,3,6,12].includes(count)) throw new Error('Período inválido.');
  const [year, month] = reference.split('-').map(Number);
  const start = new Date(year, month-count, 1);
  const last = new Date(year, month, 0).getDate();
  return {from:`${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-01`,to:`${reference}-${String(last).padStart(2,'0')}`};
}
export function referenceMonths(from: string, to: string) {
  const valid = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y,m,d]=value.split('-').map(Number);
    return y>=1000 && m>=1 && m<=12 && d>=1 && d<=new Date(y,m,0).getDate();
  };
  if (!valid(from) || !valid(to) || from>to) throw new Error('Informe as duas datas válidas, com início anterior ou igual ao fim.');
  const [y,m]=from.split('-').map(Number);const [ey,em]=to.split('-').map(Number);
  const count=(ey-y)*12+em-m+1;
  if(count>120) throw new Error('Selecione no máximo 120 meses por relatório.');
  return Array.from({length:count},(_,i)=>{const date=new Date(y,m-1+i,1);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`;});
}

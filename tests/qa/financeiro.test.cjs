const { monthRange } = require('../../utils/reportPeriod.ts');
const { financePeriod } = require('../../utils/financePeriod.ts');
const { dueSchedule } = require('../../utils/dueSchedule.ts');
const hoje = new Date(2026, 10, 16, 12);

describe('Períodos financeiros e relatórios', () => {
  test('3 meses mantém o dia atual', () => {
    expect(financePeriod(3, hoje)).toEqual({from:'2026-08-16', to:'2026-11-16'});
  });
  test('12 meses atravessa o ano mantendo o dia', () => {
    expect(financePeriod(12, hoje)).toEqual({from:'2025-11-16', to:'2026-11-16'});
  });
  test('rejeita mês inválido na seleção mensal', () => {
    expect(() => monthRange('2026-13', 1)).toThrow('Período inválido.');
  });
  test('6 meses mantém o dia atual', () => {
    expect(financePeriod(6, hoje)).toEqual({from:'2026-05-16', to:'2026-11-16'});
  });
  test('ajusta dia inexistente sem avançar para março', () => {
    expect(financePeriod(3, new Date(2026, 4, 31, 12))).toEqual({from:'2026-02-28', to:'2026-05-31'});
    expect(financePeriod(3, new Date(2028, 4, 31, 12))).toEqual({from:'2028-02-29', to:'2028-05-31'});
    expect(financePeriod(12, new Date(2028, 1, 29, 12))).toEqual({from:'2027-02-28', to:'2028-02-29'});
  });
  test('Mês selecionado continua abrangendo o mês inteiro', () => {
    expect(monthRange('2026-11', 1)).toEqual({from:'2026-11-01', to:'2026-11-30'});
  });
});

describe('Vencimentos das mensalidades', () => {
  test('calcula uma cobrança no mês selecionado', () => {
    const resultado = dueSchedule('2026-11', 10, 1);
    expect(resultado.length).toBe(1);
    expect(resultado[0]).toBe('2026-11-10');
  });
  test('ajusta o dia 31 nos meses mais curtos', () => {
    expect(dueSchedule('2026-12', 31, 6)).toEqual([
      '2026-12-31', '2027-01-31', '2027-02-28',
      '2027-03-31', '2027-04-30', '2027-05-31',
    ]);
  });
});

import { describe, it, expect } from 'vitest';
import { preverProximos, type Lancamento } from '../src/previsao.ts';

const H: Lancamento[] = [
  { desc: 'Netflix', data: '2026-09-16', centavos: -5590 },
  { desc: 'Netflix', data: '2026-10-16', centavos: -5590 },
  { desc: 'Salário', data: '2026-10-05', centavos: 300000 },
  { desc: 'Salário', data: '2026-09-05', centavos: 300000 },
  { desc: 'Feira', data: '2026-10-15', centavos: -18450 }, // só um mês: não é fixo
  { desc: 'Academia', data: '2026-09-30', centavos: -9900 },
  { desc: 'Academia', data: '2026-10-31', centavos: -9900 },
];

describe('preverProximos', () => {
  it('prevê só fixos que caem nos próximos 5 dias, em ordem', () => {
    expect(preverProximos(H, '2026-11-14').map((l) => [l.desc, l.data])).toEqual([
      ['Netflix', '2026-11-16'],
    ]);
  });

  it('ignora lançamentos de um mês só', () => {
    expect(preverProximos(H, '2026-11-14', 30).some((l) => l.desc === 'Feira')).toBe(false);
  });

  it('pula meses já passados e ajusta para o último dia do mês', () => {
    const r = preverProximos(H, '2026-11-26', 5);
    expect(r.map((l) => [l.desc, l.data])).toEqual([['Academia', '2026-11-30']]);
  });

  it('não inclui o próprio dia de hoje', () => {
    expect(preverProximos(H, '2026-11-16', 1)).toEqual([]);
  });
});

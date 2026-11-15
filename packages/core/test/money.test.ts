import { describe, it, expect } from 'vitest';
import { Money } from '../src/money.ts';

// Intl uses a non-breaking space after "R$"
const fmt = (m: Money) => m.toString().replace(/\s/g, ' ');

describe('Money', () => {
  it('formata em reais', () => {
    expect(fmt(Money.fromCentavos(5))).toBe('R$ 0,05');
    expect(fmt(Money.fromCentavos(100_000_000))).toBe('R$ 1.000.000,00');
    expect(fmt(Money.fromCentavos(-1230))).toBe('-R$ 12,30');
  });
  it('soma sem erro de ponto flutuante', () => {
    expect(Money.fromReais(0.1).add(Money.fromReais(0.2)).centavos).toBe(30);
  });
  it('negativos', () => {
    expect(Money.fromCentavos(500).sub(Money.fromCentavos(800)).isNegative()).toBe(true);
  });
  it('recusa centavos fracionados', () => {
    expect(() => Money.fromCentavos(1.5)).toThrow(RangeError);
  });
});

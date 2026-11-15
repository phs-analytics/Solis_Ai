import { describe, it, expect } from 'vitest';
import { saudacao } from '../src/saudacao.ts';

describe('saudação por horário', () => {
  it.each([
    [0, 'Boa noite!'],
    [4, 'Boa noite!'],
    [5, 'Bom dia!'],
    [11, 'Bom dia!'],
    [12, 'Boa tarde!'],
    [17, 'Boa tarde!'],
    [18, 'Boa noite!'],
    [23, 'Boa noite!'],
  ])('%i h → %s', (hora, esperado) => {
    expect(saudacao(hora)).toBe(esperado);
  });
});

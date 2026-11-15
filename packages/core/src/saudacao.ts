/** Greeting for the hour of the day: 5h–11h59 bom dia, 12h–17h59 boa tarde, the rest boa noite. */
export function saudacao(hora: number): string {
  if (hora >= 5 && hora < 12) return 'Bom dia!';
  if (hora >= 12 && hora < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

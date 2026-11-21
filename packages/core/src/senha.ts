export type RegraSenha = { id: string; texto: string; ok: boolean };

const COMUNS = [
  "senha", "password", "123456", "qwerty", "abc123", "solis", "brasil", "admin", "iloveyou", "mudar",
];

function temSequencia(s: string): boolean {
  const t = s.toLowerCase();
  for (let i = 0; i + 3 < t.length; i++) {
    const d = t.charCodeAt(i + 1) - t.charCodeAt(i);
    if (Math.abs(d) === 1 && t.charCodeAt(i + 2) - t.charCodeAt(i + 1) === d && t.charCodeAt(i + 3) - t.charCodeAt(i + 2) === d) {
      return true;
    }
  }
  return false;
}

/** Regras no padrão de bancos e apps de segurança; `pessoais` (nome, ano de nascimento) não podem aparecer na senha. */
export function avaliarSenha(senha: string, pessoais: string[] = []): RegraSenha[] {
  const baixa = senha.toLowerCase();
  const pessoal = pessoais
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length >= 3)
    .some((p) => baixa.includes(p));
  return [
    { id: "tamanho", texto: "12 caracteres ou mais", ok: senha.length >= 12 },
    { id: "maiuscula", texto: "Uma letra maiúscula", ok: /\p{Lu}/u.test(senha) },
    { id: "minuscula", texto: "Uma letra minúscula", ok: /\p{Ll}/u.test(senha) },
    { id: "numero", texto: "Um número", ok: /\d/.test(senha) },
    { id: "simbolo", texto: "Um símbolo (ex.: ! @ # $ %)", ok: /[^\p{L}\d\s]/u.test(senha) },
    {
      id: "padrao",
      texto: "Sem repetições (aaa) ou sequências (1234, abcd)",
      ok: senha.length > 0 && !/(.)\1\1/.test(senha) && !temSequencia(senha),
    },
    {
      id: "comum",
      texto: "Sem palavras óbvias, seu nome ou ano de nascimento",
      ok: senha.length > 0 && !pessoal && !COMUNS.some((c) => baixa.includes(c)),
    },
  ];
}

export function senhaForte(senha: string, pessoais: string[] = []): boolean {
  return avaliarSenha(senha, pessoais).every((r) => r.ok);
}

import type { NomeIcone } from "../Icone";

// Ícones que a pessoa escolhe ao criar uma meta; a chave é o que fica salvo em metas.icone.
export const ICONES_META: { key: string; icone: NomeIcone; label: string }[] = [
  { key: "cofrinho", icone: "piggy-bank", label: "Cofrinho" },
  { key: "viagem", icone: "plane-alt", label: "Viagem" },
  { key: "emergencia", icone: "shield-check", label: "Reserva" },
  { key: "celular", icone: "mobile-notch", label: "Celular" },
  { key: "casa", icone: "house-chimney", label: "Casa" },
  { key: "carro", icone: "car-side", label: "Carro" },
  { key: "estudo", icone: "graduation-cap", label: "Estudos" },
  { key: "presente", icone: "gift", label: "Presente" },
  { key: "saude", icone: "heart", label: "Saúde" },
  { key: "outros", icone: "star", label: "Outros" },
];

// chaves antigas que já podem estar salvas no banco
const LEGADO: Record<string, NomeIcone> = { bullseye: "bullseye", vestuario: "tshirt", computador: "laptop" };

export function iconeMeta(key: string | null): NomeIcone {
  if (!key) return "piggy-bank";
  return ICONES_META.find((i) => i.key === key)?.icone ?? LEGADO[key] ?? "star";
}

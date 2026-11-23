import { createContext, useContext } from "react";
import { Appearance, useColorScheme } from "react-native";
import type { PreferenciaTema } from "@solis/dados";
import { FAMILIA } from "./fontes";

/**
 * Tokens tipográficos com família explícita (usados direto na Splash, no Desbloqueio e na marca).
 * O resto do app passa pelo componente Texto, que escolhe a família pelo peso.
 */
export const tipo = {
  marca: (tam: number) => ({ fontFamily: FAMILIA.jakarta.bold, fontSize: tam, letterSpacing: tam * -0.03 }),
  display: (tam: number) => ({ fontFamily: FAMILIA.jakarta.bold, fontSize: tam, lineHeight: Math.round(tam * 1.12), letterSpacing: tam * -0.03 }),
  valor: (tam: number, forte = true) => ({
    fontFamily: forte ? FAMILIA.jakarta.bold : FAMILIA.jakarta.semibold, fontSize: tam, fontVariant: ["tabular-nums" as const],
  }),
  corpo: (tam = 15, forte: "regular" | "medium" | "semibold" = "regular") => ({
    fontFamily: FAMILIA.inter[forte], fontSize: tam, lineHeight: Math.round(tam * 1.5),
  }),
  botao: (tam = 16) => ({ fontFamily: FAMILIA.jakarta.bold, fontSize: tam }),
};

/** Sobrepõe o tema do sistema só dentro do app; "sistema" volta a seguir o celular. */
export function aplicarPreferenciaTema(p: PreferenciaTema) {
  Appearance.setColorScheme(p === "claro" ? "light" : p === "escuro" ? "dark" : "auto");
}

const base = {
  radius: { sm: 8, md: 16, lg: 24 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  font: {
    saldo: { fontSize: 36, fontWeight: "700" as const, letterSpacing: -1.1, fontVariant: ["tabular-nums" as const] },
    titulo: { fontSize: 20, fontWeight: "700" as const },
    corpo: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
    legenda: { fontSize: 12, fontWeight: "400" as const, lineHeight: 18 },
  },
};

export const temaClaro = {
  ...base,
  dark: false,
  cores: {
    fundo: "#EEE9DF",      // Palladian
    superficie: "#FBF8F2",
    primario: "#A35139",   // Truffle Trouble
    sobrePrimario: "#FFFFFF",
    primarioSuave: "#F7EBE3",
    texto: "#1B2632",      // Abyssal Anchorfish Blue
    textoSuave: "#55606B",
    borda: "#C9C1B1",      // Oatmeal
    erro: "#B3261E",
    sucesso: "#276B43",
    aviso: "#8A5210",      // Burning Flame escurecido: o #FFB162 não tem contraste como texto no claro
    tabBar: "#FBF8F2",
    tabAtiva: "#A35139",
    tabInativa: "#7D8790",
    statusBar: "dark-content" as const,
  },
};

export const temaEscuro = {
  ...base,
  dark: true,
  cores: {
    fundo: "#1B2632",      // Abyssal Anchorfish Blue
    superficie: "#2C3B4D", // Blue Fantastic
    primario: "#FFB162",   // Burning Flame
    sobrePrimario: "#1B2632",
    primarioSuave: "#3A3127",
    texto: "#EEE9DF",      // Palladian
    textoSuave: "#A9A293",
    borda: "#3A4B5F",
    erro: "#F59580",
    sucesso: "#7BC79A",
    aviso: "#FFB162",
    tabBar: "#2C3B4D",
    tabAtiva: "#FFB162",
    tabInativa: "#8C96A3",
    statusBar: "light-content" as const,
  },
};

type StatusBarStyle = "dark-content" | "light-content" | "default";

export type Tema = Omit<typeof temaClaro, "cores"> & {
  cores: Omit<typeof temaClaro.cores, "statusBar"> & { statusBar: StatusBarStyle };
};

// Permite que um trecho do app (ex.: o onboarding) use sempre um tema, ignorando o do celular.
const TemaForcado = createContext<Tema | null>(null);
export const ForcarTema = TemaForcado.Provider;

export function useTema(): Tema {
  const esquema = useColorScheme();
  const forcado = useContext(TemaForcado);
  return forcado ?? (esquema === "dark" ? temaEscuro : temaClaro);
}

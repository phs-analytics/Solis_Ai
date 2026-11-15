import { useColorScheme } from "react-native";

const base = {
  radius: { sm: 8, md: 16, lg: 24 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  font: {
    saldo: { fontSize: 36, fontWeight: "700" as const, letterSpacing: -1 },
    titulo: { fontSize: 20, fontWeight: "700" as const },
    corpo: { fontSize: 15, fontWeight: "400" as const },
    legenda: { fontSize: 12, fontWeight: "400" as const },
  },
};

export const temaClaro = {
  ...base,
  dark: false,
  cores: {
    fundo: "#F5F7FA",
    superficie: "#FFFFFF",
    primario: "#1A6B4A",
    primarioSuave: "#E8F5EE",
    texto: "#0D1117",
    textoSuave: "#6B7280",
    borda: "#E5E7EB",
    erro: "#DC2626",
    sucesso: "#16A34A",
    aviso: "#D97706",
    tabBar: "#FFFFFF",
    tabAtiva: "#1A6B4A",
    tabInativa: "#9CA3AF",
    statusBar: "dark-content" as const,
  },
};

export const temaEscuro = {
  ...base,
  dark: true,
  cores: {
    fundo: "#0D1117",
    superficie: "#161B22",
    primario: "#2ECC71",
    primarioSuave: "#0D2E1A",
    texto: "#F0F6FC",
    textoSuave: "#8B949E",
    borda: "#21262D",
    erro: "#F85149",
    sucesso: "#2ECC71",
    aviso: "#E3B341",
    tabBar: "#161B22",
    tabAtiva: "#2ECC71",
    tabInativa: "#6E7681",
    statusBar: "light-content" as const,
  },
};

type StatusBarStyle = "dark-content" | "light-content" | "default";

export type Tema = Omit<typeof temaClaro, "cores"> & {
  cores: Omit<typeof temaClaro.cores, "statusBar"> & { statusBar: StatusBarStyle };
};

export function useTema(): Tema {
  const esquema = useColorScheme();
  return esquema === "dark" ? temaEscuro : temaClaro;
}

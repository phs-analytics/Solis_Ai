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
    fundo: "#FDF4FF",
    superficie: "#FFFFFF",
    primario: "#C2286B",   // Hot Rose
    primarioSuave: "#FCEEF6",
    texto: "#25104D",      // Dark Amethyst
    textoSuave: "#7A4E6E",
    borda: "#EDD5F0",
    erro: "#DC2626",
    sucesso: "#16A34A",
    aviso: "#FAB940",      // Sunflower Gold
    tabBar: "#FFFFFF",
    tabAtiva: "#C2286B",
    tabInativa: "#B08099",
    statusBar: "dark-content" as const,
  },
};

export const temaEscuro = {
  ...base,
  dark: true,
  cores: {
    fundo: "#1A0929",      // Deep Amethyst
    superficie: "#2D1442",
    primario: "#FAB940",   // Sunflower Gold
    primarioSuave: "#2D1E04",
    texto: "#F7D9FC",      // Lavender Veil
    textoSuave: "#B08099",
    borda: "#3D1E52",
    erro: "#F85149",
    sucesso: "#2ECC71",
    aviso: "#FAB940",
    tabBar: "#2D1442",
    tabAtiva: "#FAB940",
    tabInativa: "#6E4E7A",
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

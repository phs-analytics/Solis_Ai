// Importa só os pesos usados (cada peso é um arquivo .ttf embutido no app).
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans/600SemiBold";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";

/** Passe a `useFonts`: no Android cada peso é uma família própria. */
export const FONTES = {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
};

export const FAMILIA = {
  inter: { regular: "Inter_400Regular", medium: "Inter_500Medium", semibold: "Inter_600SemiBold" },
  jakarta: { medium: "PlusJakartaSans_500Medium", semibold: "PlusJakartaSans_600SemiBold", bold: "PlusJakartaSans_700Bold" },
} as const;

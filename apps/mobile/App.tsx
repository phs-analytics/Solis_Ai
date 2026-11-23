import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { lerTema } from "@solis/dados";
import { AppNavigator } from "./src/navigation";
import { aplicarPreferenciaTema } from "./src/theme";
import { FONTES } from "./src/theme/fontes";

export default function App() {
  const [temaPronto, setTemaPronto] = useState(false);
  const [fontesProntas, erroFontes] = useFonts(FONTES);

  // Aplica a escolha salva antes da primeira tela, sem piscar o tema errado.
  useEffect(() => {
    lerTema()
      .then(aplicarPreferenciaTema)
      .catch(() => {})
      .finally(() => setTemaPronto(true));
  }, []);

  // Nada é desenhado antes das fontes e do tema: sem piscar a fonte padrão. Se as fontes falharem, segue com a do sistema.
  if (!temaPronto || (!fontesProntas && !erroFontes)) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

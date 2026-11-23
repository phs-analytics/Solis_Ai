import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { lerTema } from "@solis/dados";
import { AppNavigator } from "./src/navigation";
import { aplicarPreferenciaTema } from "./src/theme";

export default function App() {
  const [temaPronto, setTemaPronto] = useState(false);

  // Aplica a escolha salva antes da primeira tela, sem piscar o tema errado.
  useEffect(() => {
    lerTema()
      .then(aplicarPreferenciaTema)
      .catch(() => {})
      .finally(() => setTemaPronto(true));
  }, []);

  if (!temaPronto) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

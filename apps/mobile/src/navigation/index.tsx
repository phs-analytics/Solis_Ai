import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { lerPrefs, lerCredenciaisPluggy, sincronizarPluggy } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { useTema } from "../theme";
import { BancoProvider } from "../contexto/BancoContext";
import { Splash } from "../screens/Splash";
import { Onboarding } from "../screens/Onboarding";
import { Desbloquear } from "../screens/Desbloquear";
import { Home } from "../screens/Home";
import { Lancamentos } from "../screens/Lancamentos";
import { Metas } from "../screens/Metas";
import { Mais } from "../screens/Mais";
import { Investimentos } from "../screens/Investimentos";
import { ChatSolis } from "../screens/ChatSolis";
import { NovaConta } from "../screens/NovaConta";
import { NovoLancamento } from "../screens/NovoLancamento";
import { Importacao } from "../screens/Importacao";
import { ConexaoBancaria } from "../screens/ConexaoBancaria";

export type RootStackParams = {
  Splash: undefined;
  Acesso: undefined;
  App: undefined;
  NovaConta: undefined;
  NovoLancamento: undefined;
  Importacao: undefined;
  ConexaoBancaria: undefined;
};

export type TabParams = {
  Inicio: undefined;
  Lancamentos: undefined;
  Metas: undefined;
  Chat: undefined;
  Investimentos: undefined;
  Mais: undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator<TabParams>();

function TabIcon({ nome, focado, cor }: { nome: string; focado: boolean; cor: string }) {
  const icones: Record<string, { ativo: string; inativo: string }> = {
    Inicio: { ativo: "⌂", inativo: "⌂" },
    Lancamentos: { ativo: "↕", inativo: "↕" },
    Metas: { ativo: "◎", inativo: "◎" },
    Chat: { ativo: "🌟", inativo: "🌟" },
    Investimentos: { ativo: "📈", inativo: "📈" },
    Mais: { ativo: "≡", inativo: "≡" },
  };
  return (
    <Text style={{ fontSize: 20, color: cor, opacity: focado ? 1 : 0.6 }}>
      {icones[nome]?.ativo ?? "•"}
    </Text>
  );
}

function Tabs() {
  const tema = useTema();
  const c = tema.cores;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.borda,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: c.tabAtiva,
        tabBarInactiveTintColor: c.tabInativa,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
        tabBarIcon: ({ focused, color }) => (
          <TabIcon nome={route.name} focado={focused} cor={color} />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={Home} options={{ title: "Início" }} />
      <Tab.Screen name="Lancamentos" component={Lancamentos} options={{ title: "Lançamentos" }} />
      <Tab.Screen name="Metas" component={Metas} options={{ title: "Metas" }} />
      <Tab.Screen name="Chat" component={ChatSolis} options={{ title: "Solis AI" }} />
      <Tab.Screen name="Investimentos" component={Investimentos} options={{ title: "Invest." }} />
      <Tab.Screen name="Mais" component={Mais} options={{ title: "Mais" }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const [banco, setBanco] = useState<Banco | null>(null);
  // null = ainda verificando se já existe senha configurada
  const [configurado, setConfigurado] = useState<boolean | null>(null);

  useEffect(() => {
    lerPrefs().then((p) => setConfigurado(p !== null)).catch(() => setConfigurado(false));
  }, []);

  // Ao abrir o cofre, busca o Meu Pluggy se estiver conectado (a própria função respeita as 24h).
  useEffect(() => {
    if (!banco) return;
    lerCredenciaisPluggy()
      .then((cred) => cred && sincronizarPluggy(banco, cred))
      .catch(() => {}); // sem internet: tenta de novo na próxima abertura
  }, [banco]);

  return (
    <BancoProvider value={banco}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {banco ? (
            <>
              <Stack.Screen name="App" component={Tabs} />
              <Stack.Screen name="NovaConta" options={{ headerShown: true, title: "Nova conta" }}>
                {({ navigation }) => <NovaConta onSalvo={() => navigation.goBack()} />}
              </Stack.Screen>
              <Stack.Screen name="NovoLancamento" options={{ headerShown: true, title: "Novo lançamento" }}>
                {({ navigation }) => <NovoLancamento onSalvo={() => navigation.goBack()} />}
              </Stack.Screen>
              <Stack.Screen name="Importacao" component={Importacao} options={{ headerShown: true, title: "Importar extrato" }} />
              <Stack.Screen name="ConexaoBancaria" component={ConexaoBancaria} options={{ headerShown: true, title: "Conexão bancária" }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Splash" component={Splash} />
              <Stack.Screen name="Acesso">
                {() =>
                  configurado ? (
                    <Desbloquear aoAbrir={setBanco} aoApagado={() => setConfigurado(false)} />
                  ) : (
                    <Onboarding aoConcluir={setBanco} />
                  )
                }
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </BancoProvider>
  );
}

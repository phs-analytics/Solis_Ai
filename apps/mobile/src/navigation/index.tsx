import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { useTema } from "../theme";
import { Splash } from "../screens/Splash";
import { Home } from "../screens/Home";
import { Lancamentos } from "../screens/Lancamentos";
import { Metas } from "../screens/Metas";
import { Mais } from "../screens/Mais";
import { Investimentos } from "../screens/Investimentos";
import { ChatSolis } from "../screens/ChatSolis";

export type RootStackParams = {
  Splash: undefined;
  App: undefined;
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
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="App" component={Tabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

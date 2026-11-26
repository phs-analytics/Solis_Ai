import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import Animated, { useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { lerPrefs, lerCredenciaisPluggy, sincronizarPluggy } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { auxiliares, useTema } from "../theme";
import { FAMILIA } from "../theme/fontes";
import { NavIcone, type NomeNav } from "../components/NavIcone";
import { BancoProvider } from "../contexto/BancoContext";
import { Splash } from "../screens/Splash";
import { Onboarding } from "../screens/Onboarding";
import { Desbloquear } from "../screens/Desbloquear";
import { RestaurarBackup } from "../screens/RestaurarBackup";
import { Home } from "../screens/Home";
import { Lancamentos } from "../screens/Lancamentos";
import { Cartoes } from "../screens/Cartoes";
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
  Acesso: { entrar?: boolean } | undefined;
  App: undefined;
  NovaConta: undefined;
  NovoLancamento: {
    tipo?: "despesa" | "receita" | "transferencia"; descricao?: string; valorCentavos?: number; categoriaId?: string; contaId?: string;
  } | undefined;
  Importacao: undefined;
  ConexaoBancaria: undefined;
  Lancamentos: { focarBusca?: number } | undefined;
};

export type TabParams = {
  Inicio: undefined;
  Cartoes: undefined;
  Metas: undefined;
  Investimentos: undefined;
  Chat: undefined;
  Mais: undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator<TabParams>();

// Duas cápsulas flutuantes: 4 abas à esquerda, Solis AI e Mais à direita.
const ABAS: Array<{ name: keyof TabParams; label?: string; icone: NomeNav; direita?: boolean }> = [
  { name: "Inicio", label: "Início", icone: "home" },
  { name: "Cartoes", label: "Cartões", icone: "card" },
  { name: "Metas", label: "Metas", icone: "goal" },
  { name: "Investimentos", label: "Invest.", icone: "chart" },
  { name: "Chat", label: "Solis AI", icone: "ai", direita: true },
  { name: "Mais", icone: "layers", direita: true },
];

const LARG = 42;
const MOLA = { damping: 15, stiffness: 180, mass: 0.9 };

function BotaoAba({ aba, ativo, onPress }: { aba: (typeof ABAS)[number]; ativo: boolean; onPress: () => void }) {
  const c = useTema().cores;
  const [lw, setLw] = useState(0);
  const [play, setPlay] = useState(0);
  const aberto = ativo && !!aba.label && lw > 0;
  const caixa = useAnimatedStyle(() => ({ width: withSpring(aberto ? 11 + 20 + 7 + lw + 15 : LARG, MOLA) }));
  const fundo = useAnimatedStyle(() => ({
    opacity: withTiming(ativo ? 1 : 0, { duration: 220 }),
    transform: [{ scale: withSpring(ativo ? 1 : 0.82, MOLA) }],
  }));
  const rotulo = useAnimatedStyle(() => ({
    opacity: withTiming(aberto ? 1 : 0, { duration: aberto ? 260 : 120 }),
    transform: [{ translateX: withSpring(aberto ? 0 : -6, MOLA) }],
  }));
  return (
    <Pressable
      onPress={() => { setPlay((n) => n + 1); onPress(); }}
      accessibilityRole="tab"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={aba.label ?? "Mais"}
    >
      <Animated.View style={[{ height: LARG, borderRadius: 999, overflow: "hidden", justifyContent: "center", paddingLeft: 11 }, caixa]}>
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 999, backgroundColor: c.primario }, fundo]} />
        <NavIcone nome={aba.icone} cor={ativo ? c.sobrePrimario : c.tabInativa} play={play} />
        {aba.label ? (
          <Animated.Text
            numberOfLines={1}
            onLayout={(e) => setLw(Math.ceil(e.nativeEvent.layout.width))}
            style={[{ position: "absolute", left: 38, color: c.sobrePrimario, fontSize: 13, fontFamily: FAMILIA.inter.semibold, includeFontPadding: false }, rotulo]}
          >
            {aba.label}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const c = useTema().cores;
  const atual = state.routes[state.index]?.name;
  const goTo = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const ev = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!ev.defaultPrevented) navigation.navigate(name as never);
  };
  const pilula = {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 2, padding: 5, borderRadius: 999,
    backgroundColor: c.tabBar, borderWidth: 1, borderColor: c.borda,
    shadowColor: auxiliares.preto, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  };
  const botao = (a: (typeof ABAS)[number]) => <BotaoAba key={a.name} aba={a} ativo={atual === a.name} onPress={() => goTo(a.name)} />;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", bottom: 20, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 8 }}>
      <View style={pilula}>{ABAS.filter((a) => !a.direita).map(botao)}</View>
      <View style={pilula}>{ABAS.filter((a) => a.direita).map(botao)}</View>
    </View>
  );
}

function Tabs() {
  const tema = useTema();
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { paddingBottom: 90, backgroundColor: tema.cores.fundo },
      }}
    >
      <Tab.Screen name="Inicio"        component={Home}        options={{ title: "Início" }} />
      <Tab.Screen name="Cartoes"       component={Cartoes}     options={{ title: "Cartões" }} />
      <Tab.Screen name="Metas"         component={Metas}       options={{ title: "Metas" }} />
      <Tab.Screen name="Investimentos" component={Investimentos} options={{ title: "Invest." }} />
      <Tab.Screen name="Chat"          component={ChatSolis}   options={{ title: "Solis AI" }} />
      <Tab.Screen name="Mais"          component={Mais}        options={{ title: "Mais" }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const [banco, setBanco] = useState<Banco | null>(null);
  const [configurado, setConfigurado] = useState<boolean | null>(null);

  useEffect(() => {
    lerPrefs().then((p) => setConfigurado(p !== null)).catch(() => setConfigurado(false));
  }, []);

  useEffect(() => {
    if (!banco) return;
    lerCredenciaisPluggy()
      .then((cred) => cred && sincronizarPluggy(banco, cred))
      .catch(() => {});
  }, [banco]);

  return (
    <BancoProvider value={banco}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, headerTitleStyle: { fontFamily: FAMILIA.jakarta.semibold } }}>
          {banco ? (
            <>
              <Stack.Screen name="App" component={Tabs} />
              <Stack.Screen name="NovaConta" options={{ headerShown: true, title: "Nova conta" }}>
                {({ navigation }) => <NovaConta onSalvo={() => navigation.goBack()} />}
              </Stack.Screen>
              <Stack.Screen name="NovoLancamento" options={{ headerShown: true, title: "Novo lançamento" }}>
                {({ navigation, route }) => <NovoLancamento onSalvo={() => navigation.goBack()} inicial={route.params} />}
              </Stack.Screen>
              <Stack.Screen name="Lancamentos" component={Lancamentos} options={{ headerShown: true, title: "Lançamentos" }} />
              <Stack.Screen name="Importacao" component={Importacao} options={{ headerShown: true, title: "Importar extrato" }} />
              <Stack.Screen name="ConexaoBancaria" component={ConexaoBancaria} options={{ headerShown: true, title: "Conexão bancária" }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Splash" component={Splash} />
              <Stack.Screen name="Acesso">
                {({ route }) =>
                  configurado ? (
                    <Desbloquear aoAbrir={setBanco} aoApagado={() => setConfigurado(false)} />
                  ) : route.params?.entrar ? (
                    <RestaurarBackup aoAbrir={setBanco} />
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

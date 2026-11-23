import React, { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParams } from "../navigation";
import { Texto as Text } from "../components/Texto";
import { tipo } from "../theme";
import { FAMILIA } from "../theme/fontes";
import { BotaoCTA, MOLA } from "../onboarding/componentes";

type Props = NativeStackScreenProps<RootStackParams, "Splash">;

// Tela de entrada, sempre escura. Cores da paleta do Solis: Burning Flame, Truffle e um fundo obsidiana.
const FUNDO = "#0F151C";
const AMBAR = "#FFB162";
const SUAVE = "#A9A293";

// Brilho solar feito de 40 círculos concêntricos bem transparentes (o gradiente do Expo é só linear). A cor vai de
// terracota escuro na borda a terracota e a âmbar no núcleo; a soma das transparências cria o degradê radial.
const N_CAMADAS = 40;
const ALFA = 0.046; // 40 camadas somam ~0,85 no centro
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const CAMADAS = Array.from({ length: N_CAMADAS }, (_, k) => {
  const t = k / (N_CAMADAS - 1);
  const [de, para, u] = t < 0.5 ? [[122, 48, 32], [163, 81, 57], t * 2] as const : [[163, 81, 57], [255, 177, 98], (t - 0.5) * 2] as const;
  return { f: 1.9 - t * 1.65, cor: `rgba(${lerp(de[0], para[0], u)},${lerp(de[1], para[1], u)},${lerp(de[2], para[2], u)},${ALFA})` };
});

function BrilhoSolar({ largura, altura }: { largura: number; altura: number }) {
  const p = useSharedValue(0);
  // Respiração lenta: ciclo de 6 s (3 s para ir, 3 s para voltar).
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const respira = useAnimatedStyle(() => ({ opacity: 0.88 + 0.12 * p.value, transform: [{ scale: 1 + 0.06 * p.value }] }));
  const alto = altura * 0.55;
  return (
    <View pointerEvents="none" style={[st.brilho, { height: alto }]}>
      <Animated.View style={[StyleSheet.absoluteFill, respira]}>
        {CAMADAS.map((l, i) => {
          const d = l.f * largura;
          return <View key={i} style={{ position: "absolute", width: d, height: d, borderRadius: d / 2, backgroundColor: l.cor, left: (largura - d) / 2, top: alto * 0.2 - d / 2 }} />;
        })}
      </Animated.View>
      {/* Dissolve o brilho no fundo antes do bloco de texto */}
      <LinearGradient colors={["rgba(15,21,28,0)", FUNDO]} style={[st.dissolve, { height: alto * 0.55 }]} />
    </View>
  );
}

export function Splash({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  // Cada bloco sobe 18 px com fade, 70 ms depois do anterior, com a mola do onboarding.
  const entra = (i: number) =>
    FadeInDown.delay(i * 70).withInitialValues({ opacity: 0, transform: [{ translateY: 18 }] }).springify().stiffness(MOLA.stiffness).damping(MOLA.damping);

  return (
    <SafeAreaView style={st.fundo} edges={["top", "bottom", "left", "right"]}>
      <StatusBar style="light" />
      <BrilhoSolar largura={width} altura={height} />

      <View style={st.bloco}>
        <Animated.View entering={entra(0)} style={st.marca} accessibilityRole="image" accessibilityLabel="Solis">
          <View style={st.selo}><Text style={{ ...tipo.marca(16), color: FUNDO }}>S</Text></View>
          <Text style={{ fontFamily: FAMILIA.jakarta.semibold, fontSize: 18, letterSpacing: 18 * -0.03, color: "#FFFFFF" }}>Solis</Text>
        </Animated.View>

        <Animated.View entering={entra(1)} style={{ marginTop: 22 }} accessibilityRole="header">
          <Text style={{ ...tipo.display(34), color: "#FFFFFF" }}>Controle seu dinheiro,</Text>
          <Text style={{ ...tipo.display(34), color: AMBAR }}>construa seu futuro.</Text>
        </Animated.View>

        <Animated.View entering={entra(2)} style={{ marginTop: 14 }}>
          <Text style={{ ...tipo.corpo(15), color: SUAVE }}>
            Organize contas, metas e investimentos em um só lugar, com privacidade total no seu celular.
          </Text>
        </Animated.View>

        <Animated.View entering={entra(3)} style={{ marginTop: 28 }}>
          <BotaoCTA texto="Começar" onPress={() => navigation.navigate("Acesso")} />
        </Animated.View>

        <Animated.View entering={entra(4)} style={st.acesso}>
          <Text style={{ ...tipo.corpo(14), color: SUAVE }}>
            Já tem acesso?{" "}
            <Text onPress={() => navigation.navigate("Acesso", { entrar: true })} accessibilityRole="button"
              style={{ fontFamily: FAMILIA.inter.semibold, color: AMBAR }}>Entrar</Text>
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: FUNDO },
  brilho: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  dissolve: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bloco: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 28, paddingBottom: 16 },
  marca: { flexDirection: "row", alignItems: "center", gap: 10 },
  selo: { width: 28, height: 28, borderRadius: 9, backgroundColor: AMBAR, alignItems: "center", justifyContent: "center" },
  acesso: { marginTop: 16, alignItems: "center" },
});

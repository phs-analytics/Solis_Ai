import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Texto as Text } from "../components/Texto";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { Directions, GestureDetector, useFlingGesture, useSimultaneousGestures } from "react-native-gesture-handler";
import { BentoCard, BotaoCTA, BotaoTopo, BrilhoAmbiente, MOLA, RegraCard, SegmentedProgressBar, c } from "./componentes";
import { HeroCardStage } from "./HeroCardStage";
import { NOTA_REGRAS, PASSOS, REGRAS } from "./onboardingConfig";
import { TextoAnimado } from "../components/Texto";

const ATRASO_SIMULACAO = 600;

/** Tour de apresentação (5 passos). Chama `aoTerminar` no fim, no "Pular" ou no "X". */
export function OnboardingContainer({ aoTerminar }: { aoTerminar: () => void }) {
  const { width, height } = useWindowDimensions();
  const [passo, setPasso] = useState(0);
  const [simulou, setSimulou] = useState(false);
  const total = PASSOS.length;
  const p = PASSOS[passo]!;

  // A simulação recomeça toda vez que a pessoa entra no passo (inclusive voltando).
  useEffect(() => {
    setSimulou(false);
    if (!p.simula) return;
    const t = setTimeout(() => setSimulou(true), ATRASO_SIMULACAO);
    return () => clearTimeout(t);
  }, [passo]);

  const ir = (n: number) => { if (n >= 0 && n < total) setPasso(n); };
  const avancar = () => (passo === total - 1 ? aoTerminar() : ir(passo + 1));

  const esquerda = useFlingGesture({ direction: Directions.LEFT, runOnJS: true, onActivate: avancar });
  const direita = useFlingGesture({ direction: Directions.RIGHT, runOnJS: true, onActivate: () => ir(passo - 1) });
  const gestos = useSimultaneousGestures(esquerda, direita);

  const W = width - 40;
  const H = Math.round(height * 0.38);

  return (
    <GestureDetector gesture={gestos}>
      <View style={st.tela}>
        <BrilhoAmbiente />
        <View style={st.topo}>
          <BotaoTopo voltar={passo > 0} onPress={() => (passo > 0 ? ir(passo - 1) : aoTerminar())} />
          <SegmentedProgressBar total={total} atual={passo} />
          <Pressable onPress={aoTerminar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Pular apresentação"
            style={{ minWidth: 36, alignItems: "flex-end", opacity: passo === total - 1 ? 0 : 1 }} disabled={passo === total - 1}>
            <Text style={{ color: c.textoSuave, fontSize: 14, fontWeight: "600" }}>Pular</Text>
          </Pressable>
        </View>

        <View style={{ height: H, marginHorizontal: 20 }}>
          <HeroCardStage passo={passo} simulou={simulou} W={W} H={H} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={st.narrativa} showsVerticalScrollIndicator={false}>
          <Animated.View key={passo} entering={FadeInDown.springify().stiffness(MOLA.stiffness).damping(MOLA.damping)} exiting={FadeOut.duration(120)}>
            <Text style={st.kicker}>{p.kicker.toUpperCase()}</Text>
            <Text style={st.titulo} accessibilityRole="header">{p.titulo}</Text>
            {!!p.texto && <Text style={st.texto}>{p.texto}</Text>}
          </Animated.View>

          {p.bentos && (
            <View key={`b${passo}`} style={st.bentos}>
              {p.bentos.map((b, i) => (
                <BentoCard key={b.rotulo} rotulo={b.rotulo}
                  centavos={simulou && b.depois !== undefined ? b.depois : b.antes}
                  pilula={simulou ? b.pilula ?? null : null} />
              ))}
            </View>
          )}
          {p.legenda && (!p.simula || simulou) && (
            <TextoAnimado key={`l${passo}`} entering={FadeIn.delay(p.simula ? 450 : 200).duration(300)} style={st.legenda}>{p.legenda}</TextoAnimado>
          )}

          {passo === total - 1 && (
            <View style={{ gap: 8, marginTop: 14 }}>
              {REGRAS.map((r, i) => <RegraCard key={r.titulo} {...r} indice={i} />)}
              <TextoAnimado entering={FadeIn.delay(650)} style={[st.legenda, { marginTop: 6 }]}>{NOTA_REGRAS}</TextoAnimado>
            </View>
          )}
        </ScrollView>

        <View style={st.rodape}>
          <BotaoCTA texto={p.cta} onPress={avancar} />
        </View>
      </View>
    </GestureDetector>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: c.fundo },
  topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  narrativa: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  kicker: { color: c.primario, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  titulo: { color: c.texto, fontSize: 28, fontWeight: "800", letterSpacing: -0.6, lineHeight: 34, marginTop: 6 },
  texto: { color: c.textoSuave, fontSize: 15, lineHeight: 22, marginTop: 8 },
  bentos: { flexDirection: "row", gap: 10, marginTop: 18 },
  legenda: { color: c.textoSuave, fontSize: 13, lineHeight: 19, marginTop: 12 },
  rodape: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
});

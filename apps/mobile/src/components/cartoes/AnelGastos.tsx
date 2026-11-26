import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming, type SharedValue } from "react-native-reanimated";
import { auxiliares, tipo } from "../../theme";
import { formatarDinheiro } from "../../utils/dinheiro";
import { Texto as Text } from "../Texto";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R = 44, C = 2 * Math.PI * R;
export type Fatia = { chave: string; nome: string; cor: string; valor: number };

function Segmento({ f, inicio, len, p, j, apagado }: { f: Fatia; inicio: number; len: number; p: SharedValue<number>; j: number; apagado: boolean }) {
  // cada fatia cresce em sequência (j) conforme p vai de 0 a 1
  const props = useAnimatedProps(() => {
    const t = Math.min(1, Math.max(0, p.value * (1 + j * 0.25) - j * 0.25));
    return { strokeDasharray: [len * t, C] };
  });
  return <AnimatedCircle animatedProps={props} r={R} cx={60} cy={60} fill="none" stroke={f.cor} strokeWidth={13} strokeDashoffset={-inicio} opacity={apagado ? 0.2 : 1} />;
}

/** Anel de gastos por categoria (verso do cartão). Toque numa categoria da legenda para destacá-la. */
export function AnelGastos({ fatias, total, oculto, ativo, reduzir }: { fatias: Fatia[]; total: number; oculto: boolean; ativo: boolean; reduzir: boolean }) {
  const p = useSharedValue(0);
  const [foco, setFoco] = useState<string | null>(null);
  useEffect(() => {
    p.value = ativo ? (reduzir ? 1 : withDelay(240, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }))) : 0;
    if (!ativo) setFoco(null);
  }, [ativo, reduzir]);

  if (!fatias.length || total <= 0) {
    return <View style={s.vazio}><Text style={{ ...tipo.valor(16), color: auxiliares.branco }}>Nenhum gasto</Text>
      <Text style={{ ...tipo.corpo(12), color: "rgba(255,255,255,0.75)", textAlign: "center" }}>Este cartão não teve compras nos últimos 30 dias.</Text></View>;
  }
  const gap = fatias.length > 1 ? 3 : 0;
  let acc = 0;
  const segs = fatias.map((f, j) => { const inicio = acc; acc += (f.valor / total) * C; return { f, inicio, len: Math.max(1, (f.valor / total) * C - gap), j }; });
  const sel = fatias.find((f) => f.chave === foco);
  return (
    <View style={s.linha}>
      <View style={s.anel} accessible accessibilityLabel={`Gastos de 30 dias: ${oculto ? "valor oculto" : formatarDinheiro(total)}`}>
        <Svg width={116} height={116} viewBox="0 0 120 120">
          <Circle r={R} cx={60} cy={60} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={13} />
          <G rotation={-90} origin="60, 60">
            {segs.map((x) => <Segmento key={x.f.chave} {...x} p={p} apagado={!!foco && foco !== x.f.chave} />)}
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFill, s.centro]}>
          <Text style={{ ...tipo.corpo(10, "medium"), color: "rgba(255,255,255,0.72)" }} numberOfLines={1}>{sel ? sel.nome : "30 dias"}</Text>
          <Text style={{ ...tipo.valor(12.5), color: auxiliares.branco }} numberOfLines={1}>{oculto ? "•••" : formatarDinheiro(sel ? sel.valor : total)}</Text>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text style={{ ...tipo.corpo(11, "medium"), color: "rgba(255,255,255,0.72)", marginBottom: 3 }}>Onde você mais gasta</Text>
        {fatias.slice(0, 4).map((f) => (
          <Pressable key={f.chave} onPress={() => setFoco((x) => (x === f.chave ? null : f.chave))} accessibilityRole="button"
            accessibilityState={{ selected: foco === f.chave }} accessibilityLabel={`${f.nome}, ${Math.round((f.valor / total) * 100)} por cento`}
            style={[s.leg, foco === f.chave && { backgroundColor: "rgba(255,255,255,0.14)" }]}>
            <View style={[s.bola, { backgroundColor: f.cor }]} />
            <Text style={{ ...tipo.corpo(12, "medium"), color: auxiliares.branco, flex: 1 }} numberOfLines={1}>{f.nome}</Text>
            <Text style={{ ...tipo.corpo(12, "semibold"), color: auxiliares.branco }}>{Math.round((f.valor / total) * 100)}%</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  anel: { width: 116, height: 116 },
  centro: { alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  leg: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 4, paddingHorizontal: 6, marginHorizontal: -6, borderRadius: 8 },
  bola: { width: 8, height: 8, borderRadius: 4 },
  vazio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 12 },
});

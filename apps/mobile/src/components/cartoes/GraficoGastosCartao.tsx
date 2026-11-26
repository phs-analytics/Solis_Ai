import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { auxiliares, tipo, useTema } from "../../theme";
import { formatarDinheiro } from "../../utils/dinheiro";
import { Texto as Text } from "../Texto";

export type PontoGrafico = { rotulo: string; valor: number };
const ALTURA = 130;

/** Curva suave (Catmull-Rom → Bézier); os pontos de controle ficam dentro da área para a linha não passar do chão. */
export function curvaSuave(P: [number, number][], min: number, max: number): string {
  const y = (v: number) => Math.min(max, Math.max(min, v));
  let d = `M${P[0]![0]},${P[0]![1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] ?? P[i]!, p1 = P[i]!, p2 = P[i + 1]!, p3 = P[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${y(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${y(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Gráfico de linha no estilo "Statistics": linha fina sem área, ponto vazado, guia tracejada e etiqueta do valor. Arraste para ver cada ponto. */
export function GraficoGastosCartao({ pontos, largura, oculto, rotulo }: { pontos: PontoGrafico[]; largura: number; oculto: boolean; rotulo: string }) {
  const c = useTema().cores;
  const [ativo, setAtivo] = useState(pontos.length - 1);
  useEffect(() => setAtivo(pontos.length - 1), [pontos]);
  const P = useMemo(() => {
    const mx = Math.max(1, ...pontos.map((p) => p.valor));
    return pontos.map((p, j): [number, number] => [8 + (j * (largura - 16)) / Math.max(1, pontos.length - 1), 10 + (1 - p.valor / mx) * (ALTURA - 20)]);
  }, [pontos, largura]);
  if (!largura || pontos.length < 2) return <View style={{ height: ALTURA }} />;
  const escolher = (x: number) => {
    let b = 0; P.forEach((p, j) => { if (Math.abs(p[0] - x) < Math.abs(P[b]![0] - x)) b = j; });
    if (b !== ativo) setAtivo(b);
  };
  const [px, py] = P[Math.min(ativo, P.length - 1)]!;
  const pt = pontos[Math.min(ativo, pontos.length - 1)]!;
  const LT = 96;
  return (
    <View>
      <View style={{ height: ALTURA }} accessible accessibilityRole="adjustable" accessibilityLabel={`${rotulo}. ${pt.rotulo}: ${oculto ? "valor oculto" : formatarDinheiro(pt.valor)}`}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => setAtivo((a) => Math.max(0, Math.min(pontos.length - 1, a + (e.nativeEvent.actionName === "increment" ? 1 : -1))))}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => true}
        onResponderGrant={(e) => escolher(e.nativeEvent.locationX)} onResponderMove={(e) => escolher(e.nativeEvent.locationX)}>
        <Animated.View key={rotulo} entering={FadeIn.duration(450)}>
          <Svg width={largura} height={ALTURA}>
            <Path d={curvaSuave(P, 4, ALTURA - 4)} stroke={c.texto} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            <Line x1={px} x2={px} y1={py + 8} y2={ALTURA} stroke={c.texto} strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="4 4" />
            <Circle cx={px} cy={py} r={7} fill={c.superficie} stroke={c.texto} strokeWidth={2.6} />
          </Svg>
        </Animated.View>
        <View pointerEvents="none" style={[s.tip, { left: Math.min(largura - LT, Math.max(0, px - LT / 2)), top: Math.max(-30, py - 40), width: LT, backgroundColor: c.superficie, borderColor: c.borda }]}>
          <Text style={{ ...tipo.corpo(11.5, "semibold"), color: c.texto, textAlign: "center" }} numberOfLines={1}>{oculto ? "R$ •••" : formatarDinheiro(pt.valor)}</Text>
        </View>
      </View>
      <View style={s.eixo}>
        {pontos.map((p, j) => (
          <Text key={j} style={{ ...tipo.corpo(10.5, j === ativo ? "semibold" : "regular"), color: j === ativo ? c.texto : c.textoSuave }}>
            {pontos.length > 7 && j % 2 && j !== ativo ? "" : p.rotulo}
          </Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tip: { position: "absolute", paddingVertical: 4, borderRadius: 8, borderWidth: 1, elevation: 3, shadowColor: auxiliares.preto, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  eixo: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
});

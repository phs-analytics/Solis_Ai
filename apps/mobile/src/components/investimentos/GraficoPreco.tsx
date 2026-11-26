import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { auxiliares, tipo, useTema } from "../../theme";
import { Texto as Text } from "../Texto";
import { curvaSuave } from "../cartoes/GraficoGastosCartao";

export type PontoPreco = { data: string; preco: number }; // AAAA-MM-DD, reais

const ALTURA = 150;
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Mesmo padrão do gráfico do cartão: curva suave, guia tracejada e etiqueta. Arraste para ver o preço e o dia. */
export function GraficoPreco({ pontos, largura, cor, oculto }: { pontos: PontoPreco[]; largura: number; cor: string; oculto: boolean }) {
  const c = useTema().cores;
  const [ativo, setAtivo] = useState(pontos.length - 1);
  useEffect(() => setAtivo(pontos.length - 1), [pontos]);
  const P = useMemo(() => {
    const vs = pontos.map((p) => p.preco), mn = Math.min(...vs), mx = Math.max(...vs), d = mx - mn || 1;
    return pontos.map((p, j): [number, number] => [8 + (j * (largura - 16)) / Math.max(1, pontos.length - 1), 14 + (1 - (p.preco - mn) / d) * (ALTURA - 28)]);
  }, [pontos, largura]);
  if (!largura || pontos.length < 2) return <View style={{ height: ALTURA }} />;
  const escolher = (x: number) => {
    let b = 0; P.forEach((p, j) => { if (Math.abs(p[0] - x) < Math.abs(P[b]![0] - x)) b = j; });
    if (b !== ativo) setAtivo(b);
  };
  const i = Math.min(ativo, P.length - 1), [px, py] = P[i]!, pt = pontos[i]!;
  const linha = curvaSuave(P, 4, ALTURA - 4);
  const LT = 104;
  const quando = i === pontos.length - 1 ? "hoje" : new Date(pt.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const marcas = [0, 1, 2, 3].map((k) => pontos[Math.round((k * (pontos.length - 1)) / 3)]!.data);
  return (
    <View>
      <View style={{ height: ALTURA }} accessible accessibilityRole="adjustable"
        accessibilityLabel={`Preço em ${quando}: ${oculto ? "valor oculto" : reais(pt.preco)}`}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => setAtivo((a) => Math.max(0, Math.min(pontos.length - 1, a + (e.nativeEvent.actionName === "increment" ? 1 : -1))))}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => escolher(e.nativeEvent.locationX)} onResponderMove={(e) => escolher(e.nativeEvent.locationX)}>
        <Animated.View entering={FadeIn.duration(450)}>
          <Svg width={largura} height={ALTURA}>
            <Defs>
              <LinearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={cor} stopOpacity={0.3} />
                <Stop offset="1" stopColor={cor} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={`${linha} L${P[P.length - 1]![0]},${ALTURA} L${P[0]![0]},${ALTURA} Z`} fill="url(#gp)" />
            <Path d={linha} stroke={cor} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            <Line x1={px} x2={px} y1={py + 7} y2={ALTURA} stroke={c.texto} strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="4 4" />
            <Circle cx={px} cy={py} r={6} fill={c.superficie} stroke={cor} strokeWidth={2.6} />
          </Svg>
        </Animated.View>
        <View pointerEvents="none" style={[s.tip, { left: Math.min(largura - LT, Math.max(0, px - LT / 2)), top: Math.max(-34, py - 48), width: LT, backgroundColor: c.superficie, borderColor: c.borda }]}>
          <Text style={{ ...tipo.corpo(11.5, "semibold"), color: c.texto, textAlign: "center", lineHeight: 15 }} numberOfLines={1}>{oculto ? "R$ •••" : reais(pt.preco)}</Text>
          <Text style={{ ...tipo.corpo(10), color: c.textoSuave, textAlign: "center", lineHeight: 13 }} numberOfLines={1}>{quando}</Text>
        </View>
      </View>
      <View style={s.eixo}>
        {marcas.map((d, k) => <Text key={k} style={{ ...tipo.corpo(11), color: c.textoSuave }}>{diaMes(d)}</Text>)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tip: { position: "absolute", paddingVertical: 4, borderRadius: 8, borderWidth: 1, elevation: 3, shadowColor: auxiliares.preto, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  eixo: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingHorizontal: 4 },
});

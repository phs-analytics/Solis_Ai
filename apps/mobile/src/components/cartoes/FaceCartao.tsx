import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { auxiliares, cartaoFisico, tipo } from "../../theme";
import { formatarDinheiro } from "../../utils/dinheiro";
import { Texto as Text } from "../Texto";

export const PROPORCAO_CARTAO = 188 / 300;
const OCULTO = "R$ •••••";

/** Mistura duas cores hex (t = 0 → a, t = 1 → b). */
export function misturar(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, "0")).join("");
}

/** Face "cartão físico": fosca, escura na cor do banco, fatura em destaque com centavos menores. */
export function FaceCartao({ nome, cor, faturaCentavos, oculto, titular, diaFechamento, largura, soTopo, style }: {
  nome: string; cor: string; faturaCentavos: number; oculto: boolean; titular: string; diaFechamento: number;
  largura: number; soTopo?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const valor = formatarDinheiro(faturaCentavos), v = valor.lastIndexOf(",");
  const branco = (o: number) => `rgba(255,255,255,${o})`;
  return (
    <View style={[s.cartao, { width: largura, height: largura * PROPORCAO_CARTAO, shadowColor: cor }, style]}>
      <LinearGradient colors={[misturar(cor, cartaoFisico.fundo, 0.38), misturar(cor, cartaoFisico.fundoFim, 0.78)]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[branco(0.16), branco(0)]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.6 }} style={StyleSheet.absoluteFill} />
      <View style={s.topo}>
        <Text style={{ ...tipo.corpo(12, "medium"), color: branco(0.78), flexShrink: 1 }} numberOfLines={1}>
          <Text style={{ ...tipo.valor(14), color: auxiliares.branco }}>{nome}</Text> · Cartão físico
        </Text>
        <View style={s.semContato}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={auxiliares.branco} strokeWidth={1.8} strokeLinecap="round">
            <Path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" />
          </Svg>
        </View>
      </View>
      {/* dentro da carteira só o topo aparece; o resto vazaria acima da curva do bolso */}
      {!soTopo && <>
      <Text style={{ ...tipo.corpo(11.5, "medium"), color: branco(0.72), marginTop: 10 }}>Fatura atual</Text>
      <Text style={{ ...tipo.valor(27), color: auxiliares.branco }} numberOfLines={1}>
        {oculto ? OCULTO : valor.slice(0, v)}
        {!oculto && <Text style={{ ...tipo.valor(15, false), color: branco(0.62) }}>{valor.slice(v)}</Text>}
      </Text>
      <Text style={{ ...tipo.corpo(12, "medium"), color: branco(0.8), letterSpacing: 1.4 }}>•••• •••• •••• ••••</Text>
      <View style={s.pe}>
        <View><Text style={{ ...tipo.corpo(10, "medium"), color: branco(0.6) }}>Titular</Text><Text style={{ ...tipo.corpo(13, "semibold"), color: auxiliares.branco }} numberOfLines={1}>{titular}</Text></View>
        <View><Text style={{ ...tipo.corpo(10, "medium"), color: branco(0.6) }}>Fecha dia</Text><Text style={{ ...tipo.corpo(13, "semibold"), color: auxiliares.branco }}>{diaFechamento}</Text></View>
        <View style={s.logo}>
          <View style={[s.circ, { backgroundColor: branco(0.88) }]} />
          <View style={[s.circ, { marginLeft: -9, backgroundColor: misturar(cor, auxiliares.branco, 0.45), opacity: 0.9 }]} />
        </View>
      </View>
      </>}
    </View>
  );
}

const s = StyleSheet.create({
  cartao: { borderRadius: 20, overflow: "hidden", paddingHorizontal: 18, paddingTop: 13, paddingBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 8 },
  topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  semContato: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  pe: { marginTop: "auto", flexDirection: "row", alignItems: "flex-end", gap: 22 },
  logo: { marginLeft: "auto", flexDirection: "row" },
  circ: { width: 22, height: 22, borderRadius: 11 },
});

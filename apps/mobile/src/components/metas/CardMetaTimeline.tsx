import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { auxiliares, corBanco, tipo, useTema } from "../../theme";
import { formatarDinheiro } from "../../utils/dinheiro";
import { Texto as Text } from "../Texto";
import type { Meta } from "@solis/dados";
import { Icone } from "../Icone";
import { iconeMeta } from "./iconesMeta";

function MiniGrafico({ pontos, cor, largura = 80 }: { pontos: number[]; cor: string; largura?: number }) {
  if (pontos.length < 2) return <View style={{ width: largura, height: 40 }} />;
  const max = Math.max(1, ...pontos);
  const H = 36, W = largura;
  const coords = pontos.map((v, i): [number, number] => [
    (i / (pontos.length - 1)) * (W - 8) + 4,
    4 + (1 - v / max) * (H - 8),
  ]);
  const pts = coords.map((p) => p.join(",")).join(" ");
  return (
    <Svg width={W} height={H}>
      <Polyline points={pts} fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 3.5 : 2} fill={i === coords.length - 1 ? cor : "transparent"} stroke={cor} strokeWidth={1.5} />
      ))}
    </Svg>
  );
}

export function CardMetaTimeline({
  meta, historicoMensal, oculto, onPress,
}: {
  meta: Meta;
  historicoMensal: number[];
  oculto: boolean;
  onPress: () => void;
}) {
  const c = useTema().cores;
  const cor = meta.cor ?? corBanco(meta.bancNome ?? meta.nome);
  const pct = meta.alvoCentavos > 0 ? Math.min(1, meta.atualCentavos / meta.alvoCentavos) : 0;
  const pctStr = `${Math.round(pct * 100)}%`;
  const falta = meta.alvoCentavos - meta.atualCentavos;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Meta ${meta.nome}, ${pctStr} concluído`}
      style={[s.card, { backgroundColor: c.superficie }]}>
      {/* Cabeçalho */}
      <View style={s.cabecalho}>
        <View style={[s.iconeWrap, { backgroundColor: `${cor}26` }]}>
          <Icone nome={iconeMeta(meta.icone)} tamanho={18} cor={cor} />
        </View>
        <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
          <Text style={{ ...tipo.corpo(14, "semibold"), color: c.texto }} numberOfLines={1}>{meta.nome}</Text>
          {meta.bancNome && (
            <View style={[s.badge, { backgroundColor: `${cor}22` }]}>
              <Text style={{ ...tipo.corpo(10, "semibold"), color: cor }}>{meta.bancNome}</Text>
            </View>
          )}
        </View>
        <Text style={{ ...tipo.corpo(11), color: c.textoSuave, marginRight: 4 }}>›</Text>
      </View>

      {/* Corpo: progresso + mini gráfico */}
      <View style={s.corpo}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...tipo.valor(28), color: cor }}>{pctStr}</Text>
          <Text style={{ ...tipo.corpo(11), color: c.textoSuave }}>
            {oculto ? "R$ •••" : formatarDinheiro(meta.atualCentavos)} de {oculto ? "R$ •••" : formatarDinheiro(meta.alvoCentavos)}
          </Text>
          {!meta.concluida && falta > 0 && (
            <Text style={{ ...tipo.corpo(11), color: c.textoSuave, marginTop: 2 }}>
              Faltam {oculto ? "R$ •••" : formatarDinheiro(falta)}
            </Text>
          )}
        </View>
        <MiniGrafico pontos={historicoMensal} cor={cor} />
      </View>

      {/* Barra de progresso */}
      <View style={[s.barraFundo, { backgroundColor: `${cor}22` }]}>
        <View style={[s.barraPreench, { backgroundColor: cor, width: `${Math.round(pct * 100)}%` as `${number}%` }]} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 10, elevation: 1, shadowColor: auxiliares.preto, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cabecalho: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconeWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  corpo: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 },
  barraFundo: { height: 5, borderRadius: 3, overflow: "hidden" },
  barraPreench: { height: 5, borderRadius: 3 },
});

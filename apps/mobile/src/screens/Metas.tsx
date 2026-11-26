import React, { useCallback, useEffect, useReducer, useState } from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming, Easing, FadeInDown } from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";
import { SafeScreen } from "../components/SafeScreen";
import { Texto as Text } from "../components/Texto";
import { useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";
import { listarMetas, historicoMensal } from "@solis/dados";
import type { Meta } from "@solis/dados";
import { lerPrivacidade } from "@solis/dados";
import { CardMetaTimeline } from "../components/metas/CardMetaTimeline";
import { DetalheMeta } from "../components/metas/DetalheMeta";
import { NovaMetaModal } from "../components/metas/NovaMetaModal";
import { tipo } from "../theme";
import { Icone } from "../components/Icone";
import { auxiliares } from "../theme";

// ── Calendário semanal ────────────────────────────────────────────────────────

const DIAS_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function semanaAtual(): Date[] {
  const hoje = new Date();
  const dow = hoje.getDay(); // 0=dom
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - dow + i);
    return d;
  });
}

function CalendarioSemanal() {
  const c = useTema().cores;
  const hoje = new Date();
  const dias = semanaAtual();
  return (
    <View style={cs.cal}>
      {dias.map((d, i) => {
        const ehHoje = d.toDateString() === hoje.toDateString();
        return (
          <View key={i} style={cs.diaCol}>
            <Text style={{ ...tipo.corpo(11), color: ehHoje ? c.primario : c.textoSuave }}>{DIAS_ABREV[d.getDay()]}</Text>
            <View style={[cs.diaNum, ehHoje && { backgroundColor: c.primario }]}>
              <Text style={{ ...tipo.valor(14), color: ehHoje ? (c.sobrePrimario ?? auxiliares.branco) : c.texto }}>{d.getDate()}</Text>
            </View>
            {ehHoje && <View style={[cs.tracoHoje, { backgroundColor: c.primario }]} />}
          </View>
        );
      })}
    </View>
  );
}

// ── Anel resumo ───────────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R_RESUMO = 36, CIRC_RESUMO = 2 * Math.PI * R_RESUMO;

function AnelResumo({ pct, cor }: { pct: number; cor: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(300, withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [pct]);
  const animProps = useAnimatedProps(() => ({
    strokeDasharray: [CIRC_RESUMO * Math.min(1, p.value), CIRC_RESUMO],
  }));
  return (
    <Svg width={90} height={90} viewBox="0 0 80 80">
      <Circle r={R_RESUMO} cx={40} cy={40} fill="none" stroke={`${cor}22`} strokeWidth={9} />
      <G rotation={-90} origin="40,40">
        <AnimatedCircle animatedProps={animProps} r={R_RESUMO} cx={40} cy={40} fill="none" stroke={cor} strokeWidth={9} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export function Metas() {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();
  const [, forceRender] = useReducer((x) => x + 1, 0);

  const [metas, setMetas] = useState<Meta[]>([]);
  const [historicos, setHistoricos] = useState<Record<string, number[]>>({});
  const [oculto, setOculto] = useState(false);
  const [metaAberta, setMetaAberta] = useState<string | null>(null);
  const [modalNova, setModalNova] = useState(false);

  const hoje = new Date();
  const dataFormatada = `${DIAS_ABREV[hoje.getDay()]}, ${hoje.getDate()} ${MESES[hoje.getMonth()]}`;

  const carregar = useCallback(async () => {
    const priv = await lerPrivacidade();
    setOculto(priv);
    const lista = await listarMetas(banco, true);
    setMetas(lista);
    const hists: Record<string, number[]> = {};
    await Promise.all(
      lista.map(async (m) => {
        const hist = await historicoMensal(banco, m.id);
        hists[m.id] = hist.map((h) => h.total);
      })
    );
    setHistoricos(hists);
  }, [banco]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const ativas = metas.filter((m) => !m.concluida);
  const concluidas = metas.filter((m) => m.concluida);
  const totalPct = metas.length > 0
    ? metas.reduce((acc, m) => acc + (m.alvoCentavos > 0 ? Math.min(1, m.atualCentavos / m.alvoCentavos) : 0), 0) / metas.length
    : 0;

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho */}
        <Animated.View entering={FadeInDown.duration(400)} style={[s.cabecalho, { paddingHorizontal: 20 }]}>
          <View>
            <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>{dataFormatada}</Text>
            <Text style={{ ...tipo.corpo(22, "semibold"), color: c.texto }}>Metas e Cofrinhos</Text>
          </View>
          <Pressable onPress={() => setModalNova(true)} style={[s.btnMais, { backgroundColor: c.primario }]}
            accessibilityRole="button" accessibilityLabel="Nova meta">
            <Text style={{ color: c.sobrePrimario ?? auxiliares.branco, fontSize: 22, lineHeight: 26 }}>+</Text>
          </Pressable>
        </Animated.View>

        {/* Calendário */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <CalendarioSemanal />
        </Animated.View>

        {/* Card Resumo */}
        {metas.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={[s.cardResumo, { backgroundColor: c.superficie, marginHorizontal: 20 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...tipo.corpo(11, "semibold"), color: c.textoSuave, letterSpacing: 0.5, textTransform: "uppercase" }}>Progresso geral</Text>
              <Text style={{ ...tipo.valor(28), color: c.texto, marginTop: 4 }}>
                {concluidas.length}/{metas.length} <Text style={{ ...tipo.corpo(14), color: c.textoSuave }}>Concluída{metas.length !== 1 ? "s" : ""}</Text>
              </Text>
              <Text style={{ ...tipo.corpo(12), color: c.textoSuave, marginTop: 6 }}>
                {totalPct >= 0.8 ? "Quase lá! Continue assim!" : totalPct >= 0.4 ? "Bom ritmo, continue guardando!" : "Continue guardando aos poucos!"}
              </Text>
            </View>
            <View style={s.anelResWrap}>
              <AnelResumo pct={totalPct} cor={c.primario} />
              <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ ...tipo.valor(18), color: c.texto }}>{Math.round(totalPct * 100)}%</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Lista de metas ativas */}
        {ativas.length > 0 && (
          <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{ marginTop: 20, paddingHorizontal: 20 }}>
            <Text style={{ ...tipo.corpo(13, "semibold"), color: c.textoSuave, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>Seus cofrinhos</Text>
            {ativas.map((m) => (
              <CardMetaTimeline
                key={m.id}
                meta={m}
                historicoMensal={historicos[m.id] ?? [0]}
                oculto={oculto}
                onPress={() => setMetaAberta(m.id)}
              />
            ))}
          </Animated.View>
        )}

        {/* Metas concluídas */}
        {concluidas.length > 0 && (
          <Animated.View entering={FadeInDown.delay(240).duration(400)} style={{ marginTop: 8, paddingHorizontal: 20 }}>
            <Text style={{ ...tipo.corpo(13, "semibold"), color: c.textoSuave, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>Concluídas</Text>
            {concluidas.map((m) => (
              <CardMetaTimeline
                key={m.id}
                meta={m}
                historicoMensal={historicos[m.id] ?? [0]}
                oculto={oculto}
                onPress={() => setMetaAberta(m.id)}
              />
            ))}
          </Animated.View>
        )}

        {/* Estado vazio */}
        {metas.length === 0 && (
          <Animated.View entering={FadeInDown.delay(180).duration(400)} style={s.vazio}>
            <View style={[s.vazioIc, { backgroundColor: c.primarioSuave }]}><Icone nome="piggy-bank" tamanho={34} cor={c.primario} /></View>
            <Text style={{ ...tipo.corpo(16, "semibold"), color: c.texto, marginTop: 12 }}>Nenhuma meta ainda</Text>
            <Text style={{ ...tipo.corpo(13), color: c.textoSuave, textAlign: "center", marginTop: 6 }}>
              Crie seu primeiro cofrinho{"\n"}e comece a guardar dinheiro!
            </Text>
            <Pressable onPress={() => setModalNova(true)} style={[s.btnCriar, { backgroundColor: c.primario }]}
              accessibilityRole="button" accessibilityLabel="Criar primeira meta">
              <Text style={{ ...tipo.corpo(15, "semibold"), color: c.sobrePrimario ?? auxiliares.branco }}>+ Criar meta</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Modal detalhe */}
      {metaAberta && (
        <DetalheMeta
          metaId={metaAberta}
          oculto={oculto}
          visivel={!!metaAberta}
          aoFechar={() => { setMetaAberta(null); carregar(); }}
        />
      )}

      {/* Modal nova meta */}
      <NovaMetaModal
        visivel={modalNova}
        aoFechar={() => setModalNova(false)}
        aoSalvar={() => { setModalNova(false); carregar(); }}
      />
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  cabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, paddingBottom: 12 },
  btnMais: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  cardResumo: { borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", elevation: 1, shadowColor: auxiliares.preto, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  anelResWrap: { width: 90, height: 90, position: "relative" },
  vazio: { paddingTop: 60, alignItems: "center", paddingHorizontal: 32 },
  vazioIc: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  btnCriar: { marginTop: 20, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 },
});

const cs = StyleSheet.create({
  cal: { flexDirection: "row", justifyContent: "space-between" },
  diaCol: { alignItems: "center", gap: 4, flex: 1 },
  diaNum: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tracoHoje: { width: 18, height: 3, borderRadius: 2, marginTop: -2 },
});

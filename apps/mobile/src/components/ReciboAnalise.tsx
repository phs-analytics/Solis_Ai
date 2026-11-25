import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import Animated, {
  Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { reais, type AnaliseSemana } from "@solis/core";
import { auxiliares, temaClaro, useTema } from "../theme";
import { Texto as Text } from "./Texto";

const PAPEL = auxiliares.offwhite;
const TINTA = temaClaro.cores.texto;
const TINTA_SUAVE = temaClaro.cores.textoSuave;
const DENTE = 7;
const BARRAS = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 3, 1];

/** Serrilhado do papel, desenhado na cor do papel. */
function Serra({ largura, cima }: { largura: number; cima?: boolean }) {
  if (!largura) return null;
  const n = Math.ceil(largura / (DENTE * 2));
  let d = cima ? `M0 ${DENTE}` : "M0 0";
  for (let i = 0; i < n; i++) d += cima ? ` l${DENTE} -${DENTE} l${DENTE} ${DENTE}` : ` l${DENTE} ${DENTE} l${DENTE} -${DENTE}`;
  d += cima ? ` V${DENTE} Z` : " V0 Z";
  return <Svg width={largura} height={DENTE} style={{ marginTop: cima ? 0 : -0.5, marginBottom: cima ? -0.5 : 0 }}><Path d={d} fill={PAPEL} /></Svg>;
}

const Mono = ({ children, forte, suave, centro }: { children: React.ReactNode; forte?: boolean; suave?: boolean; centro?: boolean }) => (
  <Text style={{ fontFamily: "monospace", fontSize: 11.5, lineHeight: 16, color: suave ? TINTA_SUAVE : TINTA, fontWeight: forte ? "700" : "400", textAlign: centro ? "center" : "left" }}>{children}</Text>
);
const Ln = ({ e, d }: { e: string; d: string }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
    <View style={{ flex: 1 }}><Mono>{e}</Mono></View><Mono>{d}</Mono>
  </View>
);
const Traco = () => <Text numberOfLines={1} style={{ fontFamily: "monospace", fontSize: 11.5, color: TINTA_SUAVE, marginVertical: 6 }}>{"- ".repeat(40)}</Text>;
const Barra = ({ pct }: { pct: number }) => (
  <View style={{ height: 3, borderRadius: 2, backgroundColor: `${TINTA}22`, marginTop: 2, marginBottom: 6 }}><View style={{ width: `${Math.min(100, pct)}%`, height: 3, borderRadius: 2, backgroundColor: TINTA }} /></View>
);

function Conteudo({ r, oculto }: { r: AnaliseSemana; oculto: boolean }) {
  const v = (c: number) => (oculto ? "R$ ••••" : reais(c));
  const data = (iso: string) => iso.split("-").reverse().join("/");
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 }}>
      <Mono forte centro>S O L I S   A I</Mono>
      <Mono suave centro>ANÁLISE DA SEMANA</Mono>
      <Mono suave centro>{data(r.de)} a {data(r.ate)}</Mono>
      <Traco />
      <Ln e="GASTOS NA SEMANA" d={v(r.gastos)} />
      <Ln e="semana anterior" d={v(r.anterior)} />
      {r.variacaoPct !== null && <Ln e="variação" d={`${r.variacaoPct > 0 ? "+" : ""}${r.variacaoPct}%`} />}
      <Traco />
      <Mono forte>ONDE MAIS GASTOU</Mono>
      {r.topo.length ? r.topo.map((t) => <View key={t.nome}><Ln e={t.nome} d={v(t.centavos)} /><Barra pct={t.pct} /></View>) : <Mono suave>Sem gastos na semana.</Mono>}
      <Mono forte>ONDE ECONOMIZOU</Mono>
      {r.economizou ? <Ln e={r.economizou.nome} d={`−${v(r.economizou.centavos)}`} /> : <Mono suave>Nenhuma categoria caiu.</Mono>}
      {r.metas.length > 0 && <><Traco /><Mono forte>METAS</Mono>{r.metas.map((m) => <View key={m.nome}><Ln e={m.nome} d={`${m.pct}%`} /><Barra pct={m.pct} /></View>)}</>}
      <Traco />
      {r.positivos.length > 0 && <><Mono forte>PONTOS POSITIVOS</Mono>{r.positivos.map((t) => <Mono key={t}>+ {t}</Mono>)}</>}
      {r.atencao.length > 0 && <><View style={{ height: 6 }} /><Mono forte>PONTOS DE ATENÇÃO</Mono>{r.atencao.map((t) => <Mono key={t}>! {t}</Mono>)}</>}
      <View style={{ height: 6 }} /><Mono forte>SUGESTÕES</Mono>{r.sugestoes.map((t) => <Mono key={t}>{">"} {t}</Mono>)}
      <Traco />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 2, height: 34, marginTop: 6, marginBottom: 4 }}>
        {BARRAS.map((w, i) => <View key={i} style={{ width: w, backgroundColor: TINTA }} />)}
      </View>
      <Text style={{ fontSize: 10, lineHeight: 14, color: TINTA_SUAVE, textAlign: "center" }}>Informação sobre os seus dados, feita no seu celular.{"\n"}Não é recomendação de investimento.</Text>
    </View>
  );
}

export type ReciboRef = { descartar: () => void };

/** Recibo da análise: sai da impressora em trancos; ao descartar, cai como folha e avisa no fim. */
export const ReciboAnalise = forwardRef<ReciboRef, { analise: AnaliseSemana; oculto: boolean; alturaMax: number; aoImprimir: () => void; aoDescartar: () => void }>(
  function ReciboAnalise({ analise, oculto, alturaMax, aoImprimir, aoDescartar }, ref) {
    const c = useTema().cores;
    const [alto, setAlto] = useState(0);
    const [largura, setLargura] = useState(0);
    const [impresso, setImpresso] = useState(false);
    const [rasgado, setRasgado] = useState(false);
    const rolagem = useRef<ScrollViewInstance>(null);
    const feed = useSharedValue(-2000), queda = useSharedValue(0), some = useSharedValue(1);
    const balx = useSharedValue(0), rot = useSharedValue(0), rotY = useSharedValue(0), luz = useSharedValue(1), tranco = useSharedValue(0);
    const janela = Math.min(alto || alturaMax, alturaMax);

    useEffect(() => {
      luz.value = withRepeat(withSequence(withTiming(0.3, { duration: 400 }), withTiming(1, { duration: 400 })), -1);
    }, [luz]);
    useEffect(() => {
      if (!alto) return;
      // anda e para, como impressora térmica
      const passo = 44, n = Math.ceil(alto / passo), seq = [];
      feed.value = -alto;
      for (let k = 1; k <= n; k++) {
        seq.push(withTiming(-alto + Math.min(alto, k * passo), { duration: 115, easing: Easing.bezier(0.3, 0.7, 0.4, 1) }));
        seq.push(withTiming(-alto + Math.min(alto, k * passo), { duration: 55 }));
      }
      feed.value = withSequence(...seq, withTiming(0, { duration: 1 }, (fim) => { if (fim) runOnJS(terminou)(); }));
    }, [alto]); // eslint-disable-line react-hooks/exhaustive-deps

    function terminou() { setImpresso(true); luz.value = withTiming(0.5); aoImprimir(); }

    useImperativeHandle(ref, () => ({
      descartar() {
        if (rasgado) return;
        feed.value = 0;
        rolagem.current?.scrollTo({ y: 0, animated: false });
        setRasgado(true);
        tranco.value = withSequence(withTiming(2, { duration: 60 }), withTiming(0, { duration: 180 }));
        const T = 1500, d = janela + 60;
        const em = Easing.bezier(0.45, 0, 0.55, 1);
        // camada 1: um puxão curto do corte e depois a gravidade acelerando
        queda.value = withSequence(
          withTiming(12, { duration: T * 0.14, easing: Easing.bezier(0.2, 0.9, 0.3, 1) }),
          withTiming(d * 0.8, { duration: T * 0.68, easing: Easing.bezier(0.5, 0, 0.85, 0.55) }),
          withTiming(d, { duration: T * 0.18 }, (fim) => { if (fim) runOnJS(aoDescartar)(); }),
        );
        some.value = withDelay(T * 0.82, withTiming(0, { duration: T * 0.18 }));
        // camada 2: balanço de folha, preso no alto, com leve torção
        const ida = (vals: number[]) => withSequence(...vals.map((v, i) => withTiming(v, { duration: T * [0.14, 0.22, 0.22, 0.2, 0.22][i]!, easing: em })));
        balx.value = ida([0, -20, 18, -12, 6]);
        rot.value = ida([-1.2, -8, 7, -5, 3]);
        rotY.value = ida([0, 14, -12, 9, -4]);
      },
    }));

    const papel = useAnimatedStyle(() => ({ opacity: some.value, transform: [{ translateY: feed.value + queda.value }] }));
    const folha = useAnimatedStyle(() => ({
      transformOrigin: "top",
      transform: [{ perspective: 700 }, { translateX: balx.value }, { rotate: `${rot.value}deg` }, { rotateY: `${rotY.value}deg` }],
    }));
    const impressora = useAnimatedStyle(() => ({ transform: [{ translateY: tranco.value }] }));
    const led = useAnimatedStyle(() => ({ opacity: luz.value }));

    return (
      <View>
        <Animated.View style={[s.impressora, { backgroundColor: c.texto }, impressora]}>
          <View style={[s.fenda, { backgroundColor: auxiliares.preto }]} />
          <Animated.View style={[s.led, { backgroundColor: c.sucesso }, led]} />
        </Animated.View>
        <View style={[s.janela, { height: janela || undefined }]}>
          <ScrollView ref={rolagem} scrollEnabled={impresso && !rasgado} showsVerticalScrollIndicator={false}>
            <Animated.View style={papel} onLayout={(e) => { if (!alto) setAlto(e.nativeEvent.layout.height); setLargura(e.nativeEvent.layout.width); }}>
              <Animated.View style={folha}>
                {rasgado ? <Serra largura={largura} cima /> : null}
                <View style={{ backgroundColor: PAPEL }}><Conteudo r={analise} oculto={oculto} /></View>
                <Serra largura={largura} />
              </Animated.View>
            </Animated.View>
          </ScrollView>
        </View>
        {!impresso && <Text style={{ textAlign: "center", fontSize: 12, color: c.textoSuave, marginTop: 8 }}>Imprimindo…</Text>}
      </View>
    );
  });

const s = StyleSheet.create({
  impressora: { height: 34, marginHorizontal: 8, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, alignItems: "center", justifyContent: "flex-end", paddingBottom: 7, zIndex: 2 },
  fenda: { width: "80%", height: 5, borderRadius: 3, opacity: 0.75 },
  led: { position: "absolute", top: 9, right: 14, width: 6, height: 6, borderRadius: 3 },
  janela: { marginTop: -9, marginHorizontal: 16, overflow: "hidden" },
});

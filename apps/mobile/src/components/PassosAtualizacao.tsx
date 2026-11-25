import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing, FadeIn, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { tipo, useTema } from "../theme";
import { Texto as Text } from "./Texto";

export type EstadoPasso = "pend" | "run" | "done";
export type Passo = { grupo: string; rotulo: string; estado: EstadoPasso; log: string[] };

const APath = Animated.createAnimatedComponent(Path);
const LINHA = 18;

function Roda({ cor }: { cor: string }) {
  const r = useSharedValue(0);
  useEffect(() => { r.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1); return () => cancelAnimation(r); }, [r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={st}><Svg width={20} height={20} viewBox="0 0 20 20"><Circle cx={10} cy={10} r={7} stroke={cor} strokeWidth={2} strokeLinecap="round" strokeDasharray={[14, 30]} fill="none" /></Svg></Animated.View>;
}

function Check({ cor }: { cor: string }) {
  const d = useSharedValue(14);
  useEffect(() => { d.value = withDelay(50, withTiming(0, { duration: 300, easing: Easing.bezier(0.23, 1, 0.32, 1) })); }, [d]);
  const ap = useAnimatedProps(() => ({ strokeDashoffset: d.value }));
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={8} fill={`${cor}2E`} />
      <APath d="M6.5 10.3l2.3 2.3 4.7-4.9" stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={[14, 14]} animatedProps={ap} />
    </Svg>
  );
}

/** Letra por letra pulsando, como o rótulo da etapa em andamento do ai-loading. */
function Onda({ texto, cor }: { texto: string; cor: string }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{[...texto].map((ch, i) => <Letra key={i} ch={ch} i={i} cor={cor} />)}</View>;
}
function Letra({ ch, i, cor }: { ch: string; i: number; cor: string }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withDelay(i * 50, withRepeat(withSequence(withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })), -1));
    return () => cancelAnimation(o);
  }, [i, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.Text style={[{ ...tipo.corpo(14, "medium"), color: cor }, st]}>{ch}</Animated.Text>;
}

function Linha({ p, ultimo }: { p: Passo; ultimo: boolean }) {
  const c = useTema().cores;
  const altura = useSharedValue(0), feito = useSharedValue(0);
  useEffect(() => { altura.value = withTiming(p.estado === "run" ? LINHA * 3 : 0, { duration: 240, easing: Easing.bezier(0.23, 1, 0.32, 1) }); }, [p.estado, altura]);
  useEffect(() => { feito.value = withTiming(p.estado === "done" ? 1 : 0, { duration: 500, easing: Easing.bezier(0.23, 1, 0.32, 1) }); }, [p.estado, feito]);
  const janela = useAnimatedStyle(() => ({ height: altura.value }));
  const verde = useAnimatedStyle(() => ({ transform: [{ scaleY: feito.value }] }));
  const vis = p.log.slice(-3);
  return (
    <View style={s.passo}>
      {!ultimo && <View style={[s.trilho, { backgroundColor: c.borda }]}><Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.sucesso, transformOrigin: "top" }, verde]} /></View>}
      <View style={s.ic}>
        {p.estado === "done" ? <Check cor={c.sucesso} /> : p.estado === "run" ? <Roda cor={c.primario} />
          : <Svg width={20} height={20} viewBox="0 0 20 20"><Circle cx={10} cy={10} r={7} stroke={c.borda} strokeWidth={2} fill="none" /></Svg>}
      </View>
      <View style={{ flex: 1 }}>
        {p.estado === "run" ? <Onda texto={p.rotulo} cor={c.texto} /> : <Text style={{ ...tipo.corpo(14, "medium"), color: p.estado === "done" ? c.texto : c.textoSuave }}>{p.rotulo}</Text>}
        <Animated.View style={[{ overflow: "hidden", justifyContent: "flex-end" }, janela]}>
          {vis.map((t, i) => (
            <Animated.Text key={`${p.log.length - vis.length + i}`} entering={FadeIn.duration(200)} numberOfLines={1}
              style={{ fontFamily: "monospace", fontSize: 12, lineHeight: LINHA, color: c.textoSuave }}>{t}</Animated.Text>
          ))}
          <LinearGradient pointerEvents="none" colors={[c.superficie, `${c.superficie}00`]} style={[StyleSheet.absoluteFill, { bottom: LINHA * 1.5 }]} />
        </Animated.View>
      </View>
    </View>
  );
}

export function PassosAtualizacao({ titulo, sub, passos }: { titulo: string; sub: string; passos: Passo[] }) {
  const c = useTema().cores;
  const feitos = passos.filter((p) => p.estado === "done").length;
  const prog = useSharedValue(0);
  useEffect(() => { prog.value = withTiming(passos.length ? feitos / passos.length : 0, { duration: 500 }); }, [feitos, passos.length, prog]);
  const barra = useAnimatedStyle(() => ({ transform: [{ scaleX: prog.value }] }));
  const grupos = passos.reduce<{ nome: string; itens: Passo[] }[]>((acc, p) => {
    const g = acc[acc.length - 1];
    if (g && g.nome === p.grupo) g.itens.push(p); else acc.push({ nome: p.grupo, itens: [p] });
    return acc;
  }, []);
  return (
    <View>
      <Text style={{ ...tipo.display(17), color: c.texto }}>{titulo}</Text>
      <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>{sub}</Text>
      <View style={[s.barra, { backgroundColor: c.fundo }]}><Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.sucesso, transformOrigin: "left" }, barra]} /></View>
      {grupos.map((g) => (
        <View key={g.nome}>
          <Text style={{ ...tipo.corpo(11, "semibold"), color: c.textoSuave, letterSpacing: 0.6, marginTop: 12, marginBottom: 2 }}>{g.nome.toUpperCase()}</Text>
          {g.itens.map((p, i) => <Linha key={p.rotulo} p={p} ultimo={i === g.itens.length - 1} />)}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  barra: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 10 },
  passo: { flexDirection: "row", gap: 12, paddingVertical: 7 },
  ic: { width: 20, height: 20, marginTop: 0 },
  trilho: { position: "absolute", left: 9, top: 34, bottom: -7, width: 2, borderRadius: 1, overflow: "hidden" },
});

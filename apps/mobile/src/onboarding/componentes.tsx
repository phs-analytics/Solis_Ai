import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import Animated, {
  FadeInDown, ZoomIn, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from "react-native-reanimated";
import { Icone } from "../components/Icone";
import { temaEscuro } from "../theme";
import { formatarDinheiro } from "../utils/dinheiro";

export const MOLA = { stiffness: 280, damping: 26 };
export const c = temaEscuro.cores;
export const BORDA_FINA = "rgba(255,255,255,0.08)";
export const NUM: TextStyle = { fontVariant: ["tabular-nums"] };

/** Pílulas de progresso: a ativa cresce e ganha a cor de destaque. */
export function SegmentedProgressBar({ total, atual }: { total: number; atual: number }) {
  return (
    <View style={s.pilulas} accessibilityRole="progressbar" accessibilityLabel={`Passo ${atual + 1} de ${total}`}
      accessibilityValue={{ min: 1, max: total, now: atual + 1 }}>
      {Array.from({ length: total }, (_, i) => <PilulaProgresso key={i} ativa={i === atual} feita={i < atual} />)}
    </View>
  );
}

function PilulaProgresso({ ativa, feita }: { ativa: boolean; feita: boolean }) {
  const p = useSharedValue(ativa ? 1 : 0);
  useEffect(() => { p.value = withSpring(ativa ? 1 : 0, MOLA); }, [ativa]);
  const estilo = useAnimatedStyle(() => ({
    width: 6 + p.value * 18,
    backgroundColor: interpolateColor(p.value, [0, 1], [feita ? "rgba(255,177,98,0.45)" : "rgba(255,255,255,0.2)", c.primario]),
  }));
  return <Animated.View style={[s.pilula, estilo]} />;
}

/** Valor em reais que rola do número anterior até o novo, sem trepidar (algarismos de largura fixa). */
export function AnimatedNumber({ centavos, style, negativo, duracao = 700 }: {
  centavos: number; style?: StyleProp<TextStyle>; negativo?: boolean; duracao?: number;
}) {
  const [mostrado, setMostrado] = useState(centavos);
  const anterior = useRef(centavos);
  useEffect(() => {
    const de = anterior.current, para = centavos, t0 = Date.now();
    anterior.current = centavos;
    if (de === para) { setMostrado(para); return; }
    let id = 0;
    const passo = () => {
      const t = Math.min(1, (Date.now() - t0) / duracao);
      const e = 1 - Math.pow(1 - t, 3);
      setMostrado(Math.round(de + (para - de) * e));
      if (t < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [centavos]);
  return <Text style={[NUM, style]} accessibilityLabel={formatarDinheiro(negativo ? -centavos : centavos)}>{negativo ? "−" : ""}{formatarDinheiro(mostrado)}</Text>;
}

const COR_PILULA = {
  sobe: { fundo: "rgba(255,177,98,0.16)", texto: c.primario },
  desce: { fundo: "rgba(245,149,128,0.16)", texto: c.erro },
  neutro: { fundo: "rgba(255,255,255,0.08)", texto: c.textoSuave },
};

export function Pilula({ texto, tipo }: { texto: string; tipo: "sobe" | "desce" | "neutro" }) {
  const cor = COR_PILULA[tipo];
  return (
    <Animated.View entering={ZoomIn.springify().stiffness(MOLA.stiffness).damping(MOLA.damping)} style={[s.tag, { backgroundColor: cor.fundo }]}>
      <Text style={[NUM, { color: cor.texto, fontSize: 12, fontWeight: "700" }]}>{texto}</Text>
    </Animated.View>
  );
}

export function BentoCard({ rotulo, centavos, pilula }: {
  rotulo: string; centavos: number; pilula?: { texto: string; tipo: "sobe" | "desce" | "neutro" } | null;
}) {
  return (
    <View style={s.bento}>
      <Text style={s.bentoRotulo}>{rotulo}</Text>
      <AnimatedNumber centavos={centavos} style={s.bentoValor} />
      <View style={{ height: 24, marginTop: 6, alignItems: "flex-start" }}>{pilula && <Pilula {...pilula} />}</View>
    </View>
  );
}

const SETA = { sobe: "arrow-small-up", desce: "arrow-small-down", neutro: "equals" } as const;

export function RegraCard({ icone, cor, titulo, tags, indice }: {
  icone: React.ComponentProps<typeof Icone>["nome"]; cor: string; titulo: string;
  tags: { t: string; tipo: "sobe" | "desce" | "neutro" }[]; indice: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(250 + indice * 80).springify().stiffness(MOLA.stiffness).damping(MOLA.damping)} style={s.regra}>
      <View style={[s.regraIcone, { backgroundColor: cor }]}><Icone nome={icone} tamanho={16} cor="#FFFFFF" /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: c.texto, fontSize: 14, fontWeight: "700" }}>{titulo}</Text>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {tags.map((tg) => (
            <View key={tg.t} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Icone nome={SETA[tg.tipo]} tamanho={11} cor={c.textoSuave} />
              <Text style={{ color: c.textoSuave, fontSize: 12 }}>{tg.t}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

/** Botão principal com retorno de toque (encolhe 2%). */
export function BotaoCTA({ texto, onPress, desativado, carregando }: { texto: string; onPress: () => void; desativado?: boolean; carregando?: boolean }) {
  const escala = useSharedValue(1);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const ativo = !desativado && !carregando;
  return (
    <Pressable onPress={onPress} disabled={!ativo}
      onPressIn={() => { escala.value = withSpring(0.98, MOLA); }} onPressOut={() => { escala.value = withSpring(1, MOLA); }}
      accessibilityRole="button" accessibilityState={{ disabled: !ativo, busy: !!carregando }}>
      <Animated.View style={[s.cta, { backgroundColor: ativo ? c.primario : c.borda }, estilo]}>
        <Text style={{ color: ativo ? c.sobrePrimario : c.textoSuave, fontSize: 16, fontWeight: "700" }}>{carregando ? "Um momento…" : texto}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Botão redondo do topo: "X" no primeiro passo, seta de voltar nos outros (troca com fade). */
export function BotaoTopo({ voltar, onPress }: { voltar: boolean; onPress: () => void }) {
  const p = useSharedValue(voltar ? 1 : 0);
  useEffect(() => { p.value = withTiming(voltar ? 1 : 0, { duration: 180 }); }, [voltar]);
  const x = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ rotate: `${p.value * 90}deg` }] }));
  const seta = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ rotate: `${(p.value - 1) * 90}deg` }] }));
  return (
    <Pressable onPress={onPress} hitSlop={8} style={s.redondo} accessibilityRole="button" accessibilityLabel={voltar ? "Voltar" : "Fechar apresentação"}>
      <Animated.View style={[s.sobre, x]}><Icone nome="cross-small" tamanho={18} cor={c.texto} /></Animated.View>
      <Animated.View style={[s.sobre, seta]}><Icone nome="angle-small-left" tamanho={20} cor={c.texto} /></Animated.View>
    </Pressable>
  );
}

/** Brilho ambiente atrás do palco: círculos concêntricos bem transparentes imitam um gradiente radial. */
export function BrilhoAmbiente() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[340, 260, 190, 130].map((d, i) => (
        <View key={d} style={{
          position: "absolute", width: d, height: d, borderRadius: d / 2, top: 150 - d / 2, alignSelf: "center",
          backgroundColor: i % 2 ? "rgba(163,81,57,0.07)" : "rgba(255,177,98,0.05)",
        }} />
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  pilulas: { flexDirection: "row", alignItems: "center", gap: 6 },
  pilula: { height: 6, borderRadius: 3 },
  tag: { alignSelf: "flex-start", borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  bento: { flex: 1, backgroundColor: c.superficie, borderRadius: 16, borderWidth: 1, borderColor: BORDA_FINA, padding: 14 },
  bentoRotulo: { color: c.textoSuave, fontSize: 12, fontWeight: "600" },
  bentoValor: { color: c.texto, fontSize: 20, fontWeight: "800", marginTop: 4, letterSpacing: -0.3 },
  regra: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.superficie, borderRadius: 16, borderWidth: 1, borderColor: BORDA_FINA, padding: 12 },
  regraIcone: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cta: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  redondo: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  sobre: { position: "absolute" },
});

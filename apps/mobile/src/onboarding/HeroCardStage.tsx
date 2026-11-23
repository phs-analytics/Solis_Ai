import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { Icone } from "../components/Icone";
import { AnimatedNumber, BORDA_FINA, MOLA, NUM, c } from "./componentes";
import { CARDS, SOBRA, SOBRA_ROTULO, VALORES } from "./onboardingConfig";

type Pose = { x: number; y: number; r: number; s: number; o: number };
type Id = "banco" | "dinheiro" | "cartao" | "meta";

// Posição de cada card em cada passo. x e y são frações da largura/altura do palco, a partir do centro.
const ESCONDIDO = (x: number, y: number): Pose => ({ x, y, r: 0, s: 0.7, o: 0 });
const POSES: Record<Id, Pose[]> = {
  banco: [
    { x: -0.2, y: -0.2, r: -6, s: 0.9, o: 1 }, { x: -0.06, y: 0.02, r: -4, s: 1.08, o: 1 },
    { x: -0.18, y: -0.14, r: -6, s: 0.86, o: 1 }, { x: -0.2, y: -0.02, r: -5, s: 0.92, o: 1 },
    { x: -0.34, y: -0.22, r: 0, s: 0.4, o: 1 },
  ],
  dinheiro: [
    { x: -0.22, y: 0.22, r: 4, s: 0.82, o: 1 }, { x: 0.22, y: -0.2, r: 6, s: 0.82, o: 1 },
    ESCONDIDO(0.3, -0.25), ESCONDIDO(-0.3, 0.3),
    { x: -0.02, y: -0.22, r: 0, s: 0.4, o: 1 },
  ],
  cartao: [
    { x: 0.22, y: -0.24, r: 5, s: 0.82, o: 1 }, ESCONDIDO(0.3, 0.3),
    { x: 0.12, y: 0.1, r: 4, s: 1.05, o: 1 }, ESCONDIDO(0.3, 0.3),
    { x: 0.33, y: -0.22, r: 0, s: 0.4, o: 1 },
  ],
  meta: [
    { x: 0.3, y: 0.18, r: -3, s: 0.8, o: 1 }, ESCONDIDO(0.35, 0.2),
    ESCONDIDO(0.35, 0.2), { x: 0.24, y: 0.02, r: 0, s: 1.08, o: 1 },
    ESCONDIDO(0.35, -0.2),
  ],
};

function useCardPose(id: Id, passo: number, W: number, H: number) {
  const pose = POSES[id][passo]!;
  const x = useSharedValue(pose.x * W), y = useSharedValue(pose.y * H), r = useSharedValue(pose.r);
  const s = useSharedValue(pose.s), o = useSharedValue(pose.o);
  useEffect(() => {
    const p = POSES[id][passo]!;
    x.value = withSpring(p.x * W, MOLA); y.value = withSpring(p.y * H, MOLA);
    r.value = withSpring(p.r, MOLA); s.value = withSpring(p.s, MOLA);
    o.value = withTiming(p.o, { duration: 220 });
  }, [passo, W, H]);
  // Flutuação contínua bem leve, como no repouso.
  const flutua = useSharedValue(0);
  useEffect(() => {
    flutua.value = withDelay(id.length * 140, withRepeat(withSequence(
      withTiming(-4, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      withTiming(4, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
    ), -1, true));
  }, []);
  return useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [
      { translateX: x.value }, { translateY: y.value + (passo === 4 ? 0 : flutua.value) },
      { rotate: `${r.value}deg` }, { scale: s.value },
    ],
  }));
}

function CardConta({ id, valor, negativo, passo, W, H }: { id: "banco" | "dinheiro" | "cartao"; valor: number; negativo?: boolean; passo: number; W: number; H: number }) {
  const estilo = useCardPose(id, passo, W, H);
  const info = CARDS[id];
  const w = W * 0.5, h = w * 0.62;
  return (
    <Animated.View style={[st.card, { width: w, height: h, left: (W - w) / 2, top: (H - h) / 2, backgroundColor: info.cor }, estilo]}>
      <View style={[st.brilho, { backgroundColor: info.corBrilho }]} />
      <View style={st.marca}><Icone nome={info.icone} tamanho={w * 0.34} cor="rgba(255,255,255,0.10)" /></View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icone nome={info.icone} tamanho={12} cor="rgba(255,255,255,0.85)" />
        <Text style={st.cardRotulo}>{info.rotulo.toUpperCase()}</Text>
      </View>
      <View>
        <Text style={st.cardNome}>{info.nome}</Text>
        <AnimatedNumber centavos={valor} negativo={negativo} style={st.cardValor} />
      </View>
    </Animated.View>
  );
}

function PoteMeta({ pct, passo, W, H }: { pct: number; passo: number; W: number; H: number }) {
  const estilo = useCardPose("meta", passo, W, H);
  const nivel = useSharedValue(pct);
  useEffect(() => { nivel.value = withSpring(pct, MOLA); }, [pct]);
  const agua = useAnimatedStyle(() => ({ height: `${8 + nivel.value * 1.2}%` }));
  const w = W * 0.28, h = w * 1.25;
  return (
    <Animated.View style={[st.pote, { width: w, height: h, left: (W - w) / 2, top: (H - h) / 2 }, estilo]}>
      <View style={st.tampa} />
      <Animated.View style={[st.agua, agua]} />
      <View style={st.etiqueta}>
        <Icone nome={CARDS.meta.icone} tamanho={11} cor={c.sobrePrimario} />
        <Text style={{ color: c.sobrePrimario, fontSize: 10, fontWeight: "700" }}>{CARDS.meta.nome}</Text>
        <Text style={[NUM, { color: c.sobrePrimario, fontSize: 15, fontWeight: "800" }]}>{Math.round(pct)}%</Text>
      </View>
    </Animated.View>
  );
}

/** Moeda que sai do card do banco e cai no pote. */
function Moeda({ ativo, indice, de, para }: { ativo: boolean; indice: number; de: { x: number; y: number }; para: { x: number; y: number } }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    if (ativo) t.value = withDelay(indice * 160, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }));
  }, [ativo]);
  const estilo = useAnimatedStyle(() => {
    const arco = Math.sin(t.value * Math.PI) * -46;
    return {
      opacity: t.value === 0 || t.value === 1 ? 0 : 1,
      transform: [
        { translateX: de.x + (para.x - de.x) * t.value },
        { translateY: de.y + (para.y - de.y) * t.value + arco },
        { scale: 1 - t.value * 0.3 },
      ],
    };
  });
  return <Animated.View style={[st.moeda, estilo]}><Icone nome="coins" tamanho={12} cor={c.sobrePrimario} /></Animated.View>;
}

function Operador({ simbolo, x, y, visivel }: { simbolo: string; x: number; y: number; visivel: boolean }) {
  const o = useSharedValue(0);
  useEffect(() => { o.value = withDelay(visivel ? 250 : 0, withTiming(visivel ? 1 : 0, { duration: 200 })); }, [visivel]);
  const estilo = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.Text style={[st.operador, { left: x - 8, top: y - 12 }, estilo]}>{simbolo}</Animated.Text>;
}

export function HeroCardStage({ passo, simulou, W, H }: { passo: number; simulou: boolean; W: number; H: number }) {
  const cartao = VALORES.cartaoAntes + (passo > 2 || (passo === 2 && simulou) ? VALORES.compraCartao : 0);
  const pct = passo === 3 && simulou ? (VALORES.metaDeposito / VALORES.metaAlvo) * 100 : 0;
  const formula = passo === 4;
  const cx = W / 2, cy = H / 2;
  const deBanco = { x: cx - 0.2 * W, y: cy - 0.02 * H }, paraPote = { x: cx + 0.24 * W, y: cy - 0.06 * H };
  const yFormula = cy - 0.22 * H;
  if (!W) return null;
  return (
    <View style={{ width: W, height: H }}>
      {/* Selo do Solis no passo 1, com um "aceno" */}
      <Aceno visivel={passo === 0} x={cx + 0.04 * W} y={cy + 0.2 * H} />
      <PoteMeta pct={pct} passo={passo} W={W} H={H} />
      <CardConta id="dinheiro" valor={VALORES.dinheiro} passo={passo} W={W} H={H} />
      <CardConta id="banco" valor={VALORES.banco} passo={passo} W={W} H={H} />
      <CardConta id="cartao" valor={cartao} negativo passo={passo} W={W} H={H} />
      {[0, 1, 2].map((i) => <Moeda key={i} indice={i} ativo={passo === 3 && simulou} de={deBanco} para={paraPote} />)}
      <Operador simbolo="+" x={cx - 0.18 * W} y={yFormula} visivel={formula} />
      <Operador simbolo="−" x={cx + 0.155 * W} y={yFormula} visivel={formula} />
      {formula && (
        <View style={[st.total, { top: cy - 0.02 * H }]}>
          <Text style={{ color: c.textoSuave, fontSize: 13, fontWeight: "600" }}>{SOBRA_ROTULO}</Text>
          <TotalContando />
        </View>
      )}
    </View>
  );
}

function TotalContando() {
  const [v, setV] = React.useState(0);
  useEffect(() => { const t = setTimeout(() => setV(SOBRA), 350); return () => clearTimeout(t); }, []);
  return <AnimatedNumber centavos={v} duracao={900} style={{ color: c.texto, fontSize: 40, fontWeight: "800", letterSpacing: -1 }} />;
}

function Aceno({ visivel, x, y }: { visivel: boolean; x: number; y: number }) {
  const o = useSharedValue(visivel ? 1 : 0), r = useSharedValue(0);
  useEffect(() => { o.value = withTiming(visivel ? 1 : 0, { duration: 200 }); }, [visivel]);
  useEffect(() => {
    r.value = withDelay(500, withRepeat(withSequence(
      withTiming(-14, { duration: 160 }), withTiming(12, { duration: 160 }), withTiming(-8, { duration: 140 }),
      withTiming(0, { duration: 140 }), withTiming(0, { duration: 2200 }),
    ), -1));
  }, []);
  const estilo = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={[st.selo, { left: x - 32, top: y - 32 }, estilo]}>
      <View style={st.seloBrilho} />
      <Icone nome="sparkles" tamanho={28} cor={c.sobrePrimario} />
    </Animated.View>
  );
}

const st = StyleSheet.create({
  card: { position: "absolute", borderRadius: 20, padding: 14, justifyContent: "space-between", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 },
  brilho: { position: "absolute", top: -40, left: -30, right: -30, height: "70%", borderRadius: 200, opacity: 0.45 },
  marca: { position: "absolute", right: 10, bottom: 8 },
  cardRotulo: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  cardNome: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  cardValor: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  pote: { position: "absolute", borderRadius: 22, borderWidth: 2, borderColor: "rgba(255,177,98,0.55)",
    backgroundColor: "rgba(255,177,98,0.08)", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  tampa: { position: "absolute", top: 0, left: "18%", right: "18%", height: 10, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: "rgba(255,177,98,0.55)" },
  agua: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(255,177,98,0.45)" },
  etiqueta: { backgroundColor: c.primario, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, alignItems: "center", gap: 1 },
  moeda: { position: "absolute", left: -11, top: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: c.primario,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FFD39C" },
  operador: { position: "absolute", color: c.texto, fontSize: 22, fontWeight: "800" },
  total: { position: "absolute", left: 0, right: 0, alignItems: "center", gap: 2 },
  selo: { position: "absolute", width: 64, height: 64, borderRadius: 20, backgroundColor: c.primario, alignItems: "center", justifyContent: "center",
    overflow: "hidden", borderWidth: 1, borderColor: BORDA_FINA, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  seloBrilho: { position: "absolute", top: -20, left: -10, right: -10, height: 40, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.35)" },
});

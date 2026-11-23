import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Icone } from "../components/Icone";
import { c } from "./componentes";
import { PROPORCAO, WalletCard, type WalletCardProps } from "./WalletCard";

type Props = Omit<WalletCardProps, "width">;

/** Largura do cartão no deck; deixa folga na direita para os cartões de trás e para o arco da troca. */
export const larguraDeck = (larguraTela: number) => Math.min(larguraTela - 88, 320);

// Posição de cada cartão no baralho: 0 = frente, 1 = logo atrás, 2 = no fundo.
const SLOTS = [
  { x: 0, s: 1, o: 1, z: 30 },
  { x: 16, s: 0.94, o: 0.85, z: 20 },
  { x: 30, s: 0.88, o: 0.65, z: 10 },
] as const;
const PUXADA = { x: 54, y: -10, r: 3.5, s: 0.97 }; // contorna a borda do cartão da frente
const RECUO = { x: -16, y: 4, r: -2, s: 0.95 };    // o cartão da frente cede lugar
const FASE1 = 180;                                  // ~42% da troca
const MOLA_DECK = { stiffness: 320, damping: 26, mass: 0.9 };
const Z_PUXADA: number = 40, Z_RECUO: number = 15;

/**
 * Baralho de 3 cartões, na mesma ordem do seletor. O cartão da aba ativa fica na frente e o da próxima
 * aba espia logo atrás (ordem circular). Trocar de aba puxa o cartão de trás para a frente.
 */
export function WalletCardDeck({ width, frente, cartoes, ativo, fase, aberto, selo, assentar }: {
  width: number; frente: Props; cartoes: Props[]; ativo: number; fase: string; aberto: boolean;
  /** Texto do selo de confirmação (ex.: "Conta ativa"); fica numa camada acima de todo o baralho. */
  selo?: string | null;
  /** true na tela final: tira qualquer camada residual de uma troca de cartão interrompida. */
  assentar?: boolean;
}) {
  const n = cartoes.length;
  const h = width / PROPORCAO;
  return (
    <View style={{ width, alignItems: "center" }}>
      <View style={{ width, height: h }}>
        {cartoes.map((cartao, i) => {
          const slot = (i - ativo + n) % n;
          return <CartaoDeck key={i} width={width} slot={slot} fase={fase} aberto={aberto} assentar={!!assentar} props={slot === 0 ? frente : cartao} />;
        })}
        {selo && (
          <Animated.View pointerEvents="none" entering={ZoomIn.springify().stiffness(350).damping(20)} style={st.selo}>
            <Icone nome="check" tamanho={10} cor="#11241B" />
            <Text style={{ color: "#11241B", fontSize: 11, fontWeight: "800" }}>{selo}</Text>
          </Animated.View>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 5, marginTop: 14, opacity: aberto ? 1 : 0 }}>
        {cartoes.map((_, i) => (
          <View key={i} style={{ height: 5, width: i === ativo ? 16 : 5, borderRadius: 3, backgroundColor: i === ativo ? c.primario : "rgba(255,255,255,0.25)" }} />
        ))}
      </View>
    </View>
  );
}

function CartaoDeck({ width, slot, fase, aberto, assentar, props }: { width: number; slot: number; fase: string; aberto: boolean; assentar: boolean; props: Props }) {
  const inicio = slot > 0 && !aberto ? { x: 0, s: 1, o: 0 } : SLOTS[slot]!;
  const x = useSharedValue(inicio.x), y = useSharedValue(0), r = useSharedValue(0), s = useSharedValue(inicio.s);
  const o = useSharedValue<number>(inicio.o), z = useSharedValue<number>(SLOTS[slot]!.z), giro = useSharedValue(0);
  const slotAnterior = useRef(slot);

  // Reposiciona sempre que o slot muda. Cada atribuição interrompe a animação anterior a partir do valor atual,
  // então cliques rápidos nunca deixam um cartão preso no meio do caminho.
  useEffect(() => {
    const de = slotAnterior.current;
    slotAnterior.current = slot;
    const a = SLOTS[slot]!;
    const oculto = !aberto && slot > 0;
    const fx = oculto ? 0 : a.x, fs = oculto ? 1 : a.s, fo = oculto ? 0 : a.o, zFinal = a.z;

    if (de === slot) { // só abriu ou fechou o baralho
      x.value = withSpring(fx, MOLA_DECK); s.value = withSpring(fs, MOLA_DECK);
      y.value = withSpring(0, MOLA_DECK); r.value = withSpring(0, MOLA_DECK);
      o.value = withTiming(fo, { duration: 250 });
      z.value = zFinal;
      return;
    }
    const puxa = (p: number) => withTiming(p, { duration: FASE1, easing: Easing.out(Easing.cubic) });

    if (slot === 0) { // estava atrás e vem para a frente: sai pela lateral, passa por cima e encaixa
      x.value = withSequence(puxa(PUXADA.x), withSpring(0, MOLA_DECK, (fim) => { 'worklet'; if (fim) z.value = 30; }));
      y.value = withSequence(puxa(PUXADA.y), withSpring(0, MOLA_DECK));
      r.value = withSequence(puxa(PUXADA.r), withSpring(0, MOLA_DECK));
      s.value = withSequence(puxa(PUXADA.s), withSpring(1, MOLA_DECK));
      o.value = withTiming(1, { duration: FASE1 });
      z.value = withDelay(FASE1, withTiming(Z_PUXADA, { duration: 0 }));
    } else if (de === 0) { // estava na frente: recua e desliza por trás do baralho
      x.value = withSequence(puxa(RECUO.x), withSpring(fx, MOLA_DECK, (fim) => { 'worklet'; if (fim) z.value = zFinal; }));
      y.value = withSequence(puxa(RECUO.y), withSpring(0, MOLA_DECK));
      r.value = withSequence(puxa(RECUO.r), withSpring(0, MOLA_DECK));
      s.value = withSequence(puxa(RECUO.s), withSpring(fs, MOLA_DECK));
      o.value = withDelay(FASE1, withTiming(fo, { duration: 320 }));
      z.value = withDelay(FASE1, withTiming(Z_RECUO, { duration: 0 }));
    } else { // remanescente: troca de lugar entre o meio e o fundo
      x.value = withSpring(fx, MOLA_DECK); s.value = withSpring(fs, MOLA_DECK);
      y.value = withSpring(0, MOLA_DECK); r.value = withSpring(0, MOLA_DECK);
      o.value = withTiming(fo, { duration: 320 });
      z.value = withDelay(FASE1, withTiming(zFinal, { duration: 0 }));
    }
  }, [slot, aberto]);

  // Na tela final, cada cartão volta para 10/20/30 e nada fica com o 40 ou o 15 de uma troca interrompida.
  useEffect(() => { if (assentar) z.value = SLOTS[slot]!.z; }, [assentar, slot]);

  // O que o cartão mostra. Quando o baralho passa do perfil para a conta, o da frente vira com um giro.
  const [exibido, setExibido] = useState(props);
  const faseAnterior = useRef(fase);
  useEffect(() => {
    if (faseAnterior.current === fase || slot !== 0) { faseAnterior.current = fase; setExibido(props); return; }
    faseAnterior.current = fase;
    giro.value = withSequence(withTiming(90, { duration: 170 }), withTiming(-90, { duration: 0 }), withSpring(0, MOLA_DECK));
    const t = setTimeout(() => setExibido(props), 170);
    return () => clearTimeout(t);
  }, [props, fase]);

  const estilo = useAnimatedStyle(() => ({
    opacity: o.value,
    zIndex: z.value,
    transform: [
      { perspective: 900 }, { translateX: x.value }, { translateY: y.value },
      { rotate: `${r.value}deg` }, { rotateY: `${giro.value}deg` }, { scale: s.value },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0 }, estilo]}>
      <WalletCard {...exibido} width={width} />
    </Animated.View>
  );
}

// Camada própria acima de todo o baralho: zIndex para o React Native e elevation para o Android,
// que ordena por elevação (os cartões têm elevação própria e cobririam o selo).
const st = StyleSheet.create({
  selo: { position: "absolute", top: -10, right: -6, zIndex: 100, elevation: 100, flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#7BC79A", borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5,
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
});

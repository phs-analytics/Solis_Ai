import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { MOLA, c } from "./componentes";
import { PROPORCAO, WalletCard, type WalletCardProps } from "./WalletCard";

type Frente = Omit<WalletCardProps, "width">;

/**
 * Cartão da frente com 2 cartões espiando atrás à direita e pílulas embaixo.
 * Quando `chave` muda (ex.: tipo de conta), o cartão da frente gira e troca de conteúdo.
 */
export function WalletCardDeck({ width, frente, chave, indice, total, aberto }: {
  width: number; frente: Frente; chave: string; indice: number; total: number; aberto: boolean;
}) {
  const h = width / PROPORCAO;
  const [mostrado, setMostrado] = useState(frente);
  const chaveAnterior = useRef(chave);
  const giro = useSharedValue(0), desliza = useSharedValue(0);

  // Campos que não trocam o tipo (nome, saldo) passam direto; trocar o tipo gira o cartão.
  useEffect(() => {
    if (chave === chaveAnterior.current) { setMostrado(frente); return; }
    const dir = indice > total / 2 ? 1 : -1;
    chaveAnterior.current = chave;
    giro.value = withSequence(withTiming(90 * dir, { duration: 170 }), withTiming(-90 * dir, { duration: 0 }), withSpring(0, MOLA));
    desliza.value = withSequence(withTiming(-24 * dir, { duration: 170 }), withSpring(0, MOLA));
    const t = setTimeout(() => setMostrado(frente), 170);
    return () => clearTimeout(t);
  }, [chave, frente]);

  const aberturaV = useSharedValue(aberto ? 1 : 0);
  useEffect(() => { aberturaV.value = withSpring(aberto ? 1 : 0, MOLA); }, [aberto]);
  const tras1 = useAnimatedStyle(() => ({ opacity: aberturaV.value, transform: [{ translateX: 14 * aberturaV.value }, { scale: 1 - 0.06 * aberturaV.value }] }));
  const tras2 = useAnimatedStyle(() => ({ opacity: aberturaV.value, transform: [{ translateX: 26 * aberturaV.value }, { scale: 1 - 0.12 * aberturaV.value }] }));
  const estiloFrente = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { translateX: desliza.value }, { rotateY: `${giro.value}deg` }],
  }));
  const pilulas = useAnimatedStyle(() => ({ opacity: aberturaV.value }));

  const vazio = { title: "", subtitle: "", balance: 0, tipoIcon: frente.tipoIcon, isBalanceHidden: true } as const;
  return (
    <View style={{ width, alignItems: "center" }}>
      <View style={{ width, height: h }}>
        <Animated.View style={[{ position: "absolute" }, tras2]}><WalletCard {...vazio} width={width} variant="deck2" /></Animated.View>
        <Animated.View style={[{ position: "absolute" }, tras1]}><WalletCard {...vazio} width={width} variant="deck1" /></Animated.View>
        <Animated.View style={estiloFrente}><WalletCard {...mostrado} width={width} /></Animated.View>
      </View>
      <Animated.View style={[{ flexDirection: "row", gap: 5, marginTop: 14 }, pilulas]}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ height: 5, width: i === indice ? 16 : 5, borderRadius: 3, backgroundColor: i === indice ? c.primario : "rgba(255,255,255,0.25)" }} />
        ))}
      </Animated.View>
    </View>
  );
}

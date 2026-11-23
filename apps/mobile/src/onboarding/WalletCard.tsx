import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Texto as Text } from "../components/Texto";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { Icone, type NomeIcone } from "../components/Icone";
import { AnimatedNumber, MOLA, NUM } from "./componentes";
import { TextoAnimado } from "../components/Texto";

// Gradientes de 135° com a paleta do Solis (Abyssal, Blue Fantastic, Truffle) e dois tons para o fundo do deck.
export const VARIANTES = {
  abyssal: ["#2A3A4C", "#1B2632", "#0D141C"],
  fantastic: ["#3E5269", "#2C3B4D", "#18222E"],
  truffle: ["#7A3C29", "#4A2214", "#25110A"],
  musgo: ["#2F5A45", "#1F3D30", "#11241B"],
  deck1: ["#55606B", "#46515C", "#38424C"],
  deck2: ["#6E7781", "#5C6670", "#4C555F"],
} as const;
export type Variante = keyof typeof VARIANTES;

export const PROPORCAO = 1.58;

export type WalletCardProps = {
  width: number;
  title: string;
  subtitle: string;
  balance: number;
  negativo?: boolean;
  isBalanceHidden?: boolean;
  variant: Variante;
  /** Ícone ou iniciais no círculo do topo. */
  badgeIcon?: NomeIcone;
  badgeText?: string;
  /** Ícone do tipo de conta no canto direito (no lugar do símbolo de aproximação). */
  tipoIcon: NomeIcone;
  /** Linha de baixo à esquerda (ex.: titular). Nada de número de cartão inventado. */
  holder?: string;
  /** Mude o número para disparar a varredura de luz. */
  triggerShimmer?: number;
  /** Mude o número para dar o pulso de segurança. */
  triggerPulse?: number;
  /** 0 a 1: brilho verde na borda conforme a senha fica forte. */
  protecao?: number;
  /** Ao revelar o saldo, conta a partir de zero. */
  contarAoRevelar?: boolean;
  /** Mude o número para o saldo contar de novo a partir de zero. */
  recontar?: number;
};

export function WalletCard(p: WalletCardProps) {
  const h = p.width / PROPORCAO;
  const pequeno = p.width < 200;

  const varre = useSharedValue(-1);
  useEffect(() => {
    if (!p.triggerShimmer) return;
    varre.value = -1;
    varre.value = withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) });
  }, [p.triggerShimmer]);
  const faixa = useAnimatedStyle(() => ({ transform: [{ translateX: varre.value * p.width * 1.2 }, { rotate: "20deg" }] }));

  const escala = useSharedValue(1);
  useEffect(() => {
    if (!p.triggerPulse) return;
    escala.value = withSequence(withSpring(1.03, MOLA), withSpring(1, MOLA));
  }, [p.triggerPulse]);
  const pulso = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  const protecao = useSharedValue(p.protecao ?? 0);
  useEffect(() => { protecao.value = withTiming(p.protecao ?? 0, { duration: 350 }); }, [p.protecao]);
  const bordaVerde = useAnimatedStyle(() => ({ opacity: protecao.value }));

  // Se o saldo já esteve oculto, ao aparecer ele conta a partir de zero.
  const jaOculto = useRef(false);
  if (p.isBalanceHidden) jaOculto.current = true;
  const revelou = jaOculto.current;

  return (
    <Animated.View style={[{ width: p.width, height: h }, pulso]}>
      <View style={[st.card, { borderRadius: pequeno ? 16 : 22 }]}>
        <LinearGradient colors={VARIANTES[p.variant] as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* Reflexo diagonal com corte nítido, como luz em vidro ou metal */}
        <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.15 }} end={{ x: 1, y: 0.85 }}
          colors={["rgba(255,255,255,0.11)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0)", "rgba(255,255,255,0)"]} locations={[0, 0.48, 0.485, 1]} />
        <Animated.View pointerEvents="none" style={[st.faixa, { height: h * 2, top: -h / 2 }, faixa]}>
          <LinearGradient style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]} />
        </Animated.View>

        <View style={[st.conteudo, { padding: pequeno ? 10 : 16 }]}>
          <View style={st.linha}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <View style={[st.badge, pequeno && { width: 18, height: 18 }]}>
                <Animated.View key={p.badgeIcon ?? p.badgeText} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
                  {p.badgeIcon
                    ? <Icone nome={p.badgeIcon} tamanho={pequeno ? 9 : 12} cor="#FFFFFF" />
                    : <Text style={{ color: "#FFFFFF", fontSize: pequeno ? 8 : 10, fontWeight: "800" }}>{p.badgeText}</Text>}
                </Animated.View>
              </View>
              <Text numberOfLines={1} style={[st.titulo, pequeno && { fontSize: 10 }]}>{p.title}</Text>
            </View>
            <Icone nome={p.tipoIcon} tamanho={pequeno ? 11 : 16} cor="rgba(255,255,255,0.7)" />
          </View>

          <View>
            {p.isBalanceHidden
              ? <TextoAnimado entering={FadeIn.duration(200)} style={[st.saldo, NUM, pequeno && { fontSize: 15 }]}>R$ ••••••</TextoAnimado>
              : <AnimatedNumber key={p.recontar ?? 0} centavos={p.balance} negativo={p.negativo} inicial={p.contarAoRevelar && revelou ? 0 : undefined}
                  duracao={900} style={[st.saldo, pequeno && { fontSize: 15 }]} />}
            <Text style={[st.sub, pequeno && { fontSize: 7 }]}>{p.subtitle.toUpperCase()}</Text>
          </View>

          <View style={[st.linha, { alignItems: "flex-end" }]}>
            <View>
              {!pequeno && <Text style={st.holderRot}>TITULAR</Text>}
              <Text numberOfLines={1} style={[st.holder, pequeno && { fontSize: 9 }]}>{p.holder || "Solis"}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <View style={[st.circulo, pequeno && st.circuloP, { backgroundColor: "rgba(255,255,255,0.45)" }]} />
              <View style={[st.circulo, pequeno && st.circuloP, { backgroundColor: "rgba(255,255,255,0.85)", marginLeft: pequeno ? -6 : -9 }]} />
            </View>
          </View>
        </View>

        <View pointerEvents="none" style={[StyleSheet.absoluteFill, st.borda, { borderRadius: pequeno ? 16 : 22 }]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st.bordaVerde, { borderRadius: pequeno ? 16 : 22 }, bordaVerde]} />
      </View>

    </Animated.View>
  );
}

const st = StyleSheet.create({
  card: { flex: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.75, shadowRadius: 24, elevation: 16 },
  conteudo: { flex: 1, justifyContent: "space-between" },
  linha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  titulo: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500", flexShrink: 1 },
  saldo: { color: "#FFFFFF", fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  sub: { color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 1.2, marginTop: 2, fontWeight: "600" },
  holderRot: { color: "rgba(255,255,255,0.45)", fontSize: 8, letterSpacing: 1, fontWeight: "600" },
  holder: { color: "#FFFFFF", fontSize: 13, letterSpacing: 0.6, fontWeight: "600", maxWidth: 170 },
  circulo: { width: 22, height: 22, borderRadius: 11 },
  circuloP: { width: 14, height: 14, borderRadius: 7 },
  borda: { borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  bordaVerde: { borderWidth: 1.5, borderColor: "rgba(123,199,154,0.85)" },
  faixa: { position: "absolute", left: "35%", width: 60 },
});

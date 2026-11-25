import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auxiliares, tipo, useTema } from "../theme";
import { Texto as Text } from "./Texto";
import { Icone } from "./Icone";

export type Origem = { x: number; y: number; w: number; h: number };

/** Mede onde está o botão tocado, para o pop-out nascer dele. */
type Medivel = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };
export function medir(alvo: Medivel | null): Promise<Origem | null> {
  return new Promise((ok) => {
    if (!alvo) return ok(null);
    alvo.measureInWindow((x, y, w, h) => ok({ x, y, w, h }));
  });
}

type Props = {
  aberto: boolean;
  origem: Origem | null;
  aoFechar: () => void;
  titulo: string;
  rodape?: { texto: string; acao: () => void; desativado?: boolean };
  /** Sem rolagem própria: o conteúdo (ex.: o recibo) cuida do espaço. */
  semRolagem?: boolean;
  children: React.ReactNode;
};

/** Pop-out que nasce do elemento tocado com mola e volta para ele ao fechar. */
export function PopOut({ aberto, origem, aoFechar, titulo, rodape, semRolagem, children }: Props) {
  const c = useTema().cores;
  const ins = useSafeAreaInsets();
  const [montado, setMontado] = useState(aberto);
  const p = useSharedValue(0);
  const caixa = useSharedValue({ x: 0, y: 0, w: 1, h: 1 });
  const o = useSharedValue<Origem | null>(origem);

  useEffect(() => { o.value = origem; }, [origem, o]);
  useEffect(() => {
    if (aberto) { setMontado(true); p.value = 0; p.value = withSpring(1, { damping: 18, stiffness: 190, mass: 0.9 }); }
    else if (montado) p.value = withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) }, (fim) => { if (fim) runOnJS(setMontado)(false); });
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  const fundo = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 1], [0, 0.58]) }));
  const folha = useAnimatedStyle(() => {
    const b = caixa.value, org = o.value;
    const dx = org ? org.x + org.w / 2 - (b.x + b.w / 2) : 0;
    const dy = org ? org.y + org.h / 2 - (b.y + b.h / 2) : 40;
    const sx = org ? org.w / b.w : 0.9, sy = org ? org.h / b.h : 0.9;
    const q = Math.min(1, Math.max(0, p.value));
    return {
      opacity: interpolate(p.value, [0, 0.35], [0, 1], "clamp"),
      transform: [{ translateX: dx * (1 - p.value) }, { translateY: dy * (1 - p.value) }, { scaleX: sx + (1 - sx) * q }, { scaleY: sy + (1 - sy) * q }],
    };
  });

  if (!montado) return null;
  const Corpo = semRolagem ? View : ScrollView;
  return (
    <Modal transparent statusBarTranslucent visible onRequestClose={aoFechar} animationType="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: auxiliares.preto }, fundo]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={aoFechar} accessibilityLabel="Fechar" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        onLayout={(e) => { const { x, y, width, height } = e.nativeEvent.layout; caixa.value = { x, y, w: width, h: height }; }}
        style={[s.folha, { bottom: ins.bottom + 86, maxHeight: "74%", backgroundColor: c.superficie, borderColor: c.borda, shadowColor: auxiliares.preto }, folha]}
      >
        <View style={s.cab}>
          <Text style={{ ...tipo.corpo(12, "semibold"), color: c.textoSuave, letterSpacing: 0.6, flex: 1 }} accessibilityRole="header">{titulo.toUpperCase()}</Text>
          <Pressable onPress={aoFechar} style={[s.x, { backgroundColor: c.fundo }]} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8}>
            <Icone nome="cross-small" tamanho={18} cor={c.texto} />
          </Pressable>
        </View>
        <Corpo style={semRolagem ? { flexShrink: 1 } : undefined} contentContainerStyle={semRolagem ? undefined : s.corpo}>
          {semRolagem ? <View style={s.corpo}>{children}</View> : children}
        </Corpo>
        {rodape && (
          <View style={s.pe}>
            <Pressable onPress={rodape.acao} disabled={rodape.desativado} accessibilityRole="button"
              style={({ pressed }) => [s.botao, { backgroundColor: c.primario, opacity: rodape.desativado ? 0.5 : pressed ? 0.85 : 1 }]}>
              <Text style={{ ...tipo.botao(15), color: c.sobrePrimario }}>{rodape.texto}</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  folha: { position: "absolute", left: 12, right: 12, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", shadowOpacity: 0.4, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 24 },
  cab: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  corpo: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8, gap: 14 },
  pe: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 16 },
  botao: { height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});

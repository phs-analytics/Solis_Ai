import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const N = 40; // todo período vira 40 pontos, para a curva poder se transformar de um em outro
const MARGEM = 10;

/** Reamostra para N pontos e normaliza para 0..1 (1 = maior saldo do período). */
function preparar(pontos: number[]): number[] {
  if (pontos.length === 0) return Array(N).fill(0.5);
  const r = Array.from({ length: N }, (_, i) => {
    const x = (i / (N - 1)) * (pontos.length - 1);
    const a = Math.floor(x), b = Math.min(pontos.length - 1, a + 1);
    return pontos[a]! + (pontos[b]! - pontos[a]!) * (x - a);
  });
  const min = Math.min(...r), max = Math.max(...r);
  return max === min ? r.map(() => 0.5) : r.map((v) => (v - min) / (max - min));
}

/** Curva suave (Catmull-Rom convertida em Bézier) passando pelos pontos. */
function curva(ys: number[], w: number, h: number): string {
  "worklet";
  const px = (i: number) => (i / (ys.length - 1)) * w;
  const py = (v: number) => MARGEM + (1 - v) * (h - 2 * MARGEM);
  let d = `M ${px(0)} ${py(ys[0]!)}`;
  for (let i = 0; i < ys.length - 1; i++) {
    const y0 = ys[Math.max(0, i - 1)]!, y1 = ys[i]!, y2 = ys[i + 1]!, y3 = ys[Math.min(ys.length - 1, i + 2)]!;
    const x0 = px(Math.max(0, i - 1)), x1 = px(i), x2 = px(i + 1), x3 = px(Math.min(ys.length - 1, i + 2));
    d += ` C ${x1 + (x2 - x0) / 6} ${py(y1) + (py(y2) - py(y0)) / 6} ${x2 - (x3 - x1) / 6} ${py(y2) - (py(y3) - py(y1)) / 6} ${x2} ${py(y2)}`;
  }
  return d;
}

export function GraficoSaldo({ pontos, largura, altura = 120, cor, reduzirMovimento, rotulo }: {
  pontos: number[]; largura: number; altura?: number; cor: string; reduzirMovimento: boolean; rotulo: string;
}) {
  const alvo = useMemo(() => preparar(pontos), [pontos]);
  const de = useSharedValue<number[]>(alvo), para = useSharedValue<number[]>(alvo), t = useSharedValue(1);
  const pulso = useSharedValue(0);

  // Ao trocar o período, a curva se transforma da forma atual para a nova (interrompível).
  useEffect(() => {
    const atual = de.value.map((v, i) => v + (para.value[i]! - v) * t.value);
    de.value = atual;
    para.value = alvo;
    t.value = 0;
    t.value = reduzirMovimento ? 1 : withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [alvo, reduzirMovimento]);

  useEffect(() => {
    pulso.value = reduzirMovimento ? 0 : withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduzirMovimento]);

  const ys = () => {
    "worklet";
    return para.value.map((v, i) => de.value[i]! + (v - de.value[i]!) * t.value);
  };
  const w = largura - 10; // folga para o ponto final não ser cortado
  const linha = useAnimatedProps(() => ({ d: curva(ys(), w, altura) }));
  const area = useAnimatedProps(() => ({ d: `${curva(ys(), w, altura)} L ${w} ${altura} L 0 ${altura} Z` }));
  const ultimoY = () => {
    "worklet";
    const v = ys()[N - 1]!;
    return MARGEM + (1 - v) * (altura - 2 * MARGEM);
  };
  const ponto = useAnimatedProps(() => ({ cy: ultimoY() }));
  const halo = useAnimatedProps(() => ({ cy: ultimoY(), r: 5 + pulso.value * 9, opacity: 0.45 * (1 - pulso.value) }));

  if (!largura) return <View style={{ height: altura }} />;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={rotulo} style={{ height: altura }}>
      <Svg width={largura} height={altura}>
        <Defs>
          <LinearGradient id="degradeSaldo" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={cor} stopOpacity={0.32} />
            <Stop offset="1" stopColor={cor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <AnimatedPath animatedProps={area} fill="url(#degradeSaldo)" />
        <AnimatedPath animatedProps={linha} stroke={cor} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <AnimatedCircle animatedProps={halo} cx={w} fill={cor} />
        <AnimatedCircle animatedProps={ponto} cx={w} r={4.5} fill={cor} stroke="#FFFFFF" strokeWidth={2} />
      </Svg>
    </View>
  );
}

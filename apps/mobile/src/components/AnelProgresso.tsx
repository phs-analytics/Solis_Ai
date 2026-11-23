import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Anel que se preenche de 0 a 1 (`valor`). O conteúdo (ex.: "3d") fica no centro. */
export function AnelProgresso({ valor, tamanho = 46, espessura = 5, cor, fundo, reduzirMovimento, children }: {
  valor: number; tamanho?: number; espessura?: number; cor: string; fundo: string; reduzirMovimento: boolean; children?: React.ReactNode;
}) {
  const r = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(reduzirMovimento ? valor : 0);
  useEffect(() => {
    p.value = reduzirMovimento ? valor : withTiming(valor, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [valor, reduzirMovimento]);
  const animado = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: "center", justifyContent: "center" }}>
      <Svg width={tamanho} height={tamanho} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={tamanho / 2} cy={tamanho / 2} r={r} stroke={fundo} strokeWidth={espessura} fill="none" />
        <AnimatedCircle cx={tamanho / 2} cy={tamanho / 2} r={r} stroke={cor} strokeWidth={espessura} fill="none"
          strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} animatedProps={animado} />
      </Svg>
      {children}
    </View>
  );
}

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing, Extrapolation, cancelAnimation, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type NomeNav = "home" | "card" | "goal" | "chart" | "ai" | "layers" | "person" | "eye" | "search" | "plus" | "down" | "exchange" | "import" | "sync" | "receipt" | "export";

type Props = { nome: NomeNav; cor: string; tamanho?: number; /** muda a cada toque: dispara a animação */ play: number; /** olho: mostra o risco */ riscado?: boolean; /** sync: gira sem parar enquanto atualiza */ girando?: boolean };

const APath = Animated.createAnimatedComponent(Path);
const CASA = "M4 11l8-7 8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5z";
const ARCO = 36.65; // 280° de um raio 7,5
const SETA = 18;

function i(v: number, a: number[], b: number[]) {
  "worklet";
  return interpolate(v, a, b, Extrapolation.CLAMP);
}

/** Uma camada do ícone: um Svg 24×24 em tela cheia, transformado como View. */
function Camada({ t, estilo, children }: { t: number; estilo?: object; children: React.ReactNode }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, estilo]}>
      <Svg width={t} height={t} viewBox="0 0 24 24">{children}</Svg>
    </Animated.View>
  );
}

export function NavIcone({ nome, cor, tamanho = 20, play, riscado = false, girando = false }: Props) {
  const p = useSharedValue(1);
  useEffect(() => {
    if (!play) return;
    p.value = 0;
    p.value = withTiming(1, { duration: 780, easing: Easing.out(Easing.quad) });
  }, [play, p]);
  const Icone = ICONES[nome];
  return (
    <View style={{ width: tamanho, height: tamanho }}>
      <Icone p={p} t={tamanho} cor={cor} riscado={riscado} girando={girando} />
    </View>
  );
}

type IP = { p: SharedValue<number>; t: number; cor: string; riscado?: boolean; girando?: boolean };
const traco = (cor: string) => ({ stroke: cor, strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" });
// worklet: é chamada dentro de useAnimatedStyle (roda na thread de UI)
function px(t: number, x: number, y: number) {
  "worklet";
  return `${(x * t) / 24}px ${(y * t) / 24}px`;
}

function Casa({ p, t, cor }: IP) {
  const corpo = useAnimatedStyle(() => ({
    transformOrigin: "bottom",
    transform: [
      { rotate: `${i(p.value, [0, 0.22, 0.42, 0.6], [0, -14, 5, 0])}deg` },
      { scaleX: i(p.value, [0, 0.6, 0.78, 1], [1, 1.2, 0.9, 1]) },
      { scaleY: i(p.value, [0, 0.6, 0.78, 1], [1, 0.78, 1.14, 1]) },
    ],
  }));
  const eco = useAnimatedStyle(() => ({
    transformOrigin: "bottom",
    opacity: i(p.value, [0, 0.3, 0.55], [0, 0.4, 0]),
    transform: [{ rotate: `${i(p.value, [0, 0.3, 0.55], [0, -10, 2])}deg` }, { translateX: i(p.value, [0, 0.3, 0.55], [0, -2, 0]) }],
  }));
  return (
    <>
      <Camada t={t} estilo={eco}><Path d={CASA} {...traco(cor)} /></Camada>
      <Camada t={t} estilo={corpo}><Path d={CASA} {...traco(cor)} /></Camada>
    </>
  );
}

function Cartao({ p, t, cor }: IP) {
  const giro = useAnimatedStyle(() => ({
    transform: [{ perspective: 60 }, { rotateY: `${i(p.value, [0, 0.45, 1], [0, 180, 360])}deg` }],
  }));
  const aneis = useAnimatedStyle(() => ({
    opacity: i(p.value, [0, 0.55, 0.82], [0, 0, 1]),
    transform: [{ scale: i(p.value, [0, 0.55, 0.82, 1], [0.3, 0.3, 1.15, 1]) }],
  }));
  return (
    <>
      <Camada t={t} estilo={giro}><Rect x={3} y={5} width={18} height={14} rx={3.2} {...traco(cor)} /></Camada>
      <Camada t={t} estilo={aneis}>
        <Circle cx={10.2} cy={12} r={2.6} {...traco(cor)} />
        <Circle cx={13.8} cy={12} r={2.6} {...traco(cor)} />
      </Camada>
    </>
  );
}

function Meta({ p, t, cor }: IP) {
  const k = t / 24;
  const moeda = useAnimatedStyle(() => ({
    transform: [{ translateY: i(p.value, [0, 0.35, 0.65, 0.8, 1], [0, -7, 1, -2, 0]) * k }, { translateX: i(p.value, [0, 0.35, 0.65], [0, 1, 0]) * k }],
  }));
  const rastro = useAnimatedStyle(() => ({
    opacity: i(p.value, [0, 0.4, 0.65], [0, 0.45, 0]),
    transform: [{ translateY: i(p.value, [0, 0.4, 0.65], [0, -3, 0]) * k }, { translateX: i(p.value, [0, 0.4, 0.65], [0, -2, 0]) * k }],
  }));
  const mao = useAnimatedStyle(() => ({
    transform: [{ translateY: i(p.value, [0, 0.2, 0.45, 0.68, 1], [0, 1.6, -0.6, 1, 0]) * k }],
  }));
  return (
    <>
      <Camada t={t} estilo={rastro}><Circle cx={15} cy={7} r={2.8} {...traco(cor)} /></Camada>
      <Camada t={t} estilo={moeda}><Circle cx={15} cy={7} r={2.8} {...traco(cor)} /></Camada>
      <Camada t={t} estilo={mao}><Path d="M2.5 14.5h3.2l3.8 1.8h3.6a1.7 1.7 0 0 0 0-3.4h-2.8M5.7 20h9.1l6-4.3a1.6 1.6 0 0 0-1.9-2.6l-4.2 2.7" {...traco(cor)} /></Camada>
    </>
  );
}

function Invest({ p, t, cor }: IP) {
  const arco = useAnimatedProps(() => ({ strokeDashoffset: i(p.value, [0, 0.83], [ARCO, 0]) }));
  const seta = useAnimatedProps(() => ({ strokeDashoffset: i(p.value, [0, 0.3, 1], [SETA, SETA, 0]) }));
  const cifrao = useAnimatedStyle(() => ({
    transformOrigin: px(t, 11, 11),
    transform: [{ scaleX: i(p.value, [0, 0.42, 0.83], [1, -1, 1]) }],
  }));
  return (
    <>
      <Camada t={t}>
        <APath d="M12.3 18.39A7.5 7.5 0 1 1 18.5 11" strokeDasharray={[ARCO, ARCO]} animatedProps={arco} {...traco(cor)} />
        <APath d="M13.5 20.5l3-3 2 1.6 3.5-3.6M19.2 15.5H22v2.8" strokeDasharray={[SETA, SETA]} animatedProps={seta} {...traco(cor)} />
      </Camada>
      <Camada t={t} estilo={cifrao}>
        <Path d="M13.3 8.6c-.4-.8-1.2-1.2-2.1-1.2-1.2 0-2.1.7-2.1 1.6 0 2.2 4.4 1.1 4.4 3.4 0 .9-.9 1.7-2.2 1.7-1 0-1.9-.5-2.3-1.3M11.1 6v1.4M11.1 14.1v1.4" {...traco(cor)} />
      </Camada>
    </>
  );
}

function Brilho({ p, t, cor }: IP) {
  const grande = useAnimatedStyle(() => ({
    transformOrigin: px(t, 11, 9.8),
    transform: [{ rotate: `${i(p.value, [0, 0.3, 0.65, 1], [0, 45, 100, 90])}deg` }, { scale: i(p.value, [0, 0.3, 0.65, 1], [1, 0.6, 1.2, 1]) }],
  }));
  const pequena = useAnimatedStyle(() => ({
    transformOrigin: px(t, 18.5, 17.5),
    opacity: i(p.value, [0, 0.35, 0.7], [1, 0, 1]),
    transform: [{ scale: i(p.value, [0, 0.35, 0.7, 1], [1, 0, 1.5, 1]) }, { rotate: `${i(p.value, [0.35, 1], [0, 90])}deg` }],
  }));
  const faisca = useAnimatedStyle(() => ({
    transformOrigin: px(t, 18, 4),
    opacity: i(p.value, [0, 0.4, 0.8], [1, 0, 1]),
    transform: [{ scale: i(p.value, [0, 0.4, 0.8, 1], [1, 0, 1.4, 1]) }],
  }));
  return (
    <>
      <Camada t={t} estilo={grande}><Path d="M11 3.5l1.7 4.6 4.6 1.7-4.6 1.7L11 16.1l-1.7-4.6-4.6-1.7 4.6-1.7z" {...traco(cor)} /></Camada>
      <Camada t={t} estilo={pequena}><Path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" {...traco(cor)} /></Camada>
      <Camada t={t} estilo={faisca}><Path d="M18 2.5v3M16.5 4h3" {...traco(cor)} /></Camada>
    </>
  );
}

function Camadas({ p, t, cor }: IP) {
  const k = t / 24;
  const l1 = useAnimatedStyle(() => ({ transform: [{ translateY: i(p.value, [0, 0.28, 0.5, 1], [0, 3, -1, 0]) * k }] }));
  const l2 = useAnimatedStyle(() => ({
    opacity: i(p.value, [0, 0.28, 0.42, 0.55], [1, 1, 0, 1]),
    transform: [{ translateY: i(p.value, [0, 0.28, 0.42, 0.55, 0.78, 1], [0, -4, -14, -12, 1.5, 0]) * k }],
  }));
  const l3 = useAnimatedStyle(() => ({
    opacity: i(p.value, [0, 0.28, 0.45, 0.62], [1, 1, 0, 1]),
    transform: [{ translateY: i(p.value, [0, 0.28, 0.45, 0.62, 0.84, 1], [0, -8, -16, -14, 1.5, 0]) * k }],
  }));
  return (
    <>
      <Camada t={t} estilo={l3}><Path d="M3.5 16.2L12 20.5l8.5-4.3" {...traco(cor)} /></Camada>
      <Camada t={t} estilo={l2}><Path d="M3.5 12L12 16.3 20.5 12" {...traco(cor)} /></Camada>
      <Camada t={t} estilo={l1}><Path d="M12 3.5l8.5 4.3L12 12 3.5 7.8z" {...traco(cor)} /></Camada>
    </>
  );
}

function Pessoa({ p, t, cor }: IP) {
  const k = t / 24;
  const anel = useAnimatedStyle(() => ({ transform: [{ scale: i(p.value, [0, 0.38, 0.6, 1], [1, 0.92, 1.1, 1]) }] }));
  const boneco = useAnimatedStyle(() => ({
    transform: [{ translateX: i(p.value, [0, 0.38, 0.381, 0.8, 1], [0, 15, -15, 1.5, 0]) * k }],
  }));
  const r = 8.4 * k, o = (12 - 8.4) * k;
  return (
    <>
      <Camada t={t} estilo={anel}><Circle cx={12} cy={12} r={9.3} {...traco(cor)} /></Camada>
      {/* máscara circular: o boneco sai por um lado e volta pelo outro */}
      <View pointerEvents="none" style={{ position: "absolute", left: o, top: o, width: r * 2, height: r * 2, borderRadius: r, overflow: "hidden" }}>
        <Animated.View style={[{ position: "absolute", left: -o, top: -o, width: t, height: t }, boneco]}>
          <Svg width={t} height={t} viewBox="0 0 24 24">
            <Circle cx={12} cy={10} r={3.1} {...traco(cor)} />
            <Path d="M5.8 19.5c1.3-2.6 3.5-3.9 6.2-3.9s4.9 1.3 6.2 3.9" {...traco(cor)} />
          </Svg>
        </Animated.View>
      </View>
    </>
  );
}

function Olho({ p, t, cor, riscado }: IP) {
  const k = t / 24;
  const pisca = useAnimatedStyle(() => ({ transform: [{ scaleY: i(p.value, [0, 0.3, 0.55], [1, 0.1, 1]) }] }));
  const pupila = useAnimatedStyle(() => ({ transform: [{ translateX: i(p.value, [0, 0.55, 0.65, 0.85, 1], [0, 0, 2.5, -2, 0]) * k }] }));
  const risco = useAnimatedProps(() => ({ strokeDashoffset: withTiming(riscado ? 0 : 23, { duration: 350 }) }));
  return (
    <>
      <Camada t={t} estilo={pisca}><Path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" {...traco(cor)} /></Camada>
      <Camada t={t} estilo={[pisca, pupila]}><Circle cx={12} cy={12} r={3} {...traco(cor)} /></Camada>
      <Camada t={t}><APath d="M4 4l16 16" strokeDasharray={[23, 23]} animatedProps={risco} {...traco(cor)} /></Camada>
    </>
  );
}

function Lupa({ p, t, cor }: IP) {
  const k = t / 24;
  const giro = useAnimatedStyle(() => ({
    transformOrigin: px(t, 11, 11),
    transform: [
      { translateX: i(p.value, [0, 0.25, 0.5, 0.75, 1], [0, -2, 0, 2, 0]) * k },
      { translateY: i(p.value, [0, 0.25, 0.5, 0.75, 1], [0, -1.5, -3, -1.5, 0]) * k },
      { rotate: `${i(p.value, [0, 0.3, 0.7, 1], [0, -15, 10, 0])}deg` },
    ],
  }));
  return <Camada t={t} estilo={giro}><Circle cx={11} cy={11} r={6.5} {...traco(cor)} /><Path d="M16 16l4.5 4.5" {...traco(cor)} /></Camada>;
}

function Mais({ p, t, cor }: IP) {
  const giro = useAnimatedStyle(() => ({
    transform: [{ rotate: `${i(p.value, [0, 0.35, 0.7, 1], [0, 45, 100, 90])}deg` }, { scale: i(p.value, [0, 0.35, 0.7, 1], [1, 0.7, 1.15, 1]) }],
  }));
  return <Camada t={t} estilo={giro}><Path d="M12 5v14M5 12h14" {...traco(cor)} /></Camada>;
}

function Baixo({ p, t, cor }: IP) {
  const k = t / 24;
  const seta = useAnimatedStyle(() => ({
    opacity: i(p.value, [0, 0.35, 0.36, 0.75], [1, 0, 0, 1]),
    transform: [{ translateY: i(p.value, [0, 0.35, 0.36, 0.75, 1], [0, 9, -9, 1.5, 0]) * k }],
  }));
  return <Camada t={t} estilo={seta}><Path d="M12 4v14M6 12l6 6 6-6" {...traco(cor)} /></Camada>;
}

function Troca({ p, t, cor }: IP) {
  const k = t / 24;
  const cima = useAnimatedStyle(() => ({ transform: [{ translateX: i(p.value, [0, 0.4, 0.7, 1], [0, 5, -1, 0]) * k }] }));
  const baixo = useAnimatedStyle(() => ({ transform: [{ translateX: i(p.value, [0, 0.1, 0.5, 0.8, 1], [0, 0, -5, 1, 0]) * k }] }));
  return (
    <>
      <Camada t={t} estilo={cima}><Path d="M4 8h14l-3.5-3.5" {...traco(cor)} /></Camada>
      <Camada t={t} estilo={baixo}><Path d="M20 16H6l3.5 3.5" {...traco(cor)} /></Camada>
    </>
  );
}

function Importar({ p, t, cor }: IP) {
  const k = t / 24;
  const seta = useAnimatedStyle(() => ({
    opacity: i(p.value, [0, 0.3, 0.7], [1, 0, 1]),
    transform: [{ translateX: i(p.value, [0, 0.3, 0.7, 1], [0, -7, 1.5, 0]) * k }],
  }));
  const folha = useAnimatedStyle(() => ({
    transformOrigin: px(t, 13.5, 12),
    transform: [{ scaleX: i(p.value, [0, 0.55, 0.7, 1], [1, 1, 1.12, 1]) }, { scaleY: i(p.value, [0, 0.55, 0.7, 1], [1, 1, 0.92, 1]) }],
  }));
  return (
    <>
      <Camada t={t} estilo={folha}><Path d="M8 3h7l4 4v14H8z" {...traco(cor)} /></Camada>
      <Camada t={t} estilo={seta}><Path d="M3 13h9M9 10l3 3-3 3" {...traco(cor)} /></Camada>
    </>
  );
}

function Sincronizar({ p, t, cor, girando }: IP) {
  const volta = useSharedValue(0);
  useEffect(() => {
    if (girando) volta.value = withRepeat(withTiming(volta.value + 360, { duration: 1000, easing: Easing.linear }), -1);
    else { cancelAnimation(volta); volta.value = withTiming(Math.ceil(volta.value / 360) * 360, { duration: 300 }); }
  }, [girando, volta]);
  const setas = useAnimatedStyle(() => ({ transform: [{ rotate: `${volta.value + i(p.value, [0, 0.75, 1], [0, 380, 360])}deg` }] }));
  return (
    <>
      <Camada t={t} estilo={setas}><Path d="M19.5 10A7.8 7.8 0 0 0 5.6 7M4.5 14a7.8 7.8 0 0 0 13.9 3M5.2 3.5V7h3.5M18.8 20.5V17h-3.5" {...traco(cor)} /></Camada>
      <Camada t={t}><Path d="M9 11l3-1.8 3 1.8zM9.8 11.5v2.6M12 11.5v2.6M14.2 11.5v2.6M9 15h6" {...traco(cor)} /></Camada>
    </>
  );
}

function Recibo({ p, t, cor }: IP) {
  const k = t / 24;
  const papel = useAnimatedStyle(() => ({
    transformOrigin: "top",
    transform: [{ scaleX: i(p.value, [0, 0.25, 0.5, 0.72, 1], [1, 1.24, 0.86, 1.08, 1]) }, { scaleY: i(p.value, [0, 0.25, 0.5, 0.72, 1], [1, 0.72, 1.14, 0.94, 1]) }],
  }));
  const cifrao = useAnimatedStyle(() => ({ transform: [{ translateY: i(p.value, [0, 0.25, 0.5, 1], [0, -2.5, 1, 0]) * k }, { scale: i(p.value, [0, 0.25, 0.5], [1, 0.8, 1]) }] }));
  return (
    <>
      <Camada t={t} estilo={papel}><Path d="M6.5 3.5h11a1 1 0 0 1 1 1V20c-1 .8-2 .8-3 0s-2-.8-3 0-2 .8-3 0-2-.8-3 0V4.5a1 1 0 0 1 1-1z" {...traco(cor)} /></Camada>
      <Camada t={t} estilo={cifrao}><Path d="M14 8.4c-.4-.7-1.1-1-1.9-1-1 0-1.8.6-1.8 1.4 0 1.9 3.8 1 3.8 2.9 0 .8-.8 1.4-1.9 1.4-.9 0-1.6-.4-2-1.1M12.1 6.2v1.2M12.1 13.1v1.2" {...traco(cor)} /></Camada>
    </>
  );
}

function Exportar({ p, t, cor }: IP) {
  const k = t / 24;
  const seta = useAnimatedStyle(() => ({
    opacity: i(p.value, [0, 0.35, 0.36, 0.75], [1, 0, 0, 1]),
    transform: [{ translateY: i(p.value, [0, 0.35, 0.36, 0.75, 1], [0, -9, 9, -1, 0]) * k }],
  }));
  const caixa = useAnimatedStyle(() => ({
    transformOrigin: "bottom",
    transform: [{ scaleX: i(p.value, [0, 0.6, 0.75, 1], [1, 1, 1.1, 1]) }, { scaleY: i(p.value, [0, 0.6, 0.75, 1], [1, 1, 0.9, 1]) }],
  }));
  return (
    <>
      <Camada t={t} estilo={caixa}><Path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" {...traco(cor)} /></Camada>
      <Camada t={t} estilo={seta}><Path d="M12 15V3M7.5 7.5L12 3l4.5 4.5" {...traco(cor)} /></Camada>
    </>
  );
}

const ICONES: Record<NomeNav, (p: IP) => React.ReactElement> = {
  home: Casa, card: Cartao, goal: Meta, chart: Invest, ai: Brilho, layers: Camadas, person: Pessoa,
  eye: Olho, search: Lupa, plus: Mais, down: Baixo, exchange: Troca, import: Importar,
  sync: Sincronizar, receipt: Recibo, export: Exportar,
};

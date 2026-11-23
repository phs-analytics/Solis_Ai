import React, { forwardRef } from "react";
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from "react-native";
import type { TextInputProps, TextProps, TextStyle } from "react-native";
import Animated from "react-native-reanimated";
import { FAMILIA } from "../theme/fontes";

const J = FAMILIA.jakarta, I = FAMILIA.inter;

function peso(w: TextStyle["fontWeight"]): number {
  if (w === undefined || w === "normal") return 400;
  if (w === "bold") return 700;
  return parseInt(String(w), 10) || 400;
}

/**
 * Escolhe a família pelo peso e pelo papel do texto: títulos (>= 18 e peso >= 600) e valores com
 * algarismos tabulares usam Plus Jakarta Sans; o resto usa Inter. Tira o fontWeight, porque no Android
 * cada peso é uma família própria e o peso junto da família vira "negrito falso".
 * Quem já passa fontFamily (sem fontWeight) não é alterado.
 */
export function resolverFonte(style: TextProps["style"], entrada = false): TextStyle {
  const f = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  if (f.fontFamily && f.fontWeight === undefined) return f;
  const w = peso(f.fontWeight);
  const tabular = Array.isArray(f.fontVariant) && f.fontVariant.includes("tabular-nums");
  const tam = f.fontSize ?? 14;
  const titulo = !entrada && ((tam >= 18 && w >= 600) || (tabular && w >= 500));
  const fontFamily = titulo ? (w >= 700 ? J.bold : w >= 600 ? J.semibold : J.medium)
    : w >= 600 ? I.semibold : w >= 500 ? I.medium : I.regular;
  const apertado = titulo && tam >= 24
    ? { lineHeight: f.lineHeight ?? Math.round(tam * 1.12), letterSpacing: f.letterSpacing ?? tam * -0.03 } : {};
  return { ...f, fontFamily, fontWeight: undefined, ...apertado };
}

/** Substitui o Text do React Native: mesma API, com a tipografia do Solis. */
export const Texto = forwardRef<React.ComponentRef<typeof RNText>, TextProps>(function Texto({ style, ...resto }, ref) {
  return <RNText ref={ref} style={resolverFonte(style)} {...resto} />;
});

/** Substitui o TextInput do React Native. */
export const Entrada = forwardRef<React.ComponentRef<typeof RNTextInput>, TextInputProps>(function Entrada({ style, ...resto }, ref) {
  return <RNTextInput ref={ref} style={resolverFonte(style, true)} {...resto} />;
});

export const TextoAnimado = Animated.createAnimatedComponent(Texto);

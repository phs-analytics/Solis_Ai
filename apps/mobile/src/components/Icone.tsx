import React from "react";
import { Text, type TextStyle } from "react-native";

// Uicons by Flaticon (bold rounded), fonte embutida pelo plugin expo-font. Só os glifos usados.
const GLIFOS = {
  home: 63424, exchange: 62957, bullseye: 62217, sparkles: 64647, "chart-line-up": 62374,
  "menu-burger": 63787, check: 62409, "check-circle": 62405, "circle-small": 62495, bank: 61962,
  "piggy-bank": 64132, "money-bill-wave": 63847, list: 63692, "file-invoice": 63084, flask: 63137,
  "chart-pie": 62382, "triangle-warning": 65077, "party-horn": 64007,
  "angle-small-left": 61780, "angle-small-right": 61781,
  "cross-small": 62713, "credit-card": 62705, "shopping-cart": 64513, "arrow-small-up": 61855,
  "arrow-small-down": 61852, equals: 62948, coins: 62614, wallet: 65243, "plane-alt": 64143,
  lock: 63709, "shield-check": 64480, user: 65186, eye: 62971, "eye-crossed": 62968,
  search: 64448, clock: 62556, "arrow-trend-up": 61865, "arrow-trend-down": 61864, plus: 64177, minus: 63828,
  utensils: 65194, bus: 62224, capsules: 62295, book: 62088, gamepad: 63205, tshirt: 65109, box: 62134,
  "sack-dollar": 64391, laptop: 63607, "mobile-notch": 63832, "house-chimney": 63453, "car-side": 62309,
  "graduation-cap": 63254, gift: 63227, heart: 63399, star: 64747, "arrows-repeat": 61892, "arrow-up-right": 61876, "arrow-down-left": 61834,
} as const;

export type NomeIcone = keyof typeof GLIFOS;

export function Icone({ nome, tamanho = 20, cor, style }: { nome: NomeIcone; tamanho?: number; cor: string; style?: TextStyle }) {
  return (
    <Text
      style={[{ fontFamily: "uicons-bold-rounded", fontSize: tamanho, lineHeight: tamanho * 1.15, color: cor }, style]}
      accessible={false}
      importantForAccessibility="no"
    >
      {String.fromCodePoint(GLIFOS[nome])}
    </Text>
  );
}

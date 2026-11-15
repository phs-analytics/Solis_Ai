import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTema } from "../theme";

type Props = {
  children: React.ReactNode;
  /** Remove o padding superior (ex: telas com header colorido) */
  semPaddingTopo?: boolean;
};

export function SafeScreen({ children, semPaddingTopo = false }: Props) {
  const tema = useTema();
  return (
    <SafeAreaView
      style={[s.flex, { backgroundColor: tema.cores.fundo }]}
      edges={semPaddingTopo ? ["bottom", "left", "right"] : ["top", "bottom", "left", "right"]}
    >
      <StatusBar style={tema.dark ? "light" : "dark"} />
      <View style={[s.flex, { backgroundColor: tema.cores.fundo }]}>{children}</View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({ flex: { flex: 1 } });

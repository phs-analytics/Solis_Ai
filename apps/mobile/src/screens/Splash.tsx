import React, { useEffect } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParams } from "../navigation";

type Props = NativeStackScreenProps<RootStackParams, "Splash">;

export function Splash({ navigation }: Props) {
  return (
    <SafeAreaView style={s.fundo} edges={["top", "bottom", "left", "right"]}>
      <StatusBar style="light" />

      <View style={s.conteudo}>
        {/* Logo */}
        <View style={s.logoArea} accessibilityRole="image" accessibilityLabel="Solis">
          <View style={s.logoCirculo}>
            <Text style={s.logoLetra}>S</Text>
          </View>
          <Text style={s.logoNome}>Solis</Text>
        </View>

        {/* Tagline */}
        <Text style={s.tagline}>Suas finanças,{"\n"}no seu bolso.</Text>
      </View>

      <View style={s.rodape}>
        <Pressable
          style={s.botaoPrimario}
          onPress={() => navigation.replace("App")}
          accessibilityRole="button"
          accessibilityLabel="Começar a usar o Solis"
        >
          <Text style={s.botaoPrimarioTexto}>Começar</Text>
        </Pressable>

        <Pressable
          style={s.botaoSecundario}
          onPress={() => navigation.replace("App")}
          accessibilityRole="button"
          accessibilityLabel="Já tenho acesso"
        >
          <Text style={s.botaoSecundarioTexto}>Já tenho acesso</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const VERDE = "#2ECC71";
const VERDE_ESCURO = "#1A6B4A";

const s = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  conteudo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCirculo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: VERDE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoLetra: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0A1628",
  },
  logoNome: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  rodape: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  botaoPrimario: {
    backgroundColor: VERDE,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
  },
  botaoPrimarioTexto: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0A1628",
  },
  botaoSecundario: {
    paddingVertical: 14,
    alignItems: "center",
  },
  botaoSecundarioTexto: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
});

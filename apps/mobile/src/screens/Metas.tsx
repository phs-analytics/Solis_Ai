import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";

export function Metas() {
  const tema = useTema();
  const c = tema.cores;
  return (
    <SafeScreen>
      <View style={s.centro}>
        <Text style={[tema.font.titulo, { color: c.texto, marginBottom: 8 }]}>Metas</Text>
        <Text style={[tema.font.corpo, { color: c.textoSuave, textAlign: "center" }]}>
          Cofrinhos, orçamentos e metas na Etapa 4
        </Text>
      </View>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
});

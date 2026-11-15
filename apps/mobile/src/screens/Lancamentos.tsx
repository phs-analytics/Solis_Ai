import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";

export function Lancamentos() {
  const tema = useTema();
  const c = tema.cores;
  return (
    <SafeScreen>
      <View style={s.centro}>
        <Text style={[tema.font.titulo, { color: c.texto, marginBottom: 8 }]}>Lançamentos</Text>
        <Text style={[tema.font.corpo, { color: c.textoSuave, textAlign: "center" }]}>
          CRUD de lançamentos e categorias na Etapa 3
        </Text>
      </View>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
});

import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";

type Item = { label: string; desc: string };

const ITENS: Item[] = [
  { label: "Configurar acesso", desc: "Senha mestra e biometria" },
  { label: "Exportar backup", desc: "Salvar cópia cifrada dos seus dados" },
  { label: "Privacidade e termos", desc: "LGPD, política e termos de uso" },
  { label: "Sobre o Solis", desc: "Versão, licenças, código aberto" },
];

export function Mais() {
  const tema = useTema();
  const c = tema.cores;

  return (
    <SafeScreen>
      <View style={[s.cabecalho, { paddingHorizontal: tema.spacing.lg }]}>
        <Text style={[tema.font.titulo, { color: c.texto }]}>Mais</Text>
      </View>

      <View style={{ paddingHorizontal: tema.spacing.lg, gap: 2 }}>
        {ITENS.map((item) => (
          <Pressable
            key={item.label}
            style={[s.linha, { backgroundColor: c.superficie, borderBottomColor: c.borda }]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={item.desc}
          >
            <View>
              <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "600" }]}>
                {item.label}
              </Text>
              <Text style={[tema.font.legenda, { color: c.textoSuave, marginTop: 2 }]}>
                {item.desc}
              </Text>
            </View>
            <Text style={{ color: c.textoSuave, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </View>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  cabecalho: { paddingTop: 16, paddingBottom: 12 },
  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

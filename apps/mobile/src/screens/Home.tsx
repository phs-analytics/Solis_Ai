import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";
import { saudacao } from "@solis/core";

export function Home() {
  const tema = useTema();
  const c = tema.cores;

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingHorizontal: tema.spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={s.cabecalho}>
          <Text style={[tema.font.corpo, { color: c.textoSuave }]}>
            {saudacao(new Date().getHours())}
          </Text>
          <View
            style={[s.avatar, { backgroundColor: c.primarioSuave }]}
            accessibilityRole="button"
            accessibilityLabel="Perfil"
          >
            <Text style={{ color: c.primario, fontWeight: "700" }}>P</Text>
          </View>
        </View>

        {/* Saldo */}
        <View style={[s.cardSaldo, { backgroundColor: c.superficie }]}>
          <Text style={[tema.font.legenda, { color: c.textoSuave, marginBottom: 4 }]}>
            Saldo total
          </Text>
          <Text style={[tema.font.saldo, { color: c.texto }]}>R$ 0,00</Text>
          <View style={[s.graficoCasca, { backgroundColor: c.primarioSuave }]}>
            <Text style={[tema.font.legenda, { color: c.textoSuave, textAlign: "center" }]}>
              Gráfico disponível na Etapa 3
            </Text>
          </View>
        </View>

        {/* Contas */}
        <Text style={[tema.font.titulo, { color: c.texto, marginTop: tema.spacing.lg, marginBottom: tema.spacing.sm }]}>
          Contas
        </Text>
        <View style={[s.cardVazio, { backgroundColor: c.superficie, borderColor: c.borda }]}>
          <Text style={[tema.font.corpo, { color: c.textoSuave, textAlign: "center" }]}>
            Adicione sua primeira conta na Etapa 3
          </Text>
        </View>

        {/* Últimos lançamentos */}
        <Text style={[tema.font.titulo, { color: c.texto, marginTop: tema.spacing.lg, marginBottom: tema.spacing.sm }]}>
          Últimos lançamentos
        </Text>
        <View style={[s.cardVazio, { backgroundColor: c.superficie, borderColor: c.borda }]}>
          <Text style={[tema.font.corpo, { color: c.textoSuave, textAlign: "center" }]}>
            Seus lançamentos aparecerão aqui
          </Text>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop: 16, paddingBottom: 32 },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardSaldo: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  graficoCasca: {
    marginTop: 16,
    height: 80,
    borderRadius: 8,
    justifyContent: "center",
  },
  cardVazio: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
});

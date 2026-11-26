import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useBanco } from "../../contexto/BancoContext";
import { criarMeta } from "@solis/dados";
import { auxiliares, corBanco, tipo, useTema } from "../../theme";
import { parseDinheiro } from "../../utils/dinheiro";
import { Texto as Text, Entrada as TextInput } from "../Texto";

const ICONES = [
  { key: "cofrinho", emoji: "🐷", label: "Cofrinho" },
  { key: "viagem", emoji: "✈️", label: "Viagem" },
  { key: "emergencia", emoji: "🛡️", label: "Reserva" },
  { key: "celular", emoji: "📱", label: "Celular" },
  { key: "casa", emoji: "🏠", label: "Casa" },
  { key: "carro", emoji: "🚗", label: "Carro" },
  { key: "estudo", emoji: "📚", label: "Estudos" },
  { key: "presente", emoji: "🎁", label: "Presente" },
  { key: "saude", emoji: "❤️", label: "Saúde" },
  { key: "outros", emoji: "⭐", label: "Outros" },
];

const CORES = ["#9B3DD1", "#F26A1B", "#1F5FAD", "#11A85F", "#FFB162", "#A35139", "#E0344F", "#3A4B5F"];

export function NovaMetaModal({ visivel, aoFechar, aoSalvar }: { visivel: boolean; aoFechar: () => void; aoSalvar: () => void }) {
  const c = useTema().cores;
  const banco = useBanco();
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("cofrinho");
  const [cor, setCor] = useState(CORES[0]!);
  const [alvo, setAlvo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [bancNome, setBancNome] = useState("");

  async function salvar() {
    if (!nome.trim()) { Alert.alert("Digite o nome da meta"); return; }
    const alvoCentavos = parseDinheiro(alvo) ?? 0;
    if (alvoCentavos <= 0) { Alert.alert("Valor alvo inválido"); return; }
    await criarMeta(banco, {
      nome: nome.trim(), icone, cor, bancNome: bancNome.trim() || null,
      descricao: null, alvoCentavos, prazo: prazo.trim() || null,
    });
    setNome(""); setAlvo(""); setPrazo(""); setBancNome(""); setIcone("cofrinho"); setCor(CORES[0]!);
    aoSalvar();
  }

  return (
    <Modal visible={visivel} animationType="slide" presentationStyle="pageSheet" onRequestClose={aoFechar}>
      <View style={[s.container, { backgroundColor: c.fundo }]}>
        <View style={s.alca} />
        <View style={s.headerMod}>
          <Pressable onPress={aoFechar} accessibilityLabel="Fechar">
            <Text style={{ ...tipo.corpo(15), color: c.textoSuave }}>Cancelar</Text>
          </Pressable>
          <Text style={{ ...tipo.corpo(16, "semibold"), color: c.texto }}>Nova meta</Text>
          <Pressable onPress={salvar} accessibilityRole="button" accessibilityLabel="Criar meta">
            <Text style={{ ...tipo.corpo(15, "semibold"), color: c.primario }}>Criar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, gap: 20 }} showsVerticalScrollIndicator={false}>
          {/* Nome */}
          <View style={s.grupo}>
            <Text style={[s.rotulo, { color: c.textoSuave }]}>Nome da meta</Text>
            <TextInput style={[s.input, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }]}
              placeholder="Ex: Viagem para a praia" placeholderTextColor={c.textoSuave}
              value={nome} onChangeText={setNome} />
          </View>

          {/* Banco (opcional) */}
          <View style={s.grupo}>
            <Text style={[s.rotulo, { color: c.textoSuave }]}>Banco / Cofrinho (opcional)</Text>
            <TextInput style={[s.input, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }]}
              placeholder="Ex: Nubank, Inter…" placeholderTextColor={c.textoSuave}
              value={bancNome} onChangeText={(t) => { setBancNome(t); if (t.trim()) setCor(corBanco(t)); }} />
          </View>

          {/* Ícone */}
          <View style={s.grupo}>
            <Text style={[s.rotulo, { color: c.textoSuave }]}>Ícone</Text>
            <View style={s.gradeIcones}>
              {ICONES.map((ic) => (
                <Pressable key={ic.key} onPress={() => setIcone(ic.key)} accessibilityRole="radio" accessibilityState={{ checked: icone === ic.key }}
                  style={[s.iconeItem, icone === ic.key && { backgroundColor: `${cor}33`, borderColor: cor, borderWidth: 2 }, { backgroundColor: c.superficie }]}>
                  <Text style={{ fontSize: 22 }}>{ic.emoji}</Text>
                  <Text style={{ ...tipo.corpo(10), color: c.textoSuave }}>{ic.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Cor */}
          <View style={s.grupo}>
            <Text style={[s.rotulo, { color: c.textoSuave }]}>Cor</Text>
            <View style={s.gradeCores}>
              {CORES.map((co) => (
                <Pressable key={co} onPress={() => setCor(co)} accessibilityRole="radio" accessibilityState={{ checked: cor === co }}
                  style={[s.bolaCorWrap, cor === co && { borderColor: co, borderWidth: 3 }]}>
                  <View style={[s.bolaCor, { backgroundColor: co }]} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Valor alvo */}
          <View style={s.grupo}>
            <Text style={[s.rotulo, { color: c.textoSuave }]}>Valor que quer alcançar (R$)</Text>
            <TextInput style={[s.input, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }]}
              placeholder="R$ 0,00" placeholderTextColor={c.textoSuave} keyboardType="decimal-pad"
              value={alvo} onChangeText={setAlvo} />
          </View>

          {/* Prazo */}
          <View style={s.grupo}>
            <Text style={[s.rotulo, { color: c.textoSuave }]}>Data prevista (opcional, AAAA-MM)</Text>
            <TextInput style={[s.input, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }]}
              placeholder="Ex: 2026-12" placeholderTextColor={c.textoSuave}
              value={prazo} onChangeText={setPrazo} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  alca: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#C9C1B1", alignSelf: "center", marginBottom: 16 },
  headerMod: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 20 },
  grupo: { gap: 8 },
  rotulo: { ...tipo.corpo(12, "semibold"), letterSpacing: 0.4, textTransform: "uppercase" as const },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  gradeIcones: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconeItem: { width: 68, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 10, gap: 4, borderWidth: 2, borderColor: "transparent" },
  gradeCores: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  bolaCorWrap: { borderRadius: 20, padding: 2, borderWidth: 3, borderColor: "transparent" },
  bolaCor: { width: 32, height: 32, borderRadius: 16 },
});

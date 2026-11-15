import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, FlatList, Pressable, Alert, TextInput } from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";
import { listarMetas, criarMeta, depositar, excluirMeta } from "@solis/dados";
import type { Meta } from "@solis/dados";
import { formatarDinheiro, parseDinheiro } from "../utils/dinheiro";

export function Metas() {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();

  const [metas, setMetas] = useState<Meta[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState("");
  const [alvo, setAlvo] = useState("");
  const [prazo, setPrazo] = useState("");

  const carregar = useCallback(async () => {
    setMetas(await listarMetas(banco));
  }, [banco]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarMeta() {
    if (!nome.trim()) return;
    const alvoCentavos = parseDinheiro(alvo) ?? 0;
    if (alvoCentavos <= 0) { Alert.alert("Valor inválido"); return; }
    await criarMeta(banco, { nome: nome.trim(), icone: "🎯", alvoCentavos, prazo: prazo || null });
    setNome(""); setAlvo(""); setPrazo(""); setMostrarForm(false);
    carregar();
  }

  async function depositar_(id: string) {
    Alert.prompt("Depositar", "Valor (R$):", async (valor) => {
      const centavos = parseDinheiro(valor ?? "");
      if (!centavos || centavos <= 0) return;
      await depositar(banco, id, centavos);
      carregar();
    });
  }

  async function excluir(id: string) {
    Alert.alert("Excluir meta", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => { await excluirMeta(banco, id); carregar(); } },
    ]);
  }

  return (
    <SafeScreen>
      <View style={[s.cabecalho, { paddingHorizontal: tema.spacing.lg }]}>
        <Text style={[tema.font.titulo, { color: c.texto }]}>Metas e cofrinhos</Text>
        <Pressable style={[s.botaoNovo, { backgroundColor: c.primario }]}
          onPress={() => setMostrarForm(!mostrarForm)}
          accessibilityRole="button" accessibilityLabel="Nova meta">
          <Text style={{ color: "#fff", fontSize: 20, lineHeight: 24 }}>{mostrarForm ? "×" : "+"}</Text>
        </Pressable>
      </View>

      {mostrarForm && (
        <View style={[s.form, { backgroundColor: c.superficie, marginHorizontal: tema.spacing.lg, borderColor: c.borda }]}>
          <TextInput style={[s.input, { backgroundColor: c.fundo, color: c.texto, borderColor: c.borda }]}
            placeholder="Nome da meta" placeholderTextColor={c.textoSuave}
            value={nome} onChangeText={setNome} accessibilityLabel="Nome da meta" />
          <TextInput style={[s.input, { backgroundColor: c.fundo, color: c.texto, borderColor: c.borda }]}
            placeholder="Alvo (R$)" placeholderTextColor={c.textoSuave} keyboardType="decimal-pad"
            value={alvo} onChangeText={setAlvo} accessibilityLabel="Valor alvo" />
          <TextInput style={[s.input, { backgroundColor: c.fundo, color: c.texto, borderColor: c.borda }]}
            placeholder="Prazo (AAAA-MM-DD, opcional)" placeholderTextColor={c.textoSuave}
            value={prazo} onChangeText={setPrazo} accessibilityLabel="Prazo" />
          <Pressable style={[s.botaoSalvar, { backgroundColor: c.primario }]} onPress={salvarMeta}
            accessibilityRole="button" accessibilityLabel="Criar meta">
            <Text style={{ color: "#fff", fontWeight: "700" }}>Criar</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={metas}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: tema.spacing.lg, paddingTop: 8, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.vazio}>
            <Text style={[tema.font.corpo, { color: c.textoSuave, textAlign: "center" }]}>
              Nenhuma meta ainda{"\n"}Crie seu primeiro cofrinho!
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const pct = item.alvoCentavos > 0 ? Math.min(1, item.atualCentavos / item.alvoCentavos) : 0;
          return (
            <View style={[s.card, { backgroundColor: c.superficie }]}>
              <View style={s.cardTopo}>
                <Text style={{ fontSize: 24 }}>{item.icone ?? "🎯"}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "600" }]}>{item.nome}</Text>
                  <Text style={[tema.font.legenda, { color: c.textoSuave }]}>
                    {formatarDinheiro(item.atualCentavos)} de {formatarDinheiro(item.alvoCentavos)}
                    {item.prazo ? ` · até ${item.prazo}` : ""}
                  </Text>
                </View>
                {item.concluida && <Text style={{ fontSize: 18 }}>✅</Text>}
              </View>
              {/* Barra de progresso */}
              <View style={[s.barraFundo, { backgroundColor: c.primarioSuave }]}>
                <View style={[s.barraProgresso, { backgroundColor: c.primario, width: `${Math.round(pct * 100)}%` as `${number}%` }]} />
              </View>
              {!item.concluida && (
                <View style={s.acoes}>
                  <Pressable onPress={() => depositar_(item.id)} accessibilityRole="button" accessibilityLabel="Depositar">
                    <Text style={[tema.font.legenda, { color: c.primario, fontWeight: "700" }]}>+ Depositar</Text>
                  </Pressable>
                  <Pressable onPress={() => excluir(item.id)} accessibilityRole="button" accessibilityLabel="Excluir meta">
                    <Text style={[tema.font.legenda, { color: c.erro }]}>Excluir</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  cabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, paddingBottom: 12 },
  botaoNovo: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  form: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, gap: 8 },
  input: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  botaoSalvar: { borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  vazio: { paddingTop: 48, alignItems: "center" },
  card: { borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardTopo: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  barraFundo: { height: 6, borderRadius: 3, overflow: "hidden" },
  barraProgresso: { height: 6, borderRadius: 3 },
  acoes: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
});

import React, { useState } from "react";
import { StyleSheet, View, Pressable, Alert, ScrollView } from "react-native";
import { Texto as Text, Entrada as TextInput } from "../components/Texto";
import { SafeScreen } from "../components/SafeScreen";
import { Icone, type NomeIcone } from "../components/Icone";
import { useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";
import { criarConta } from "@solis/dados";
import type { TipoConta } from "@solis/dados";
import { parseDinheiro } from "../utils/dinheiro";

const TIPOS: { label: string; valor: TipoConta; icone: NomeIcone }[] = [
  { label: "Corrente", valor: "corrente", icone: "bank" },
  { label: "Poupança", valor: "poupanca", icone: "piggy-bank" },
  { label: "Dinheiro", valor: "dinheiro", icone: "money-bill-wave" },
  { label: "Outro", valor: "outro", icone: "list" },
];

export function NovaConta({ onSalvo }: { onSalvo?: () => void }) {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoConta>("corrente");
  const [saldoInicial, setSaldoInicial] = useState("0");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) {
      Alert.alert("Nome obrigatório", "Digite um nome para a conta.");
      return;
    }
    const centavos = parseDinheiro(saldoInicial) ?? 0;
    setSalvando(true);
    try {
      await criarConta(banco, { nome: nome.trim(), tipo, saldoInicialCentavos: centavos, moeda: "BRL" });
      onSalvo?.();
    } catch {
      Alert.alert("Erro", "Não foi possível criar a conta.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={[s.scroll, { paddingHorizontal: tema.spacing.lg }]}>
        <Text style={[tema.font.titulo, { color: c.texto, marginBottom: 20 }]}>Nova conta</Text>

        <Text style={[s.rotulo, { color: c.textoSuave }]}>Nome da conta</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }]}
          placeholder="Ex: Nubank, Carteira…"
          placeholderTextColor={c.textoSuave}
          value={nome}
          onChangeText={setNome}
          accessibilityLabel="Nome da conta"
        />

        <Text style={[s.rotulo, { color: c.textoSuave }]}>Tipo</Text>
        <View style={s.row}>
          {TIPOS.map((t) => (
            <Pressable key={t.valor}
              style={[s.chip, { borderColor: c.borda, backgroundColor: tipo === t.valor ? c.primario : c.superficie }]}
              onPress={() => setTipo(t.valor)}
              accessibilityRole="radio" accessibilityState={{ checked: tipo === t.valor }}>
              <Icone nome={t.icone} tamanho={14} cor={tipo === t.valor ? c.sobrePrimario : c.textoSuave} />
              <Text style={{ color: tipo === t.valor ? c.sobrePrimario : c.textoSuave, fontWeight: "600" }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.rotulo, { color: c.textoSuave }]}>Saldo inicial (R$)</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }]}
          placeholder="0,00"
          placeholderTextColor={c.textoSuave}
          keyboardType="decimal-pad"
          value={saldoInicial}
          onChangeText={setSaldoInicial}
          accessibilityLabel="Saldo inicial da conta"
        />

        <Pressable
          style={[s.botao, { backgroundColor: salvando ? c.textoSuave : c.primario, marginTop: 32 }]}
          onPress={salvar}
          disabled={salvando}
          accessibilityRole="button"
          accessibilityLabel="Criar conta"
        >
          <Text style={{ color: c.sobrePrimario, fontWeight: "700", fontSize: 16 }}>
            {salvando ? "Criando…" : "Criar conta"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop: 16, paddingBottom: 48 },
  rotulo: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 16 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  botao: { borderRadius: 50, paddingVertical: 16, alignItems: "center" },
});

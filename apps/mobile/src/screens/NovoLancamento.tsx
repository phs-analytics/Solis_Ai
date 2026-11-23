import React, { useEffect, useState } from "react";
import { StyleSheet, View, Pressable, ScrollView, Switch, Alert } from "react-native";
import { Texto as Text, Entrada as TextInput } from "../components/Texto";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";
import { criarLancamento, listarContas, listarCategorias, garantirCategoriasPadrao } from "@solis/dados";
import type { Conta, Categoria, TipoLancamento } from "@solis/dados";
import { parseDinheiro } from "../utils/dinheiro";

type Tipo = TipoLancamento;

export function NovoLancamento({ onSalvo }: { onSalvo?: () => void }) {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();

  const [tipo, setTipo] = useState<Tipo>("despesa");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [contaId, setContaId] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      await garantirCategoriasPadrao(banco);
      const [cs, cats] = await Promise.all([listarContas(banco), listarCategorias(banco, tipo)]);
      setContas(cs);
      setCategorias(cats);
      if (cs.length > 0 && !contaId) setContaId(cs[0].id);
    })();
  }, [banco, tipo]);

  async function salvar() {
    const centavos = parseDinheiro(valor);
    if (!centavos || centavos <= 0) {
      Alert.alert("Valor inválido", "Digite um valor maior que zero.");
      return;
    }
    if (!contaId) {
      Alert.alert("Conta", "Selecione uma conta.");
      return;
    }
    setSalvando(true);
    try {
      const valorFinal = tipo === "despesa" ? -Math.abs(centavos) : Math.abs(centavos);
      await criarLancamento(banco, {
        contaId, valorCentavos: valorFinal, descricao, categoriaId, data, tipo, recorrente: false,
      });
      onSalvo?.();
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar o lançamento.");
    } finally {
      setSalvando(false);
    }
  }

  const TIPOS: { label: string; valor: Tipo }[] = [
    { label: "Despesa", valor: "despesa" },
    { label: "Receita", valor: "receita" },
    { label: "Transferência", valor: "transferencia" },
  ];

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={[s.scroll, { paddingHorizontal: tema.spacing.lg }]}>
        <Text style={[tema.font.titulo, { color: c.texto, marginBottom: 20 }]}>Novo lançamento</Text>

        {/* Tipo */}
        <Text style={[s.rotulo, { color: c.textoSuave }]}>Tipo</Text>
        <View style={s.row}>
          {TIPOS.map((t) => (
            <Pressable key={t.valor}
              style={[s.chip, { borderColor: c.borda, backgroundColor: tipo === t.valor ? c.primario : c.superficie }]}
              onPress={() => setTipo(t.valor)}
              accessibilityRole="radio" accessibilityState={{ checked: tipo === t.valor }}>
              <Text style={{ color: tipo === t.valor ? c.sobrePrimario : c.textoSuave, fontWeight: "600", fontSize: 13 }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Valor */}
        <Text style={[s.rotulo, { color: c.textoSuave }]}>Valor (R$)</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }]}
          placeholder="0,00"
          placeholderTextColor={c.textoSuave}
          keyboardType="decimal-pad"
          value={valor}
          onChangeText={setValor}
          accessibilityLabel="Valor do lançamento"
        />

        {/* Descrição */}
        <Text style={[s.rotulo, { color: c.textoSuave }]}>Descrição</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }]}
          placeholder="Ex: Mercado, Salário…"
          placeholderTextColor={c.textoSuave}
          value={descricao}
          onChangeText={setDescricao}
          accessibilityLabel="Descrição do lançamento"
        />

        {/* Data */}
        <Text style={[s.rotulo, { color: c.textoSuave }]}>Data (AAAA-MM-DD)</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }]}
          placeholder="2026-11-15"
          placeholderTextColor={c.textoSuave}
          value={data}
          onChangeText={setData}
          accessibilityLabel="Data do lançamento"
        />

        {/* Conta */}
        <Text style={[s.rotulo, { color: c.textoSuave }]}>Conta</Text>
        <View style={s.row}>
          {contas.map((ct) => (
            <Pressable key={ct.id}
              style={[s.chip, { borderColor: c.borda, backgroundColor: contaId === ct.id ? c.primario : c.superficie }]}
              onPress={() => setContaId(ct.id)}
              accessibilityRole="radio" accessibilityState={{ checked: contaId === ct.id }}>
              <Text style={{ color: contaId === ct.id ? c.sobrePrimario : c.textoSuave, fontWeight: "600", fontSize: 13 }}>
                {ct.nome}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Categoria */}
        <Text style={[s.rotulo, { color: c.textoSuave }]}>Categoria</Text>
        <View style={[s.row, { flexWrap: "wrap" }]}>
          {categorias.map((cat) => (
            <Pressable key={cat.id}
              style={[s.chip, { borderColor: c.borda, backgroundColor: categoriaId === cat.id ? c.primario : c.superficie }]}
              onPress={() => setCategoriaId(cat.id)}
              accessibilityRole="radio" accessibilityState={{ checked: categoriaId === cat.id }}>
              <Text style={{ color: categoriaId === cat.id ? c.sobrePrimario : c.textoSuave, fontSize: 13 }}>
                {cat.icone} {cat.nome}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Salvar */}
        <Pressable
          style={[s.botao, { backgroundColor: salvando ? c.textoSuave : c.primario, marginTop: 24 }]}
          onPress={salvar}
          disabled={salvando}
          accessibilityRole="button"
          accessibilityLabel="Salvar lançamento"
        >
          <Text style={{ color: c.sobrePrimario, fontWeight: "700", fontSize: 16 }}>
            {salvando ? "Salvando…" : "Salvar"}
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
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, borderWidth: 1 },
  botao: { borderRadius: 50, paddingVertical: 16, alignItems: "center" },
});

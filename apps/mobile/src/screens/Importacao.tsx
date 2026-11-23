import React, { useState } from "react";
import { StyleSheet, View, Pressable, ScrollView, Alert } from "react-native";
import { Texto as Text } from "../components/Texto";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import { SafeScreen } from "../components/SafeScreen";
import { Icone } from "../components/Icone";
import { useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";
import { parseOFX, parseCSV, hashLancamento, filtrarDuplicatas } from "@solis/core";
import { listarContas, criarLancamento, listarLancamentos } from "@solis/dados";
import type { Conta } from "@solis/dados";
import { formatarDinheiro } from "../utils/dinheiro";

type Etapa = "selecionar" | "preview" | "concluido";

type LancamentoPreview = {
  hash: string;
  data: string;
  valorCentavos: number;
  descricao: string;
  duplicado: boolean;
};

export function Importacao() {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();

  const [etapa, setEtapa] = useState<Etapa>("selecionar");
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState<string | null>(null);
  const [preview, setPreview] = useState<LancamentoPreview[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [importados, setImportados] = useState(0);

  async function carregarContas() {
    const cs = await listarContas(banco);
    setContas(cs);
    if (cs.length > 0 && !contaId) setContaId(cs[0]!.id);
  }

  async function selecionarArquivo(tipo: "ofx" | "csv") {
    const escolha = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (escolha.canceled || !escolha.assets[0]) return;
    const uri = escolha.assets[0].uri;
    try {
      // shortcut: lê como UTF-8; extratos em Latin-1 podem trocar acentos — tratar se aparecer em aparelho real
      const texto = await FileSystem.readAsStringAsync(uri);
      await processar(texto, tipo);
    } catch {
      Alert.alert("Não deu para ler o arquivo", `Confira se é um arquivo ${tipo.toUpperCase()} do seu banco.`);
    } finally {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }

  async function usarExemplo() {
    await processar(`Data;Histórico;Valor\n15/11/2026;Mercado;-120,00\n15/11/2026;Salário;3000,00`, "csv");
  }

  async function processar(texto: string, tipo: "ofx" | "csv") {
    await carregarContas();
    const resultado = tipo === "ofx" ? { ...parseOFX(texto), avisos: [] as string[] } : parseCSV(texto);
    if (resultado.lancamentos.length === 0) resultado.avisos.push("Nenhum lançamento encontrado no arquivo.");
    setAvisos(resultado.avisos);

    const existentes = await listarLancamentos(banco);
    const hashesExistentes = new Set(
      existentes.map((l) => hashLancamento(l.data, l.valorCentavos, l.descricao))
    );

    const candidatos = resultado.lancamentos.map((l) => ({
      hash: hashLancamento(l.data, l.valorCentavos, l.descricao),
      data: l.data,
      valorCentavos: l.valorCentavos,
      descricao: l.descricao,
    }));
    const { novos, duplicados } = filtrarDuplicatas(candidatos, hashesExistentes);
    const dupHashes = new Set(duplicados.map((d) => d.hash));
    setPreview(candidatos.map((c) => ({ ...c, duplicado: dupHashes.has(c.hash) })));
    setEtapa("preview");
  }

  async function confirmarImportacao() {
    if (!contaId) { Alert.alert("Selecione uma conta"); return; }
    const novos = preview.filter((l) => !l.duplicado);
    for (const l of novos) {
      await criarLancamento(banco, {
        contaId, valorCentavos: l.valorCentavos, descricao: l.descricao,
        categoriaId: null, data: l.data,
        tipo: l.valorCentavos >= 0 ? "receita" : "despesa", recorrente: false,
      });
    }
    setImportados(novos.length);
    setEtapa("concluido");
  }

  if (etapa === "concluido") {
    return (
      <SafeScreen>
        <View style={s.centro}>
          <Icone nome="check-circle" tamanho={48} cor={c.sucesso} />
          <Text style={[tema.font.titulo, { color: c.texto, marginTop: 16 }]}>
            {importados} lançamento{importados !== 1 ? "s" : ""} importado{importados !== 1 ? "s" : ""}
          </Text>
          <Pressable style={[s.botao, { backgroundColor: c.primario, marginTop: 24 }]}
            onPress={() => { setEtapa("selecionar"); setPreview([]); }}
            accessibilityRole="button" accessibilityLabel="Importar outro arquivo">
            <Text style={{ color: c.sobrePrimario, fontWeight: "700" }}>Importar outro</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  if (etapa === "preview") {
    const novos = preview.filter((l) => !l.duplicado);
    const dups = preview.filter((l) => l.duplicado);
    return (
      <SafeScreen>
        <ScrollView contentContainerStyle={[s.scroll, { paddingHorizontal: tema.spacing.lg }]}>
          <Text style={[tema.font.titulo, { color: c.texto, marginBottom: 4 }]}>Prévia da importação</Text>
          <Text style={[tema.font.legenda, { color: c.textoSuave, marginBottom: 16 }]}>
            {novos.length} novo{novos.length !== 1 ? "s" : ""} · {dups.length} duplicado{dups.length !== 1 ? "s" : ""} (serão ignorados)
          </Text>

          {avisos.map((a, i) => (
            <View key={i} style={[s.aviso, { backgroundColor: c.primarioSuave }]}>
              <Text style={[tema.font.legenda, { color: c.aviso }]}>{a}</Text>
            </View>
          ))}

          {/* Conta de destino */}
          <Text style={[s.rotulo, { color: c.textoSuave }]}>Conta de destino</Text>
          <View style={s.row}>
            {contas.map((ct) => (
              <Pressable key={ct.id}
                style={[s.chip, { borderColor: c.borda, backgroundColor: contaId === ct.id ? c.primario : c.superficie }]}
                onPress={() => setContaId(ct.id)}
                accessibilityRole="radio" accessibilityState={{ checked: contaId === ct.id }}>
                <Text style={{ color: contaId === ct.id ? c.sobrePrimario : c.textoSuave, fontWeight: "600", fontSize: 13 }}>{ct.nome}</Text>
              </Pressable>
            ))}
          </View>

          {preview.map((l, i) => (
            <View key={i} style={[s.linha, { borderBottomColor: c.borda, opacity: l.duplicado ? 0.4 : 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[tema.font.corpo, { color: c.texto }]} numberOfLines={1}>{l.descricao}</Text>
                <Text style={[tema.font.legenda, { color: c.textoSuave }]}>
                  {l.data}{l.duplicado ? " · duplicado" : ""}
                </Text>
              </View>
              <Text style={[tema.font.corpo, { color: l.valorCentavos >= 0 ? c.sucesso : c.erro, fontWeight: "700" }]}>
                {l.valorCentavos >= 0 ? "+" : ""}{formatarDinheiro(l.valorCentavos)}
              </Text>
            </View>
          ))}

          <Pressable style={[s.botao, { backgroundColor: c.primario, marginTop: 24 }]}
            onPress={confirmarImportacao} accessibilityRole="button" accessibilityLabel="Confirmar importação">
            <Text style={{ color: c.sobrePrimario, fontWeight: "700", fontSize: 16 }}>Importar {novos.length} lançamento{novos.length !== 1 ? "s" : ""}</Text>
          </Pressable>
          <Pressable style={[s.botao, { backgroundColor: c.superficie, marginTop: 10 }]}
            onPress={() => setEtapa("selecionar")} accessibilityRole="button" accessibilityLabel="Cancelar">
            <Text style={{ color: c.textoSuave, fontWeight: "600" }}>Cancelar</Text>
          </Pressable>
        </ScrollView>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={[s.scroll, { paddingHorizontal: tema.spacing.lg }]}>
        <Text style={[tema.font.titulo, { color: c.texto, marginBottom: 8 }]}>Importar extrato</Text>
        <Text style={[tema.font.corpo, { color: c.textoSuave, marginBottom: 32 }]}>
          Suporta arquivos OFX (extrato do banco) e CSV (planilha).
        </Text>

        <Pressable style={[s.opcao, { backgroundColor: c.superficie, borderColor: c.borda }]}
          onPress={() => selecionarArquivo("ofx")} accessibilityRole="button" accessibilityLabel="Importar OFX">
          <View style={[s.selo, { backgroundColor: c.primarioSuave }]}><Icone nome="bank" cor={c.primario} /></View>
          <View style={{ marginLeft: 16 }}>
            <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "700" }]}>Arquivo OFX / QFX</Text>
            <Text style={[tema.font.legenda, { color: c.textoSuave }]}>Formato padrão dos bancos brasileiros</Text>
          </View>
        </Pressable>

        <Pressable style={[s.opcao, { backgroundColor: c.superficie, borderColor: c.borda }]}
          onPress={() => selecionarArquivo("csv")} accessibilityRole="button" accessibilityLabel="Importar CSV">
          <View style={[s.selo, { backgroundColor: c.primarioSuave }]}><Icone nome="file-invoice" cor={c.primario} /></View>
          <View style={{ marginLeft: 16 }}>
            <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "700" }]}>Planilha CSV</Text>
            <Text style={[tema.font.legenda, { color: c.textoSuave }]}>Exportado do Excel, Google Sheets…</Text>
          </View>
        </Pressable>

        <Pressable style={[s.opcao, { backgroundColor: c.primarioSuave, borderColor: c.primario }]}
          onPress={usarExemplo} accessibilityRole="button" accessibilityLabel="Testar com exemplo">
          <View style={[s.selo, { backgroundColor: c.superficie }]}><Icone nome="flask" cor={c.primario} /></View>
          <View style={{ marginLeft: 16 }}>
            <Text style={[tema.font.corpo, { color: c.primario, fontWeight: "700" }]}>Testar com exemplo</Text>
            <Text style={[tema.font.legenda, { color: c.textoSuave }]}>Importa 2 lançamentos de exemplo</Text>
          </View>
        </Pressable>
      </View>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  selo: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  scroll: { paddingTop: 16, paddingBottom: 48 },
  centro: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  opcao: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  botao: { borderRadius: 50, paddingVertical: 16, alignItems: "center" },
  linha: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  aviso: { borderRadius: 8, padding: 10, marginBottom: 8 },
  rotulo: { fontSize: 12, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, borderWidth: 1 },
});

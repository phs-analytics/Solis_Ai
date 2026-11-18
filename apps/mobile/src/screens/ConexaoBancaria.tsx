import React, { useEffect, useState } from "react";
import { Alert, ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { autenticarPluggy, listarContasPluggy } from "@solis/core";
import {
  lerCredenciaisPluggy, salvarCredenciaisPluggy, apagarCredenciaisPluggy, sincronizarPluggy, ultimaSyncPluggy,
} from "@solis/dados";
import { useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";

const GUIA = "github.com/phs-analytics/Solis_Ai/blob/main/GUIDE_PLUGGY.md";
const MEU_PLUGGY = "https://meu.pluggy.ai";
const GUIA_API = "https://meu.pluggy.ai/api-guide";

export function ConexaoBancaria() {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [itens, setItens] = useState("");
  const [conectado, setConectado] = useState(false);
  const [ultima, setUltima] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [etapa, setEtapa] = useState<"escolha" | "cadastro" | "form">("escolha");

  useEffect(() => {
    lerCredenciaisPluggy().then((cr) => {
      if (!cr) return;
      setConectado(true);
      setClientId(cr.clientId);
      setItens(cr.itemIds.join("\n"));
      // O Secret salvo nunca volta para a tela; campo vazio = manter o atual.
    });
    ultimaSyncPluggy(banco).then(setUltima);
  }, [banco]);

  async function executar(acao: () => Promise<string>) {
    setOcupado(true);
    try {
      Alert.alert("Pronto", await acao());
      setUltima(await ultimaSyncPluggy(banco));
    } catch (e) {
      Alert.alert("Não deu certo", e instanceof Error ? e.message : "Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  function salvar() {
    return executar(async () => {
      const salvo = await lerCredenciaisPluggy();
      const secret = clientSecret.trim() || salvo?.clientSecret || "";
      const itemIds = itens.split(/[\s,;]+/).filter(Boolean);
      if (!clientId.trim() || !secret || itemIds.length === 0) {
        throw new Error("Preencha Client ID, Client Secret e pelo menos um itemId.");
      }
      // Testa tudo antes de salvar: credenciais e cada item.
      const apiKey = await autenticarPluggy(clientId.trim(), secret);
      for (const id of itemIds) await listarContasPluggy(apiKey, id);
      const cred = { clientId: clientId.trim(), clientSecret: secret, itemIds };
      await salvarCredenciaisPluggy(cred);
      setClientSecret("");
      setConectado(true);
      const r = await sincronizarPluggy(banco, cred, { forcar: true });
      return `Conectado. ${r.contas} conta(s) e ${r.novos} lançamento(s) novos.`;
    });
  }

  function buscarAgora() {
    return executar(async () => {
      const cred = await lerCredenciaisPluggy();
      if (!cred) throw new Error("Salve as credenciais primeiro.");
      const r = await sincronizarPluggy(banco, cred, { forcar: true });
      return `${r.novos} lançamento(s) novos. O Meu Pluggy atualiza seus bancos uma vez por dia.`;
    });
  }

  function desconectar() {
    Alert.alert("Desconectar", "Apaga as credenciais deste celular. Os lançamentos já baixados continuam no Solis.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desconectar", style: "destructive",
        onPress: async () => {
          await apagarCredenciaisPluggy();
          setConectado(false);
          setClientId(""); setClientSecret(""); setItens("");
        },
      },
    ]);
  }

  const campo = [s.input, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }];
  const abrir = (url: string) => Linking.openURL(url).catch(() => Alert.alert("Não deu para abrir", url));

  if (!conectado && etapa === "escolha") {
    return (
      <ScrollView contentContainerStyle={[s.scroll, { paddingHorizontal: tema.spacing.lg, gap: 12 }]}>
        <Text style={[tema.font.corpo, { color: c.texto }]}>
          Para trazer seus lançamentos automaticamente, o Solis usa a sua conta gratuita do Meu Pluggy.
        </Text>
        <Pressable style={[s.botao, { backgroundColor: c.primario }]} onPress={() => setEtapa("form")} accessibilityRole="button">
          <Text style={s.botaoTexto}>Tenho login no Meu Pluggy</Text>
        </Pressable>
        <Pressable style={[s.botao, { backgroundColor: c.superficie }]} onPress={() => setEtapa("cadastro")} accessibilityRole="button">
          <Text style={{ color: c.primario, fontWeight: "700", fontSize: 16 }}>Cadastrar no Meu Pluggy</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (!conectado && etapa === "cadastro") {
    const passos: [string, string, string][] = [
      ["1. Crie sua conta gratuita", "Cadastre-se no site do Meu Pluggy.", MEU_PLUGGY],
      ["2. Conecte seus bancos", "Lá mesmo, conecte cada banco pelo Open Finance e copie o itemId de cada um.", MEU_PLUGGY],
      ["3. Gere o Client ID e o Client Secret", "No painel, crie as credenciais da API. O Secret aparece uma vez só: guarde.", GUIA_API],
    ];
    return (
      <ScrollView contentContainerStyle={[s.scroll, { paddingHorizontal: tema.spacing.lg, gap: 12 }]}>
        {passos.map(([titulo, desc, url]) => (
          <Pressable key={titulo} style={[s.passo, { backgroundColor: c.superficie, borderColor: c.borda }]}
            onPress={() => abrir(url)} accessibilityRole="link" accessibilityHint="Abre o site do Meu Pluggy">
            <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "700" }]}>{titulo}</Text>
            <Text style={[tema.font.legenda, { color: c.textoSuave, marginTop: 4 }]}>{desc}</Text>
            <Text style={{ color: c.primario, fontWeight: "600", marginTop: 6 }}>Abrir site ›</Text>
          </Pressable>
        ))}
        <Pressable style={[s.botao, { backgroundColor: c.primario }]} onPress={() => setEtapa("form")} accessibilityRole="button">
          <Text style={s.botaoTexto}>Já tenho os dados, continuar</Text>
        </Pressable>
        <Pressable style={s.botao} onPress={() => setEtapa("escolha")} accessibilityRole="button">
          <Text style={{ color: c.textoSuave, fontWeight: "600" }}>Voltar</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[s.scroll, { paddingHorizontal: tema.spacing.lg }]}>
      <Text style={[tema.font.corpo, { color: c.texto }]}>
        Usa a sua conta gratuita do Meu Pluggy para trazer saldos e lançamentos dos seus bancos.
        O Solis chama a Pluggy direto deste celular e grava tudo só aqui, cifrado. Não existe servidor do Solis no meio.
      </Text>
      <View style={[s.aviso, { backgroundColor: c.primarioSuave }]}>
        <Text style={[tema.font.legenda, { color: c.texto }]}>
          Atenção: a Pluggy recebe e guarda os dados dos bancos que você conectar por lá, segundo a política dela.
          Passo a passo e riscos: {GUIA}
        </Text>
      </View>

      <Text style={[s.rotulo, { color: c.textoSuave }]}>Client ID</Text>
      <TextInput style={campo} value={clientId} onChangeText={setClientId} autoCapitalize="none" autoCorrect={false}
        accessibilityLabel="Client ID do Meu Pluggy" />

      <Text style={[s.rotulo, { color: c.textoSuave }]}>Client Secret</Text>
      <TextInput style={campo} value={clientSecret} onChangeText={setClientSecret} secureTextEntry autoCapitalize="none"
        autoCorrect={false} placeholder={conectado ? "Salvo. Deixe vazio para manter" : ""}
        placeholderTextColor={c.textoSuave} accessibilityLabel="Client Secret do Meu Pluggy" />

      <Text style={[s.rotulo, { color: c.textoSuave }]}>itemId (um por linha)</Text>
      <TextInput style={[campo, { minHeight: 72, textAlignVertical: "top" }]} value={itens} onChangeText={setItens}
        multiline autoCapitalize="none" autoCorrect={false} accessibilityLabel="Identificadores dos bancos conectados" />

      <Text style={[tema.font.legenda, { color: c.textoSuave, marginTop: 12 }]}>
        {ultima ? `Última busca: ${new Date(ultima).toLocaleString("pt-BR")}` : "Ainda não buscou nada."}
      </Text>

      {ocupado ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={c.primario} />
      ) : (
        <View style={{ gap: 10, marginTop: 20 }}>
          <Pressable style={[s.botao, { backgroundColor: c.primario }]} onPress={salvar} accessibilityRole="button">
            <Text style={s.botaoTexto}>Testar e salvar</Text>
          </Pressable>
          {conectado && (
            <>
              <Pressable style={[s.botao, { backgroundColor: c.superficie }]} onPress={buscarAgora} accessibilityRole="button">
                <Text style={{ color: c.primario, fontWeight: "700" }}>Buscar agora</Text>
              </Pressable>
              <Pressable style={s.botao} onPress={desconectar} accessibilityRole="button">
                <Text style={{ color: c.erro, fontWeight: "600" }}>Desconectar</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop: 16, paddingBottom: 48 },
  aviso: { borderRadius: 8, padding: 12, marginTop: 12 },
  rotulo: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
  passo: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  botao: { borderRadius: 50, paddingVertical: 14, alignItems: "center" },
  botaoTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

import React, { useEffect, useRef, useState } from "react";
import {
  FlatList, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";
import { montarContexto } from "@solis/dados";
import { responder, gerarAlertas } from "@solis/core";
import type { RespostaIA } from "@solis/core";

type Mensagem = {
  id: string;
  origem: "usuario" | "solis";
  texto: string;
  tipo?: RespostaIA["tipo"];
};

const SUGESTOES = [
  "Quanto gastei este mês?",
  "Como estão meus orçamentos?",
  "Quais contas vencem em breve?",
  "Como estão minhas metas?",
  "Posso gastar mais?",
  "Resumo do mês",
];

function corPorTipo(tipo: RespostaIA["tipo"] | undefined, primario: string, erro: string, sucesso: string, aviso: string) {
  if (tipo === "alerta") return erro;
  if (tipo === "elogio") return sucesso;
  if (tipo === "dica") return aviso;
  return primario;
}

export function ChatSolis() {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const flatRef = useRef<FlatList>(null);

  function addMsg(msg: Omit<Mensagem, "id">) {
    setMensagens((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function enviar(pergunta: string) {
    if (!pergunta.trim() || carregando) return;
    setInput("");
    addMsg({ origem: "usuario", texto: pergunta });
    setCarregando(true);
    try {
      const ctx = await montarContexto(banco);
      const resposta = responder(pergunta, ctx);
      addMsg({ origem: "solis", texto: resposta.texto, tipo: resposta.tipo });
    } catch {
      addMsg({ origem: "solis", texto: "Não consegui acessar seus dados agora. Tente novamente.", tipo: "alerta" });
    } finally {
      setCarregando(false);
    }
  }

  // Alertas automáticos ao abrir
  useEffect(() => {
    (async () => {
      try {
        const ctx = await montarContexto(banco);
        const alertas = gerarAlertas(ctx);
        for (const a of alertas) {
          addMsg({ origem: "solis", texto: a.texto, tipo: a.tipo });
        }
        if (alertas.length === 0) {
          addMsg({ origem: "solis", texto: "Olá! Estou aqui para ajudar com suas finanças. O que quer saber?", tipo: "info" });
        }
      } catch {
        addMsg({ origem: "solis", texto: "Olá! Me pergunte qualquer coisa sobre suas finanças.", tipo: "info" });
      }
    })();
  }, []);

  const tela_vazia = mensagens.length === 0;

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}>

        {tela_vazia ? (
          <View style={s.centro}>
            <Text style={{ fontSize: 56 }}>🌟</Text>
            <Text style={[tema.font.titulo, { color: c.texto, marginTop: 12 }]}>Solis AI</Text>
            <Text style={[tema.font.corpo, { color: c.textoSuave, marginTop: 4 }]}>
              Pergunte sobre suas finanças
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={mensagens}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            renderItem={({ item: m }) => (
              <View style={[
                s.balao,
                m.origem === "usuario"
                  ? { alignSelf: "flex-end", backgroundColor: c.primario, marginLeft: 48 }
                  : { alignSelf: "flex-start", backgroundColor: c.superficie, marginRight: 48, borderWidth: StyleSheet.hairlineWidth, borderColor: c.borda },
              ]}>
                {m.origem === "solis" && m.tipo && m.tipo !== "info" && (
                  <View style={[s.indicadorTipo, { backgroundColor: corPorTipo(m.tipo, c.primario, c.erro, c.sucesso, c.aviso) }]} />
                )}
                <Text style={[
                  tema.font.corpo,
                  { color: m.origem === "usuario" ? "#fff" : c.texto, lineHeight: 22 },
                ]}>
                  {m.texto}
                </Text>
              </View>
            )}
          />
        )}

        {/* Chips de sugestão */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.sugestoesRow}>
          {SUGESTOES.map((s_) => (
            <Pressable key={s_} style={[s.chip, { backgroundColor: c.primarioSuave, borderColor: c.primario }]}
              onPress={() => enviar(s_)} accessibilityRole="button" accessibilityLabel={s_}>
              <Text style={{ color: c.primario, fontSize: 13, fontWeight: "600" }}>{s_}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={[s.inputRow, { borderTopColor: c.borda, backgroundColor: c.superficie }]}>
          <TextInput
            style={[s.input, { color: c.texto, backgroundColor: c.fundo }]}
            placeholder="Pergunte qualquer coisa..."
            placeholderTextColor={c.textoSuave}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => enviar(input)}
            returnKeyType="send"
            editable={!carregando}
            accessibilityLabel="Campo de pergunta"
          />
          <Pressable
            style={[s.botaoEnviar, { backgroundColor: carregando || !input.trim() ? c.borda : c.primario }]}
            onPress={() => enviar(input)}
            disabled={carregando || !input.trim()}
            accessibilityRole="button" accessibilityLabel="Enviar pergunta">
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>↑</Text>
          </Pressable>
        </View>

      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", alignItems: "center" },
  balao: { borderRadius: 16, padding: 14, marginBottom: 10, maxWidth: "100%" },
  indicadorTipo: { width: 4, height: "100%", position: "absolute", left: 0, top: 0, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  sugestoesRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: "row" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, borderWidth: 1 },
  inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  input: { flex: 1, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  botaoEnviar: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
});

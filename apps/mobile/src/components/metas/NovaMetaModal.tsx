import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useBanco } from "../../contexto/BancoContext";
import { criarMeta } from "@solis/dados";
import { auxiliares, corBanco, tipo, useTema } from "../../theme";
import { parseDinheiro } from "../../utils/dinheiro";
import { Texto as Text, Entrada as TextInput } from "../Texto";

import { Icone } from "../Icone";
import { ICONES_META as ICONES, iconeMeta } from "./iconesMeta";

const BANCOS = ["", "Nubank", "Inter", "Itaú", "Neon"];
const CORES = ["#9B3DD1", "#F26A1B", "#1F5FAD", "#11A85F", "#FFB162", "#A35139", "#E0344F", "#3A4B5F"];
const PRAZO_OK = /^\d{4}-(0[1-9]|1[0-2])$/;

export function NovaMetaModal({ visivel, aoFechar, aoSalvar }: { visivel: boolean; aoFechar: () => void; aoSalvar: () => void }) {
  const c = useTema().cores;
  const banco = useBanco();
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("cofrinho");
  const [cor, setCor] = useState(CORES[0]!);
  const [alvo, setAlvo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [bancNome, setBancNome] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function limpar() {
    setNome(""); setAlvo(""); setPrazo(""); setBancNome(""); setIcone("cofrinho"); setCor(CORES[0]!); setErro("");
  }
  function fechar() { limpar(); aoFechar(); }

  async function salvar() {
    if (!nome.trim()) { setErro("Dê um nome para a meta."); return; }
    const alvoCentavos = parseDinheiro(alvo) ?? 0;
    if (alvoCentavos <= 0) { setErro("Diga quanto quer juntar."); return; }
    if (prazo.trim() && !PRAZO_OK.test(prazo.trim())) { setErro("Prazo no formato AAAA-MM, ex.: 2026-12."); return; }
    setSalvando(true);
    try {
      await criarMeta(banco, {
        nome: nome.trim(), icone, cor, bancNome: bancNome || null,
        descricao: null, alvoCentavos, prazo: prazo.trim() || null,
      });
      limpar();
      aoSalvar();
    } catch {
      setErro("Não deu para salvar a meta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const campo = [s.input, { color: c.texto, borderColor: c.borda }];

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.raiz}>
        <Pressable style={StyleSheet.absoluteFill} onPress={fechar} accessibilityLabel="Fechar" />
        {visivel && (
          <Animated.View entering={ZoomIn.springify().damping(18)} style={[s.cartao, { backgroundColor: c.superficie, borderColor: c.borda }]}
            accessibilityViewIsModal>
            <View style={s.cab}>
              <View style={[s.previa, { backgroundColor: `${cor}38` }]}><Icone nome={iconeMeta(icone)} tamanho={20} cor={cor} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...tipo.display(17), color: c.texto }} accessibilityRole="header">Nova meta</Text>
                <Text style={{ ...tipo.corpo(12), color: c.textoSuave }} numberOfLines={1}>Um cofrinho para guardar aos poucos</Text>
              </View>
              <Pressable onPress={fechar} style={[s.x, { borderColor: c.borda }]} accessibilityRole="button" accessibilityLabel="Fechar">
                <Text style={{ ...tipo.corpo(18), color: c.texto, lineHeight: 20 }}>×</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={s.corpo} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.grupo}>
                <Text style={[s.rotulo, { color: c.textoSuave }]}>Nome da meta</Text>
                <TextInput style={campo} placeholder="Ex.: Viagem para a praia" placeholderTextColor={c.textoSuave}
                  maxLength={40} value={nome} onChangeText={(t) => { setNome(t); setErro(""); }} />
              </View>

              <View style={s.grupo}>
                <Text style={[s.rotulo, { color: c.textoSuave }]}>Quanto quer juntar</Text>
                <TextInput style={campo} placeholder="R$ 0,00" placeholderTextColor={c.textoSuave} keyboardType="decimal-pad"
                  value={alvo} onChangeText={(t) => { setAlvo(t); setErro(""); }} />
              </View>

              <View style={s.grupo}>
                <Text style={[s.rotulo, { color: c.textoSuave }]}>Ícone</Text>
                <View style={s.gradeIcones}>
                  {ICONES.map((ic) => {
                    const on = icone === ic.key;
                    return (
                      <Pressable key={ic.key} onPress={() => setIcone(ic.key)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={ic.label}
                        style={[s.iconeItem, { backgroundColor: on ? `${cor}2E` : c.fundo, borderColor: on ? cor : "transparent" }]}>
                        <Icone nome={ic.icone} tamanho={18} cor={on ? cor : c.textoSuave} />
                        <Text style={{ ...tipo.corpo(10), color: c.textoSuave }} numberOfLines={1}>{ic.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={s.grupo}>
                <Text style={[s.rotulo, { color: c.textoSuave }]}>Onde o dinheiro fica</Text>
                <View style={s.linha}>
                  {BANCOS.map((b) => {
                    const on = bancNome === b;
                    return (
                      <Pressable key={b || "nenhum"} onPress={() => { setBancNome(b); if (b) setCor(corBanco(b)); }}
                        accessibilityRole="radio" accessibilityState={{ checked: on }}
                        style={[s.chip, { borderColor: on ? cor : c.borda, backgroundColor: on ? cor : "transparent" }]}>
                        <Text style={{ ...tipo.corpo(12, "semibold"), color: on ? auxiliares.branco : c.texto }} numberOfLines={1}>{b || "Nenhum"}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={s.grupo}>
                <Text style={[s.rotulo, { color: c.textoSuave }]}>Cor</Text>
                <View style={[s.linha, { gap: 10 }]}>
                  {CORES.map((co) => (
                    <Pressable key={co} onPress={() => setCor(co)} accessibilityRole="radio" accessibilityState={{ checked: cor === co }} accessibilityLabel={`Cor ${co}`}
                      style={[s.bolaWrap, { borderColor: cor === co ? co : "transparent" }]}>
                      <View style={[s.bola, { backgroundColor: co }]} />
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={s.grupo}>
                <Text style={[s.rotulo, { color: c.textoSuave }]}>Prazo (opcional)</Text>
                <TextInput style={campo} placeholder="AAAA-MM, ex.: 2026-12" placeholderTextColor={c.textoSuave} maxLength={7}
                  keyboardType="numbers-and-punctuation" value={prazo} onChangeText={(t) => { setPrazo(t); setErro(""); }} />
              </View>

              {!!erro && <Text style={{ ...tipo.corpo(12, "medium"), color: c.erro }} accessibilityLiveRegion="polite">{erro}</Text>}
            </ScrollView>

            <View style={[s.pe, { borderColor: c.borda }]}>
              <Pressable onPress={fechar} style={[s.botao, { borderWidth: 1, borderColor: c.borda }]} accessibilityRole="button">
                <Text style={{ ...tipo.corpo(14, "semibold"), color: c.texto }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={salvar} disabled={salvando} style={[s.botao, { backgroundColor: cor, opacity: salvando ? 0.6 : 1 }]} accessibilityRole="button" accessibilityLabel="Criar meta">
                <Text style={{ ...tipo.corpo(14, "semibold"), color: auxiliares.branco }}>{salvando ? "Salvando…" : "Criar meta"}</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1, justifyContent: "center", paddingHorizontal: 14, backgroundColor: "rgba(0,0,0,0.45)" },
  cartao: { maxHeight: "88%", borderRadius: 24, borderWidth: 1, overflow: "hidden", elevation: 12 },
  cab: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 },
  previa: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  x: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  corpo: { paddingHorizontal: 18, paddingBottom: 8, gap: 14 },
  grupo: { gap: 7 },
  rotulo: { ...tipo.corpo(11, "semibold"), letterSpacing: 0.5, textTransform: "uppercase" as const },
  input: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  gradeIcones: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  iconeItem: { width: "18.6%", alignItems: "center", borderRadius: 12, paddingVertical: 8, gap: 2, borderWidth: 1.5 },
  linha: { flexDirection: "row", gap: 6 },
  chip: { flex: 1, alignItems: "center", borderRadius: 99, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 2 },
  bolaWrap: { borderRadius: 19, padding: 2, borderWidth: 2 },
  bola: { width: 28, height: 28, borderRadius: 14 },
  pe: { flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderTopWidth: StyleSheet.hairlineWidth },
  botao: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
});

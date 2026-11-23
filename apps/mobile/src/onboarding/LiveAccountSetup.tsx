import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { criarConta } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { Icone } from "../components/Icone";
import { parseDinheiro } from "../utils/dinheiro";
import { AnimatedNumber, BORDA_FINA, BotaoCTA, BrilhoAmbiente, MOLA, c } from "./componentes";
import { CONTA_INICIAL as K } from "./onboardingConfig";

/** Cria a primeira conta. O card de cima mostra o resultado enquanto a pessoa preenche. */
export function LiveAccountSetup({ banco, aoTerminar }: { banco: Banco; aoTerminar: () => void }) {
  const [tipoIdx, setTipoIdx] = useState(0);
  const [nome, setNome] = useState("");
  const [saldo, setSaldo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [larguraSeg, setLarguraSeg] = useState(0);
  const tipo = K.tipos[tipoIdx]!;
  const centavos = parseDinheiro(saldo) ?? 0;

  const pos = useSharedValue(0);
  const cor = useSharedValue(0);
  useEffect(() => { pos.value = withSpring(tipoIdx, MOLA); cor.value = withSpring(tipoIdx, MOLA); }, [tipoIdx]);
  const indicador = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * (larguraSeg / K.tipos.length) }] }));
  const fundoCard = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(cor.value, [0, 1, 2], K.tipos.map((t) => t.cor)) }));

  async function concluir() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      await criarConta(banco, { nome: nome.trim(), tipo: tipo.v, saldoInicialCentavos: centavos, moeda: "BRL" });
      aoTerminar();
    } catch {
      Alert.alert("Não deu para criar a conta", "Tente de novo, ou crie depois pela tela inicial.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={st.tela} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BrilhoAmbiente />
      <ScrollView contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.springify().stiffness(MOLA.stiffness).damping(MOLA.damping)} style={[st.preview, fundoCard]}>
          <View style={st.brilho} />
          <View style={st.marca}><Icone nome={tipo.icone} tamanho={88} cor="rgba(255,255,255,0.10)" /></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icone nome={tipo.icone} tamanho={13} cor="rgba(255,255,255,0.85)" />
            <Text style={st.previewRotulo}>{tipo.t.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={st.previewNome} numberOfLines={1}>{nome.trim() || "Nome da conta"}</Text>
            <AnimatedNumber centavos={centavos} duracao={350} style={st.previewValor} />
          </View>
        </Animated.View>

        <Text style={st.kicker}>{K.kicker.toUpperCase()}</Text>
        <Text style={st.titulo} accessibilityRole="header">{K.titulo}</Text>
        <Text style={st.texto}>{K.texto}</Text>

        <View style={st.segmento} onLayout={(e) => setLarguraSeg(e.nativeEvent.layout.width - 8)} accessibilityRole="radiogroup">
          {larguraSeg > 0 && <Animated.View style={[st.segIndicador, { width: larguraSeg / K.tipos.length }, indicador]} />}
          {K.tipos.map((t, i) => (
            <Pressable key={t.v} style={st.segItem} onPress={() => setTipoIdx(i)} accessibilityRole="radio" accessibilityState={{ selected: i === tipoIdx }}>
              <Icone nome={t.icone} tamanho={13} cor={i === tipoIdx ? c.sobrePrimario : c.textoSuave} />
              <Text style={{ color: i === tipoIdx ? c.sobrePrimario : c.textoSuave, fontWeight: "700", fontSize: 13 }}>{t.t}</Text>
            </Pressable>
          ))}
        </View>

        <View style={st.grupo}>
          <View style={st.campo}>
            <Text style={st.campoRotulo}>Nome</Text>
            <TextInput value={nome} onChangeText={setNome} placeholder={tipo.exemplo} placeholderTextColor={c.textoSuave}
              style={st.input} accessibilityLabel="Nome da conta" autoCapitalize="words" />
          </View>
          <View style={st.divisor} />
          <View style={st.campo}>
            <Text style={st.campoRotulo}>Saldo hoje (R$)</Text>
            <TextInput value={saldo} onChangeText={setSaldo} placeholder="0,00" placeholderTextColor={c.textoSuave}
              keyboardType="decimal-pad" style={[st.input, { fontVariant: ["tabular-nums"] }]} accessibilityLabel="Saldo de hoje" />
          </View>
        </View>
        <Text style={st.nota}>{K.nota}</Text>
      </ScrollView>

      <View style={st.rodape}>
        <BotaoCTA texto={K.cta} onPress={concluir} desativado={!nome.trim()} carregando={salvando} />
        <Pressable onPress={aoTerminar} style={{ padding: 12, alignItems: "center" }} accessibilityRole="button">
          <Text style={{ color: c.textoSuave, fontWeight: "600" }}>{K.pular}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: c.fundo },
  conteudo: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  preview: { height: 170, borderRadius: 20, padding: 18, justifyContent: "space-between", overflow: "hidden", transform: [{ rotate: "-2deg" }],
    shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 10, marginBottom: 24 },
  brilho: { position: "absolute", top: -60, left: -40, right: -40, height: 130, borderRadius: 200, backgroundColor: "rgba(255,255,255,0.14)" },
  marca: { position: "absolute", right: 12, bottom: 4 },
  previewRotulo: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  previewNome: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  previewValor: { color: "#FFFFFF", fontSize: 30, fontWeight: "800", letterSpacing: -0.8 },
  kicker: { color: c.primario, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  titulo: { color: c.texto, fontSize: 28, fontWeight: "800", letterSpacing: -0.6, lineHeight: 34, marginTop: 6 },
  texto: { color: c.textoSuave, fontSize: 15, lineHeight: 22, marginTop: 8 },
  segmento: { flexDirection: "row", backgroundColor: c.superficie, borderRadius: 50, padding: 4, marginTop: 20, borderWidth: 1, borderColor: BORDA_FINA },
  segIndicador: { position: "absolute", top: 4, bottom: 4, left: 4, borderRadius: 50, backgroundColor: c.primario },
  segItem: { flex: 1, minHeight: 40, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  grupo: { backgroundColor: c.superficie, borderRadius: 16, borderWidth: 1, borderColor: BORDA_FINA, marginTop: 14 },
  campo: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  campoRotulo: { color: c.textoSuave, fontSize: 12, fontWeight: "600" },
  input: { color: c.texto, fontSize: 17, paddingVertical: 6 },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: BORDA_FINA, marginLeft: 16 },
  nota: { color: c.textoSuave, fontSize: 12, marginTop: 10 },
  rodape: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
});

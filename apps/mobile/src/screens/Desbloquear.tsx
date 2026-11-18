import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { registrarTentativaErrada, resetarTentativas, verificarBloqueio, apagarTudo } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { entrar } from "../contexto/sessao";

const MAX_TENTATIVAS = 5;

export function Desbloquear({ aoAbrir, aoApagado }: { aoAbrir: (b: Banco) => void; aoApagado: () => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function desbloquear() {
    if (!senha || carregando) return;
    setCarregando(true);
    setErro("");
    try {
      const banco = await entrar(senha);
      await resetarTentativas();
      aoAbrir(banco);
    } catch {
      const n = await registrarTentativaErrada();
      if (await verificarBloqueio()) {
        await apagarTudo();
        await resetarTentativas();
        aoApagado();
        return;
      }
      setErro(`Senha errada. Restam ${MAX_TENTATIVAS - n} tentativas antes de apagar os dados.`);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.titulo}>Digite sua senha</Text>
      <TextInput
        style={s.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
        onSubmitEditing={desbloquear}
        autoFocus
        accessibilityLabel="Senha mestra"
      />
      {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
      <Pressable
        style={[s.botao, (!senha || carregando) && s.botaoDesabilitado]}
        onPress={desbloquear}
        disabled={!senha || carregando}
        accessibilityRole="button"
        accessibilityState={{ disabled: !senha || carregando }}
      >
        {carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.botaoTexto}>Entrar</Text>}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  titulo: { fontSize: 24, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  erro: { color: "#c00", fontSize: 13 },
  botao: { backgroundColor: "#1a73e8", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  botaoDesabilitado: { backgroundColor: "#aaa" },
  botaoTexto: { color: "#fff", fontWeight: "600", fontSize: 16 },
});

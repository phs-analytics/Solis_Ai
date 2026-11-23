import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { registrarTentativaErrada, resetarTentativas, verificarBloqueio, apagarTudo } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { entrar, SenhaErrada } from "../contexto/sessao";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";

const MAX_TENTATIVAS = 5;

export function Desbloquear({ aoAbrir, aoApagado }: { aoAbrir: (b: Banco) => void; aoApagado: () => void }) {
  const { cores: c } = useTema();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [foco, setFoco] = useState(false);

  async function desbloquear() {
    if (!senha || carregando) return;
    setCarregando(true);
    setErro("");
    try {
      const banco = await entrar(senha);
      await resetarTentativas();
      aoAbrir(banco);
    } catch (e) {
      if (!(e instanceof SenhaErrada)) {
        setErro("Não deu para abrir agora. Tente de novo.");
        return;
      }
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

  const ativo = !!senha && !carregando;

  return (
    <SafeScreen>
      <View style={s.container}>
        <Text style={[s.titulo, { color: c.texto }]} accessibilityRole="header">Boas-vindas de volta</Text>
        <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 22 }}>Digite sua senha para abrir o Solis.</Text>
        <Text style={{ color: foco ? c.primario : c.textoSuave, fontSize: 13, fontWeight: "500", marginTop: 24 }}>Senha</Text>
        <TextInput
          style={[s.input, { color: c.texto, borderBottomColor: foco ? c.primario : c.borda }]}
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
          onSubmitEditing={desbloquear}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          autoFocus
          accessibilityLabel="Senha mestra"
        />
        {erro ? <Text style={{ color: c.erro, fontSize: 13 }} accessibilityLiveRegion="polite">{erro}</Text> : null}
      </View>
      <View style={s.rodape}>
        <Pressable
          style={[s.botao, { backgroundColor: ativo ? c.primario : c.borda }]}
          onPress={desbloquear}
          disabled={!ativo}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ativo }}
        >
          {carregando
            ? <ActivityIndicator color={c.sobrePrimario} />
            : <Text style={[s.botaoTexto, { color: ativo ? c.sobrePrimario : c.textoSuave }]}>Entrar</Text>}
        </Pressable>
      </View>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 48, gap: 8 },
  titulo: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6, lineHeight: 36 },
  input: { borderBottomWidth: 1.5, paddingTop: 6, paddingBottom: 10, fontSize: 17 },
  rodape: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  botao: { paddingVertical: 17, borderRadius: 14, alignItems: "center" },
  botaoTexto: { fontWeight: "700", fontSize: 16 },
});

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Texto as Text, Entrada as TextInput } from "../components/Texto";
import { registrarTentativaErrada, resetarTentativas, verificarBloqueio, apagarTudo } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { entrar, SenhaErrada } from "../contexto/sessao";
import { SafeScreen } from "../components/SafeScreen";
import { tipo, useTema } from "../theme";
import { BotaoCTA } from "../onboarding/componentes";

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
      const resta = MAX_TENTATIVAS - n;
      setErro(`Senha errada. ${resta === 1 ? "Resta 1 tentativa" : `Restam ${resta} tentativas`} antes de apagar os dados.`);
    } finally {
      setCarregando(false);
    }
  }

  const ativo = !!senha && !carregando;

  return (
    <SafeScreen>
      <View style={s.container}>
        <Text style={{ ...tipo.display(30), color: c.texto }} accessibilityRole="header">Boas-vindas de volta</Text>
        <Text style={{ ...tipo.corpo(15), color: c.textoSuave, marginTop: 8 }}>Digite sua senha para abrir o Solis.</Text>
        <Text style={{ ...tipo.corpo(13, "medium"), color: foco ? c.primario : c.textoSuave, marginTop: 24 }}>Senha</Text>
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
        {erro ? <Text style={{ ...tipo.corpo(13), color: c.erro, marginTop: 8 }} accessibilityLiveRegion="polite">{erro}</Text> : null}
      </View>
      <View style={s.rodape}>
        <BotaoCTA texto="Entrar" onPress={desbloquear} desativado={!ativo} carregando={carregando}
          cores={{ fundo: c.primario, texto: c.sobrePrimario, fundoOff: c.borda, textoOff: c.textoSuave }} />
      </View>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 48 },
  input: { borderBottomWidth: 1.5, paddingTop: 6, paddingBottom: 10, fontSize: 17 },
  rodape: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
});

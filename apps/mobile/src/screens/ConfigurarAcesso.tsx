/**
 * Última etapa do onboarding: cria a senha do cofre e liga a biometria (opcional).
 * A senha nunca é guardada; o SQLCipher deriva a chave dela.
 */

import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Switch } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as DocumentPicker from "expo-document-picker";
import { avaliarSenha } from "@solis/core";
import { salvarSalt, gerarSalt, restaurarBackup } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { entrar } from "../contexto/sessao";
import { useTema } from "../theme";
import { Icone } from "../components/Icone";

interface Props {
  aoAbrir: (banco: Banco, restaurado: boolean) => void;
  /** Nome, apelido e ano de nascimento: não podem fazer parte da senha. */
  pessoais?: string[];
}

export function ConfigurarAcesso({ aoAbrir, pessoais = [] }: Props) {
  const { cores: c, dark } = useTema();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [ver, setVer] = useState(false);
  const [temBiometria, setTemBiometria] = useState(false);
  const [usarBiometria, setUsarBiometria] = useState(true);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
      .then(([h, e]) => setTemBiometria(h && e))
      .catch(() => setTemBiometria(false));
  }, []);

  const regras = avaliarSenha(senha, pessoais);
  const forte = regras.every((r) => r.ok);
  const iguais = senha === confirmacao;
  const podeContinuar = forte && iguais && !carregando;

  async function configurar() {
    if (!podeContinuar) return;
    setCarregando(true);
    try {
      const salt = gerarSalt();
      let comBiometria = temBiometria && usarBiometria;
      if (comBiometria) {
        try {
          await salvarSalt(salt, true);
        } catch {
          comBiometria = false; // cancelou a digital: segue só com senha
        }
      }
      if (!comBiometria) await salvarSalt(salt, false);
      aoAbrir(await entrar(senha, false), false);
    } catch {
      Alert.alert("Erro", "Não foi possível salvar a senha. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function restaurar() {
    if (!senha || carregando) {
      Alert.alert("Digite a senha", "Use a senha que você usava no aparelho antigo.");
      return;
    }
    const escolha = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (escolha.canceled || !escolha.assets[0]) return;
    setCarregando(true);
    try {
      await restaurarBackup(escolha.assets[0].uri, senha);
      aoAbrir(await entrar(senha), true);
    } catch (e) {
      Alert.alert("Não deu para restaurar", e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  const input = [s.input, { borderColor: c.borda, backgroundColor: c.superficie, color: c.texto }];

  return (
    <View style={s.container}>
      <View style={s.campoSenha}>
        <TextInput
          style={[input, { flex: 1 }]}
          placeholder="Crie sua senha"
          placeholderTextColor={c.textoSuave}
          secureTextEntry={!ver}
          value={senha}
          onChangeText={setSenha}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Senha"
        />
        <Pressable onPress={() => setVer(!ver)} style={s.ver} accessibilityRole="button"
          accessibilityLabel={ver ? "Esconder senha" : "Mostrar senha"}>
          <Text style={{ color: c.primario, fontWeight: "600" }}>{ver ? "Esconder" : "Mostrar"}</Text>
        </Pressable>
      </View>

      <View style={s.regras} accessibilityLiveRegion="polite">
        {regras.map((r) => (
          <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icone nome={r.ok ? "check" : "circle-small"} tamanho={12} cor={r.ok ? c.sucesso : c.textoSuave} />
            <Text style={{ color: r.ok ? c.sucesso : c.textoSuave, fontSize: 13 }}>{r.texto}</Text>
          </View>
        ))}
      </View>

      <TextInput
        style={input}
        placeholder="Repita a senha"
        placeholderTextColor={c.textoSuave}
        secureTextEntry={!ver}
        value={confirmacao}
        onChangeText={setConfirmacao}
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Confirmação da senha"
      />
      {confirmacao.length > 0 && !iguais && (
        <Text style={{ color: c.erro, fontSize: 13 }} accessibilityLiveRegion="polite">As senhas não são iguais.</Text>
      )}

      {temBiometria && (
        <View style={[s.bio, { backgroundColor: c.superficie, borderColor: c.borda }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.texto, fontWeight: "600" }}>Usar digital ou rosto</Text>
            <Text style={{ color: c.textoSuave, fontSize: 13 }}>Pede a biometria toda vez que abrir o app, junto com a senha.</Text>
          </View>
          <Switch value={usarBiometria} onValueChange={setUsarBiometria} accessibilityLabel="Usar digital ou rosto" />
        </View>
      )}

      <Pressable
        style={[s.botao, { backgroundColor: podeContinuar ? c.primario : c.borda }]}
        onPress={configurar}
        disabled={!podeContinuar}
        accessibilityRole="button"
        accessibilityState={{ disabled: !podeContinuar }}
      >
        {carregando ? <ActivityIndicator color="#fff" /> : <Text style={[s.botaoTexto, dark && { color: "#0A1628" }]}>Criar senha e concluir</Text>}
      </Pressable>

      <Pressable style={s.secundario} onPress={restaurar} disabled={carregando} accessibilityRole="button"
        accessibilityHint="Escolha o arquivo .solis e use a senha do aparelho antigo">
        <Text style={{ color: c.primario, fontWeight: "600" }}>Já tenho um backup (.solis)</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 12 },
  campoSenha: { flexDirection: "row", alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  ver: { position: "absolute", right: 14, padding: 6 },
  regras: { gap: 4, paddingHorizontal: 4 },
  bio: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  botao: { paddingVertical: 16, borderRadius: 50, alignItems: "center", marginTop: 8 },
  botaoTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secundario: { padding: 12, alignItems: "center" },
});

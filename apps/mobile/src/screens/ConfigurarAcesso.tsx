/**
 * Tela de primeiro acesso: define a senha mestra e ativa biometria opcional.
 * Exibida na primeira abertura do app (sem banco criado ainda).
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as DocumentPicker from "expo-document-picker";
import { salvarSalt, gerarSalt, restaurarBackup } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { entrar } from "../contexto/sessao";

const MIN_SENHA = 8;

interface Props {
  aoAbrir: (banco: Banco) => void;
}

export function ConfigurarAcesso({ aoAbrir }: Props) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  const senhaValida = senha.length >= MIN_SENHA;
  const senhasIguais = senha === confirmacao;
  const podeContinuar = senhaValida && senhasIguais && !carregando;

  async function configurar() {
    if (!podeContinuar) return;
    setCarregando(true);
    try {
      // Gera salt aleatório e deriva a chave — a senha NUNCA é persistida
      const salt = gerarSalt();

      // Oferece biometria se o aparelho suportar
      const temBiometria = await LocalAuthentication.hasHardwareAsync();
      const biometriaConfigurada = await LocalAuthentication.isEnrolledAsync();
      let usouBiometria = false;

      if (temBiometria && biometriaConfigurada) {
        const resultado = await LocalAuthentication.authenticateAsync({
          promptMessage: "Confirme com biometria para ativar o desbloqueio rápido",
          cancelLabel: "Usar só senha",
          disableDeviceFallback: true,
        });
        usouBiometria = resultado.success;
      }

      // Salva o salt no Keystore (com ou sem biometria vinculada)
      // A chave do banco é sempre derivada de salt+senha em tempo de desbloqueio
      await salvarSalt(salt, usouBiometria);
      aoAbrir(await entrar(senha));
    } catch (e) {
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
      aoAbrir(await entrar(senha));
    } catch (e) {
      Alert.alert("Não deu para restaurar", e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.titulo}>Crie sua senha</Text>
      <Text style={s.subtitulo}>
        Ela protege seus dados no aparelho. Mínimo de {MIN_SENHA} caracteres.
      </Text>

      <TextInput
        style={s.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
        autoComplete="new-password"
        accessibilityLabel="Senha mestra"
      />

      <TextInput
        style={s.input}
        placeholder="Confirme a senha"
        secureTextEntry
        value={confirmacao}
        onChangeText={setConfirmacao}
        autoComplete="new-password"
        accessibilityLabel="Confirmação da senha"
      />

      {confirmacao.length > 0 && !senhasIguais && (
        <Text style={s.erro} accessibilityLiveRegion="polite">
          As senhas não coincidem.
        </Text>
      )}

      <Pressable
        style={[s.botao, !podeContinuar && s.botaoDesabilitado]}
        onPress={configurar}
        disabled={!podeContinuar}
        accessibilityRole="button"
        accessibilityState={{ disabled: !podeContinuar }}
      >
        {carregando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.botaoTexto}>Continuar</Text>
        )}
      </Pressable>

      <Pressable
        style={s.botaoSecundario}
        onPress={restaurar}
        disabled={carregando}
        accessibilityRole="button"
        accessibilityHint="Escolha o arquivo .solis e use a senha do aparelho antigo"
      >
        <Text style={s.botaoSecundarioTexto}>Já tenho um backup (.solis)</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  titulo: { fontSize: 24, fontWeight: "700" },
  subtitulo: { fontSize: 14, color: "#666", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  erro: { color: "#c00", fontSize: 13 },
  botao: {
    backgroundColor: "#1a73e8",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  botaoDesabilitado: { backgroundColor: "#aaa" },
  botaoTexto: { color: "#fff", fontWeight: "600", fontSize: 16 },
  botaoSecundario: { padding: 14, alignItems: "center" },
  botaoSecundarioTexto: { color: "#1a73e8", fontWeight: "600", fontSize: 15 },
});

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
import { salvarChave } from "@solis/dados";

const MIN_SENHA = 8;

interface Props {
  aoConfigurar: () => void;
}

export function ConfigurarAcesso({ aoConfigurar }: Props) {
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
      // Oferece biometria se o aparelho suportar
      const temBiometria = await LocalAuthentication.hasHardwareAsync();
      const biometriaConfigurada = await LocalAuthentication.isEnrolledAsync();

      if (temBiometria && biometriaConfigurada) {
        const resultado = await LocalAuthentication.authenticateAsync({
          promptMessage: "Confirme com biometria para ativar o desbloqueio rápido",
          cancelLabel: "Usar só senha",
          disableDeviceFallback: true,
        });
        if (resultado.success) {
          await salvarChave(`bio:${senha}`);
        } else {
          await salvarChave(senha);
        }
      } else {
        await salvarChave(senha);
      }

      aoConfigurar();
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar a senha. Tente novamente.");
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
});

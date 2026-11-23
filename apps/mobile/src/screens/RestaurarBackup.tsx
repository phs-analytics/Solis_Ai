import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { restaurarBackup } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { Texto as Text, Entrada as TextInput } from "../components/Texto";
import { SafeScreen } from "../components/SafeScreen";
import { entrar } from "../contexto/sessao";
import { tipo, useTema } from "../theme";
import { BotaoCTA } from "../onboarding/componentes";

/** Para quem já tem um backup .solis e ainda não tem senha neste celular (Splash > "Já tem acesso? Entrar"). */
export function RestaurarBackup({ aoAbrir }: { aoAbrir: (b: Banco) => void }) {
  const { cores: c } = useTema();
  const nav = useNavigation();
  const [senha, setSenha] = useState("");
  const [foco, setFoco] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function restaurar() {
    if (!senha || carregando) return;
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
    <SafeScreen>
      <View style={s.container}>
        <Text style={{ ...tipo.display(30), color: c.texto }} accessibilityRole="header">Restaurar seu backup</Text>
        <Text style={{ ...tipo.corpo(15), color: c.textoSuave, marginTop: 8 }}>
          Digite a senha que você usava no aparelho antigo e escolha o arquivo .solis.
        </Text>
        <Text style={{ ...tipo.corpo(13, "medium"), color: foco ? c.primario : c.textoSuave, marginTop: 24 }}>Senha do backup</Text>
        <TextInput
          style={[s.input, { color: c.texto, borderBottomColor: foco ? c.primario : c.borda }]}
          secureTextEntry value={senha} onChangeText={setSenha} autoCapitalize="none" autoCorrect={false}
          onFocus={() => setFoco(true)} onBlur={() => setFoco(false)} accessibilityLabel="Senha do backup"
        />
      </View>
      <View style={s.rodape}>
        <BotaoCTA texto="Escolher arquivo .solis" onPress={restaurar} desativado={!senha} carregando={carregando}
          cores={{ fundo: c.primario, texto: c.sobrePrimario, fundoOff: c.borda, textoOff: c.textoSuave }} />
        <Pressable onPress={() => nav.goBack()} style={{ padding: 14, alignItems: "center" }} accessibilityRole="button">
          <Text style={{ ...tipo.corpo(15, "semibold"), color: c.textoSuave }}>Voltar</Text>
        </Pressable>
      </View>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 48 },
  input: { borderBottomWidth: 1.5, paddingTop: 6, paddingBottom: 10, fontSize: 17 },
  rodape: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});

import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View, Pressable } from "react-native";
import { lerConsentimentoCotacoes, salvarConsentimentoCotacoes } from "@solis/dados";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";
import { modeloExiste, baixarModelo, removerModelo } from "../ia/llm";

type Item = { label: string; desc: string };

const ITENS: Item[] = [
  { label: "Configurar acesso", desc: "Senha mestra e biometria" },
  { label: "Exportar backup", desc: "Salvar cópia cifrada dos seus dados" },
  { label: "Privacidade e termos", desc: "LGPD, política e termos de uso" },
  { label: "Sobre o Solis", desc: "Versão, licenças, código aberto" },
];

type StatusIA = "verificando" | "inativo" | "baixando" | "ativo" | "erro";

export function Mais() {
  const tema = useTema();
  const c = tema.cores;

  const [statusIA, setStatusIA] = useState<StatusIA>("verificando");
  const [progresso, setProgresso] = useState(0); // 0–100
  const abortRef = React.useRef<AbortController | null>(null);

  const [cotacoesOnline, setCotacoesOnline] = useState(false);

  useEffect(() => {
    setStatusIA(modeloExiste() ? "ativo" : "inativo");
    lerConsentimentoCotacoes().then(setCotacoesOnline).catch(() => {});
  }, []);

  function alternarCotacoes(ativo: boolean) {
    setCotacoesOnline(ativo);
    salvarConsentimentoCotacoes(ativo).catch(() => setCotacoesOnline(!ativo));
  }

  async function ativarIA() {
    Alert.alert(
      "Ativar IA avançada",
      "Vai baixar cerca de 1,1 GB. Recomendamos usar Wi-Fi. Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Baixar",
          onPress: async () => {
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            setStatusIA("baixando");
            setProgresso(0);
            try {
              await baixarModelo(
                ({ baixado, total }) =>
                  setProgresso(total > 0 ? Math.round((baixado / total) * 100) : 0),
                ctrl.signal
              );
              setStatusIA("ativo");
            } catch {
              setStatusIA("erro");
            }
          },
        },
      ]
    );
  }

  async function desativarIA() {
    Alert.alert("Remover IA avançada", "O modelo será apagado do aparelho. Deseja continuar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          abortRef.current?.abort();
          removerModelo();
          setStatusIA("inativo");
          setProgresso(0);
        },
      },
    ]);
  }

  const labelStatus: Record<StatusIA, string> = {
    verificando: "Verificando...",
    inativo: "Não ativada",
    baixando: `Baixando... ${progresso}%`,
    ativo: "Ativa ✓",
    erro: "Erro no download — tente novamente",
  };

  return (
    <SafeScreen>
      <View style={[s.cabecalho, { paddingHorizontal: tema.spacing.lg }]}>
        <Text style={[tema.font.titulo, { color: c.texto }]}>Mais</Text>
      </View>

      {/* Bloco Solis AI avançada */}
      <View style={[s.blocoIA, { backgroundColor: c.superficie, borderColor: c.borda, marginHorizontal: tema.spacing.lg }]}>
        <View style={{ flex: 1 }}>
          <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "700" }]}>
            🌟 Solis AI avançada
          </Text>
          <Text style={[tema.font.legenda, { color: statusIA === "erro" ? c.erro : c.textoSuave, marginTop: 2 }]}>
            {labelStatus[statusIA]}
          </Text>
          {statusIA === "baixando" && (
            <View style={[s.barraFundo, { backgroundColor: c.borda, marginTop: 8 }]}>
              <View style={[s.barraPreenchida, { backgroundColor: c.primario, width: `${progresso}%` }]} />
            </View>
          )}
        </View>
        {statusIA === "inativo" || statusIA === "erro" ? (
          <Pressable style={[s.botaoIA, { backgroundColor: c.primario }]} onPress={ativarIA}
            accessibilityRole="button" accessibilityLabel="Ativar IA avançada">
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Ativar</Text>
          </Pressable>
        ) : statusIA === "ativo" ? (
          <Pressable style={[s.botaoIA, { backgroundColor: c.erro }]} onPress={desativarIA}
            accessibilityRole="button" accessibilityLabel="Remover modelo da IA">
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Remover</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[s.blocoIA, { backgroundColor: c.superficie, borderColor: c.borda, marginHorizontal: tema.spacing.lg, marginTop: 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "700" }]}>Buscar cotações online</Text>
          <Text style={[tema.font.legenda, { color: c.textoSuave, marginTop: 2 }]}>
            Envia os códigos dos seus ativos (ex.: PETR4) para a brapi.dev. Nenhum outro dado sai do aparelho.
          </Text>
        </View>
        <Switch value={cotacoesOnline} onValueChange={alternarCotacoes}
          accessibilityLabel="Buscar cotações online" />
      </View>

      <View style={{ paddingHorizontal: tema.spacing.lg, gap: 2, marginTop: 16 }}>
        {ITENS.map((item) => (
          <Pressable
            key={item.label}
            style={[s.linha, { backgroundColor: c.superficie, borderBottomColor: c.borda }]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={item.desc}
          >
            <View>
              <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "600" }]}>
                {item.label}
              </Text>
              <Text style={[tema.font.legenda, { color: c.textoSuave, marginTop: 2 }]}>
                {item.desc}
              </Text>
            </View>
            <Text style={{ color: c.textoSuave, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </View>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  cabecalho: { paddingTop: 16, paddingBottom: 12 },
  blocoIA: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 4,
  },
  botaoIA: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  barraFundo: { height: 4, borderRadius: 2, overflow: "hidden" },
  barraPreenchida: { height: 4, borderRadius: 2 },
  linha: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

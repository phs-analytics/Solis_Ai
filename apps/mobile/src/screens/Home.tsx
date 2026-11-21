import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParams } from "../navigation";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";
import { saudacao } from "@solis/core";
import { useBanco } from "../contexto/BancoContext";
import { listarContas, saldoTotal, listarLancamentos, lerPerfil } from "@solis/dados";
import type { Conta, Lancamento } from "@solis/dados";
import { formatarDinheiro } from "../utils/dinheiro";

export function Home() {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();

  const [contas, setContas] = useState<Conta[]>([]);
  const [ultimos, setUltimos] = useState<Lancamento[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [apelido, setApelido] = useState("");

  const carregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const [cs, st, ls, perfil] = await Promise.all([
        listarContas(banco),
        saldoTotal(banco),
        listarLancamentos(banco, { periodo: "30d" }),
        lerPerfil(banco),
      ]);
      setApelido(perfil?.apelido.trim() ?? "");
      setContas(cs);
      setSaldo(st);
      setUltimos(ls.slice(0, 5));
    } finally {
      setAtualizando(false);
    }
  }, [banco]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingHorizontal: tema.spacing.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={carregar} tintColor={c.primario} />
        }
      >
        {/* Cabeçalho */}
        <View style={s.cabecalho}>
          <Text style={[tema.font.corpo, { color: c.textoSuave }]}>
            {saudacao(new Date().getHours())}{apelido ? `, ${apelido}` : ""}
          </Text>
          <View style={[s.avatar, { backgroundColor: c.primarioSuave }]}
            accessibilityRole="button" accessibilityLabel="Perfil">
            <Text style={{ color: c.primario, fontWeight: "700" }}>P</Text>
          </View>
        </View>

        {/* Saldo total */}
        <View style={[s.cardSaldo, { backgroundColor: c.superficie }]}>
          <Text style={[tema.font.legenda, { color: c.textoSuave, marginBottom: 4 }]}>
            Saldo total
          </Text>
          <Text
            style={[tema.font.saldo, { color: saldo < 0 ? c.erro : c.texto }]}
            accessibilityLabel={`Saldo total: ${formatarDinheiro(saldo)}`}
          >
            {formatarDinheiro(saldo)}
          </Text>
        </View>

        {/* Contas */}
        <View style={[s.secaoHeader, s.linhaTitulo]}>
          <Text style={[tema.font.titulo, { color: c.texto }]}>Contas</Text>
          <Pressable onPress={() => nav.navigate("NovaConta")} accessibilityRole="button"
            accessibilityLabel="Criar conta" hitSlop={12}>
            <Text style={{ color: c.primario, fontWeight: "700" }}>+ Criar conta</Text>
          </Pressable>
        </View>

        {contas.length === 0 ? (
          <View style={[s.cardVazio, { borderColor: c.borda }]}>
            <Text style={[tema.font.corpo, { color: c.textoSuave, textAlign: "center" }]}>
              Nenhuma conta ainda
            </Text>
          </View>
        ) : (
          contas.map((conta) => (
            <ContaCard key={conta.id} conta={conta} banco={banco} tema={tema} />
          ))
        )}

        {/* Últimos lançamentos */}
        <View style={s.secaoHeader}>
          <Text style={[tema.font.titulo, { color: c.texto }]}>Últimos 30 dias</Text>
        </View>

        {ultimos.length === 0 ? (
          <View style={[s.cardVazio, { borderColor: c.borda }]}>
            <Text style={[tema.font.corpo, { color: c.textoSuave, textAlign: "center" }]}>
              Nenhum lançamento ainda
            </Text>
          </View>
        ) : (
          ultimos.map((l) => <LancamentoLinha key={l.id} lancamento={l} c={c} tema={tema} />)
        )}
      </ScrollView>
    </SafeScreen>
  );
}

function ContaCard({ conta, banco, tema }: { conta: Conta; banco: ReturnType<typeof useBanco>; tema: ReturnType<typeof useTema> }) {
  const c = tema.cores;
  const [saldo, setSaldo] = useState(0);
  useEffect(() => {
    import("@solis/dados").then(({ saldoConta }) => saldoConta(banco, conta.id).then(setSaldo));
  }, [banco, conta.id]);

  return (
    <View style={[s.cardConta, { backgroundColor: c.superficie }]}
      accessibilityRole="button" accessibilityLabel={`${conta.nome}: ${formatarDinheiro(saldo)}`}>
      <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "600" }]}>{conta.nome}</Text>
      <Text style={[tema.font.corpo, { color: saldo < 0 ? c.erro : c.primario, fontWeight: "700" }]}>
        {formatarDinheiro(saldo)}
      </Text>
    </View>
  );
}

function LancamentoLinha({ lancamento: l, c, tema }: {
  lancamento: Lancamento;
  c: ReturnType<typeof useTema>["cores"];
  tema: ReturnType<typeof useTema>;
}) {
  const isReceita = l.tipo === "receita";
  return (
    <View style={[s.linheLancamento, { borderBottomColor: c.borda }]}>
      <View style={{ flex: 1 }}>
        <Text style={[tema.font.corpo, { color: c.texto }]} numberOfLines={1}>
          {l.descricao || "Sem descrição"}
        </Text>
        <Text style={[tema.font.legenda, { color: c.textoSuave }]}>{l.data}</Text>
      </View>
      <Text style={[tema.font.corpo, { color: isReceita ? c.sucesso : c.erro, fontWeight: "700" }]}>
        {isReceita ? "+" : ""}{formatarDinheiro(l.valorCentavos)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop: 16, paddingBottom: 32 },
  cabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  cardSaldo: { borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  secaoHeader: { marginTop: 24, marginBottom: 10 },
  linhaTitulo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardVazio: { borderRadius: 16, padding: 24, borderWidth: 1, borderStyle: "dashed", alignItems: "center" },
  cardConta: { borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  linheLancamento: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});

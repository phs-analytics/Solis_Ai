import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { Icone } from "../components/Icone";
import { useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";
import { listarAtivos, resumoCarteira, arquivarAtivo, lerConsentimentoCotacoes } from "@solis/dados";
import type { Ativo } from "@solis/dados";
import { buscarIndices, buscarCotacoes } from "@solis/core";
import type { IndiceEconomico, Cotacao } from "@solis/core";
import { formatarDinheiro } from "../utils/dinheiro";

type Visao = "carteira" | "mercado";

export function Investimentos() {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();

  const [visao, setVisao] = useState<Visao>("carteira");
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [cotacoes, setCotacoes] = useState<Record<string, Cotacao>>({});
  const [indices, setIndices] = useState<IndiceEconomico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarAtivos(banco);
      setAtivos(lista);
      // Tickers só saem do aparelho com consentimento (PRIVACY.md, seção 4).
      const online = await lerConsentimentoCotacoes();
      const [cotsArr, inds] = await Promise.allSettled([
        online ? buscarCotacoes(lista.map((a) => a.ticker)) : Promise.resolve([]),
        buscarIndices(),
      ]);
      if (cotsArr.status === "fulfilled") {
        const mapa: Record<string, Cotacao> = {};
        for (const c of cotsArr.value) mapa[c.ticker] = c;
        setCotacoes(mapa);
      }
      if (inds.status === "fulfilled") setIndices(inds.value);
    } catch (e) {
      setErro("Erro ao carregar dados de mercado");
    } finally {
      setCarregando(false);
    }
  }, [banco]);

  useEffect(() => { carregar(); }, [carregar]);

  const precos: Record<string, number> = Object.fromEntries(
    Object.entries(cotacoes).map(([k, v]) => [k, Math.round(v.preco * 100)])
  );
  const resumo: ResumoLocal = ativos.length > 0
    ? {
        totalInvestidoCentavos: ativos.reduce((s, a) => s + Math.round(a.quantidade * a.precoMedioCentavos), 0),
        ativos: ativos.map((a) => {
          const precoAtual = precos[a.ticker] ?? a.precoMedioCentavos;
          const valorAtualCentavos = Math.round(a.quantidade * precoAtual);
          const custoTotal = Math.round(a.quantidade * a.precoMedioCentavos);
          return { ...a, valorAtualCentavos, retornoCentavos: valorAtualCentavos - custoTotal, retornoPct: custoTotal > 0 ? (valorAtualCentavos - custoTotal) / custoTotal : 0 };
        }),
      }
    : null;

  function confirmarArquivar(id: string, ticker: string) {
    Alert.alert("Remover ativo", `Remover ${ticker} da carteira?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => { await arquivarAtivo(banco, id); carregar(); } },
    ]);
  }

  return (
    <SafeScreen>
      {/* Tabs Carteira / Mercado */}
      <View style={[s.tabRow, { borderBottomColor: c.borda }]}>
        {(["carteira", "mercado"] as Visao[]).map((v) => (
          <Pressable key={v} style={[s.tab, visao === v && { borderBottomColor: c.primario, borderBottomWidth: 2 }]}
            onPress={() => setVisao(v)} accessibilityRole="tab" accessibilityState={{ selected: visao === v }}>
            <Text style={[tema.font.corpo, { color: visao === v ? c.primario : c.textoSuave, fontWeight: "600" }]}>
              {v === "carteira" ? "Minha carteira" : "Mercado"}
            </Text>
          </Pressable>
        ))}
      </View>

      {carregando ? (
        <View style={s.centro}><ActivityIndicator color={c.primario} /></View>
      ) : visao === "carteira" ? (
        <CarteiraView
          resumo={resumo}
          cotacoes={cotacoes}
          onAtualizar={carregar}
          onArquivar={confirmarArquivar}
          tema={tema} c={c}
        />
      ) : (
        <MercadoView indices={indices} onAtualizar={carregar} erro={erro} tema={tema} c={c} />
      )}
    </SafeScreen>
  );
}

// ── Carteira ──────────────────────────────────────────────────────────────

type AtivoComRetorno = Ativo & {
  valorAtualCentavos: number;
  retornoCentavos: number;
  retornoPct: number;
};

type ResumoLocal = {
  totalInvestidoCentavos: number;
  ativos: AtivoComRetorno[];
} | null;

type CarteiraProps = {
  resumo: ResumoLocal;
  cotacoes: Record<string, Cotacao>;
  onAtualizar: () => void;
  onArquivar: (id: string, ticker: string) => void;
  tema: ReturnType<typeof useTema>;
  c: ReturnType<typeof useTema>["cores"];
};

function CarteiraView({ resumo, cotacoes, onAtualizar, onArquivar, tema, c }: CarteiraProps) {
  if (!resumo || resumo.ativos.length === 0) {
    return (
      <View style={s.centro}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.primarioSuave, alignItems: "center", justifyContent: "center" }}>
          <Icone nome="chart-pie" tamanho={32} cor={c.primario} />
        </View>
        <Text style={[tema.font.titulo, { color: c.texto, marginTop: 12 }]}>Carteira vazia</Text>
        <Text style={[tema.font.corpo, { color: c.textoSuave, marginTop: 4, textAlign: "center" }]}>
          Registre seus ativos manualmente para acompanhar a carteira.
        </Text>
      </View>
    );
  }

  const totalRetorno = resumo.ativos.reduce((s, a) => s + a.retornoCentavos, 0);
  const retornoPct = resumo.totalInvestidoCentavos > 0
    ? totalRetorno / resumo.totalInvestidoCentavos : 0;

  return (
    <FlatList
      data={resumo.ativos}
      keyExtractor={(a) => a.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onAtualizar} tintColor={c.primario} />}
      ListHeaderComponent={() => (
        <View style={[s.card, { backgroundColor: c.primario, margin: 16, marginBottom: 8 }]}>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>Valor total</Text>
          <Text style={{ color: c.sobrePrimario, fontSize: 28, fontWeight: "800", marginTop: 2 }}>
            {formatarDinheiro(resumo.totalInvestidoCentavos)}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 8, gap: 16 }}>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Retorno</Text>
              <Text style={{ color: totalRetorno >= 0 ? "#A8F0C6" : "#FFB3B3", fontWeight: "700", fontSize: 15 }}>
                {totalRetorno >= 0 ? "+" : ""}{formatarDinheiro(totalRetorno)}
              </Text>
            </View>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>%</Text>
              <Text style={{ color: retornoPct >= 0 ? "#A8F0C6" : "#FFB3B3", fontWeight: "700", fontSize: 15 }}>
                {retornoPct >= 0 ? "+" : ""}{(retornoPct * 100).toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      )}
      renderItem={({ item: a }) => {
        const cot = cotacoes[a.ticker];
        const variacaoPct = cot?.variacao;
        return (
          <Pressable style={[s.linha, { borderBottomColor: c.borda }]}
            onLongPress={() => onArquivar(a.id, a.ticker)}
            accessibilityRole="button" accessibilityLabel={`${a.ticker} ${a.nome}`}
            accessibilityHint="Toque longo para remover">
            <View style={[s.badge, { backgroundColor: c.primarioSuave }]}>
              <Text style={{ color: c.primario, fontWeight: "800", fontSize: 13 }}>{a.ticker.slice(0, 4)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "700" }]} numberOfLines={1}>{a.ticker}</Text>
              <Text style={[tema.font.legenda, { color: c.textoSuave }]} numberOfLines={1}>{a.nome}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "700" }]}>
                {formatarDinheiro(a.valorAtualCentavos)}
              </Text>
              {variacaoPct !== undefined && (
                <Text style={[tema.font.legenda, { color: variacaoPct >= 0 ? c.sucesso : c.erro }]}>
                  {variacaoPct >= 0 ? "▲" : "▼"} {Math.abs(variacaoPct).toFixed(2)}%
                </Text>
              )}
            </View>
          </Pressable>
        );
      }}
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  );
}

// ── Mercado ───────────────────────────────────────────────────────────────

function MercadoView({ indices, onAtualizar, erro, tema, c }: {
  indices: IndiceEconomico[];
  onAtualizar: () => void;
  erro: string | null;
  tema: ReturnType<typeof useTema>;
  c: ReturnType<typeof useTema>["cores"];
}) {
  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={false} onRefresh={onAtualizar} tintColor={c.primario} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

      {erro && (
        <View style={[s.aviso, { backgroundColor: c.primarioSuave }]}>
          <Text style={[tema.font.legenda, { color: c.aviso }]}>{erro} · Puxe para tentar de novo.</Text>
        </View>
      )}

      <Text style={[tema.font.titulo, { color: c.texto, marginBottom: 12 }]}>Índices econômicos</Text>
      {indices.length === 0 ? (
        <Text style={[tema.font.legenda, { color: c.textoSuave }]}>Sem dados (verifique a conexão)</Text>
      ) : (
        <View style={[s.card, { backgroundColor: c.superficie }]}>
          {indices.map((ind, i) => (
            <View key={ind.nome} style={[s.indLinha, i > 0 && { borderTopColor: c.borda, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <View style={{ flex: 1 }}>
                <Text style={[tema.font.corpo, { color: c.texto, fontWeight: "600" }]}>{ind.nome}</Text>
                <Text style={[tema.font.legenda, { color: c.textoSuave }]}>{ind.data}</Text>
              </View>
              <Text style={[tema.font.corpo, { color: c.primario, fontWeight: "800" }]}>
                {ind.valor.toFixed(2)}{ind.unidade.startsWith("%") ? "%" : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={[s.aviso, { backgroundColor: c.primarioSuave, marginTop: 24, flexDirection: "row", gap: 8 }]}>
        <Icone nome="triangle-warning" tamanho={14} cor={c.aviso} />
        <Text style={[tema.font.legenda, { color: c.textoSuave, flex: 1 }]}>
          Essas informações são apenas para consulta. Não constituem recomendação de investimento.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tabRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  centro: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  card: { borderRadius: 16, padding: 16 },
  linha: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  badge: { width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  aviso: { borderRadius: 10, padding: 12 },
  indLinha: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
});

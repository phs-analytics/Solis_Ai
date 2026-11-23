import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { progressoCiclo, saudacao, type PeriodoSaldo } from "@solis/core";
import { lerPerfil, lerPrivacidade, montarHome, salvarPrivacidade } from "@solis/dados";
import type { PrevisaoHome, ResumoHome, TipoConta } from "@solis/dados";
import type { RootStackParams } from "../navigation";
import { SafeScreen } from "../components/SafeScreen";
import { Texto as Text } from "../components/Texto";
import { Icone, type NomeIcone } from "../components/Icone";
import { Tocavel } from "../components/Tocavel";
import { CategoryIcon, corCategoria } from "../components/CategoryIcon";
import { GraficoSaldo } from "../components/GraficoSaldo";
import { AnelProgresso } from "../components/AnelProgresso";
import { useNumeroRolando } from "../components/useNumeroRolando";
import { useBanco } from "../contexto/BancoContext";
import { tipo, useTema } from "../theme";
import { formatarDinheiro } from "../utils/dinheiro";
import { WalletCardDeck, larguraDeck } from "../onboarding/WalletCardDeck";
import type { Variante, WalletCardProps } from "../onboarding/WalletCard";

const MOLA = { stiffness: 280, damping: 26 };
const PERIODOS: PeriodoSaldo[] = ["7D", "1M", "3M", "6M", "1A"];
const NOME_PERIODO: Record<PeriodoSaldo, string> = { "7D": "7 dias", "1M": "1 mês", "3M": "3 meses", "6M": "6 meses", "1A": "1 ano" };
const OCULTO = "R$ ••••••";
const DIA_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
type Cores = ReturnType<typeof useTema>["cores"];
type Filtro = "todos" | "despesa" | "receita";

const CONTA_VISUAL: Record<TipoConta, { sub: string; variante: Variante; icone: NomeIcone }> = {
  corrente: { sub: "Conta bancária", variante: "fantastic", icone: "bank" },
  poupanca: { sub: "Reserva", variante: "truffle", icone: "piggy-bank" },
  dinheiro: { sub: "Dinheiro vivo", variante: "musgo", icone: "money-bill-wave" },
  outro: { sub: "Outra conta", variante: "abyssal", icone: "wallet" },
};

function quando(diasAte: number): string {
  if (diasAte < 0) return `Atrasado ${-diasAte} ${diasAte === -1 ? "dia" : "dias"}`;
  if (diasAte === 0) return "Hoje";
  if (diasAte === 1) return "Amanhã";
  return `Em ${diasAte} dias`;
}

function diasDesde(iso: string): number {
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  return Math.round((hoje.getTime() - new Date(`${iso}T12:00:00`).getTime()) / 86_400_000);
}
const grupoData = (iso: string) => { const d = diasDesde(iso); return d === 0 ? "HOJE" : d === 1 ? "ONTEM" : `${iso.slice(8, 10)}/${iso.slice(5, 7)}`; };
const iniciais = (n: string) => n.trim().split(/\s+/).filter(Boolean).map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : "")).join("").toUpperCase() || "S";
const diaSemana = (iso: string) => DIA_SEMANA[new Date(`${iso}T12:00:00`).getDay()]!;

export function Home() {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const reduzir = useReducedMotion();
  const { width } = useWindowDimensions();

  const [dados, setDados] = useState<ResumoHome | null>(null);
  const [nome, setNome] = useState({ completo: "", apelido: "" });
  const [oculto, setOculto] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoSaldo>("1M");
  const [contaIdx, setContaIdx] = useState(0);
  const [dicaFechada, setDicaFechada] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [entrada, setEntrada] = useState(0);
  const [larguraGrafico, setLarguraGrafico] = useState(0);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [diaSel, setDiaSel] = useState<string | null>(null);

  useEffect(() => { lerPrivacidade().then(setOculto).catch(() => {}); }, []);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const [resumo, perfil] = await Promise.all([montarHome(banco), lerPerfil(banco)]);
      setDados(resumo);
      setContaIdx((i) => Math.min(i, Math.max(0, resumo.contas.length - 1)));
      if (perfil) setNome({ completo: perfil.nomeCompleto, apelido: perfil.apelido.trim() });
    } finally {
      setAtualizando(false);
    }
  }, [banco]);

  useFocusEffect(useCallback(() => { carregar(); setEntrada((n) => n + 1); }, [carregar]));

  const saldoRolando = useNumeroRolando(dados?.saldoTotal ?? 0, { inicial: 0, reduzir });
  function alternarPrivacidade() { setOculto((o) => { salvarPrivacidade(!o).catch(() => {}); return !o; }); }

  const entra = (i: number) => (reduzir ? undefined
    : FadeInDown.delay(i * 50).withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] }).springify().stiffness(MOLA.stiffness).damping(MOLA.damping));

  const serie = dados?.series[periodo];
  const variacao = serie?.variacaoPct ?? null;
  const apelido = nome.apelido || "você";
  const sobra = (dados?.fluxo30.entradas ?? 0) - (dados?.fluxo30.saidas ?? 0);
  const textoSaldo = formatarDinheiro(saldoRolando);
  const virgula = textoSaldo.lastIndexOf(",");
  const cartoes: Omit<WalletCardProps, "width">[] = (dados?.contas ?? []).map((ct) => ({
    title: ct.nome, subtitle: CONTA_VISUAL[ct.tipo].sub, balance: Math.abs(ct.saldoCentavos), negativo: ct.saldoCentavos < 0,
    variant: CONTA_VISUAL[ct.tipo].variante, badgeIcon: CONTA_VISUAL[ct.tipo].icone, tipoIcon: "shield-check",
    holder: nome.apelido || "Solis", isBalanceHidden: oculto,
  }));
  const abrirLancamento = (p: RootStackParams["NovoLancamento"]) => nav.navigate("NovoLancamento", p);
  const irAba = (screen: string, params?: object) => nav.navigate("App", { screen, params } as never);

  const acoes: [string, NomeIcone, () => void][] = [
    ["Transferir", "exchange", () => abrirLancamento({ tipo: "transferencia" })],
    ["Solis AI", "sparkles", () => irAba("Chat")],
    ["Metas", "bullseye", () => irAba("Metas")],
    ["Investir", "chart-line-up", () => irAba("Investimentos")],
    ["Importar", "file-invoice", () => nav.navigate("Importacao")],
    ["Bancos", "bank", () => nav.navigate("ConexaoBancaria")],
    ["Nova conta", "plus", () => nav.navigate("NovaConta")],
    ["Lançamentos", "list", () => irAba("Lancamentos")],
  ];

  const maxDia = Math.max(1, ...(dados?.diario7 ?? []).map((d) => d.centavos));
  const selecionado = diaSel ?? dados?.diario7[dados.diario7.length - 1]?.data ?? null;
  // Filtra entre os 30 últimos e mostra até 6, para "Receitas" não ficar vazio só porque o salário não é dos últimos dias.
  const itens = (dados?.ultimos ?? []).filter((l) => filtro === "todos" ? true : filtro === "despesa" ? l.valorCentavos < 0 && l.tipo !== "transferencia" : l.valorCentavos > 0 && l.tipo !== "transferencia").slice(0, 6);
  const grupos = itens.reduce<{ rotulo: string; lista: typeof itens }[]>((acc, l) => {
    const r = grupoData(l.data);
    const g = acc.find((x) => x.rotulo === r);
    if (g) g.lista.push(l); else acc.push({ rotulo: r, lista: [l] });
    return acc;
  }, []);

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={carregar} tintColor={c.primario} colors={[c.primario]} />}>
        <LinearGradient pointerEvents="none" colors={[`${c.primario}24`, `${c.primario}00`]} style={s.brilhoTopo} />

        {/* Cabeçalho: pílula do perfil e botões redondos */}
        <Animated.View key={`0-${entrada}`} entering={entra(0)} style={[s.linha, s.px]}>
          <Tocavel onPress={() => irAba("Mais")} style={[s.perfil, { backgroundColor: c.superficie, borderColor: c.borda }]} accessibilityRole="button"
            accessibilityLabel={`Perfil de ${apelido}. ${saudacao(new Date().getHours()).replace("!", "")}`}>
            <View style={[s.avatar, { backgroundColor: c.primarioSuave }]}>
              <Text style={{ ...tipo.marca(13), color: c.primario }}>{iniciais(nome.completo || nome.apelido)}</Text>
            </View>
            <View style={{ marginLeft: 10, flexShrink: 1 }}>
              <Text style={{ ...tipo.corpo(11), lineHeight: 14, color: c.textoSuave }}>{saudacao(new Date().getHours()).replace("!", ",")}</Text>
              <Text style={{ fontFamily: tipo.marca(15).fontFamily, fontSize: 15, lineHeight: 19, color: c.texto }} numberOfLines={1}>{apelido}</Text>
            </View>
            <Icone nome="angle-small-right" tamanho={16} cor={c.textoSuave} style={{ marginLeft: 6 }} />
          </Tocavel>
          <View style={{ flex: 1 }} />
          <Tocavel onPress={alternarPrivacidade} style={[s.redondo, { backgroundColor: c.superficie, borderColor: c.borda }]}
            accessibilityRole="switch" accessibilityState={{ checked: oculto }} accessibilityLabel={oculto ? "Mostrar valores" : "Esconder valores"}>
            <Icone nome={oculto ? "eye-crossed" : "eye"} tamanho={18} cor={c.texto} />
          </Tocavel>
          <Tocavel onPress={() => irAba("Lancamentos", { focarBusca: Date.now() })}
            style={[s.redondo, { backgroundColor: c.superficie, borderColor: c.borda, marginLeft: 8 }]} accessibilityRole="button" accessibilityLabel="Buscar lançamentos">
            <Icone nome="search" tamanho={18} cor={c.texto} />
          </Tocavel>
        </Animated.View>

        {/* Saldo, pílula e botões principais */}
        <Animated.View key={`1-${entrada}`} entering={entra(1)} style={s.px}>
          <Text style={{ ...tipo.corpo(14, "medium"), color: c.textoSuave }}>Saldo total</Text>
          {oculto
            ? <Text style={{ ...tipo.valor(40), letterSpacing: -1.2, color: c.texto, marginTop: 2 }} accessibilityLabel="Saldo oculto">{OCULTO}</Text>
            : (
              <Text style={{ ...tipo.valor(40), letterSpacing: -1.2, color: saldoRolando < 0 ? c.erro : c.texto, marginTop: 2 }} accessibilityLabel={`Saldo total: ${formatarDinheiro(dados?.saldoTotal ?? 0)}`}>
                {textoSaldo.slice(0, virgula)}
                <Text style={{ ...tipo.valor(40), letterSpacing: -1.2, color: c.textoSuave, opacity: 0.55 }}>{textoSaldo.slice(virgula)}</Text>
              </Text>
            )}
          <View style={[s.pilulaInfo, { backgroundColor: c.superficie, borderColor: c.borda }]}
            accessibilityLabel={`${sobra >= 0 ? "Sobrou" : "Faltou"} ${oculto ? "valor oculto" : formatarDinheiro(Math.abs(sobra))} neste mês`}>
            <Icone nome={sobra >= 0 ? "arrow-trend-up" : "arrow-trend-down"} tamanho={12} cor={sobra >= 0 ? c.sucesso : c.erro} />
            <Text style={{ ...tipo.corpo(12, "medium"), lineHeight: 16, color: c.texto }}>
              {sobra >= 0 ? "Sobrou" : "Faltou"} {oculto ? OCULTO : formatarDinheiro(Math.abs(sobra))} neste mês
            </Text>
          </View>
          <View style={[s.linha, { gap: 12, marginTop: 18 }]}>
            <Tocavel onPress={() => abrirLancamento({ tipo: "despesa" })} style={[s.botaoGrande, { backgroundColor: c.superficie, borderColor: c.borda, borderWidth: 1 }]}
              accessibilityRole="button" accessibilityLabel="Novo lançamento: Despesa">
              <Icone nome="arrow-small-up" tamanho={18} cor={c.texto} />
              <Text style={{ ...tipo.botao(15), color: c.texto }}>Despesa</Text>
            </Tocavel>
            <Tocavel onPress={() => abrirLancamento({ tipo: "receita" })} style={[s.botaoGrande, { backgroundColor: c.primario }]}
              accessibilityRole="button" accessibilityLabel="Novo lançamento: Receita">
              <Icone nome="arrow-small-down" tamanho={18} cor={c.sobrePrimario} />
              <Text style={{ ...tipo.botao(15), color: c.sobrePrimario }}>Receita</Text>
            </Tocavel>
          </View>
        </Animated.View>

        {/* Gráfico de evolução */}
        <Animated.View key={`2-${entrada}`} entering={entra(2)} style={s.px}>
          <View style={[s.card, { backgroundColor: c.superficie, borderColor: c.borda }]}>
            <View style={[s.linha, { justifyContent: "space-between", gap: 8 }]}>
              <Text style={{ ...tipo.corpo(13, "semibold"), color: c.texto }}>Evolução do saldo</Text>
              {variacao !== null && (
                <View style={[s.badge, { backgroundColor: c.fundo }]}
                  accessibilityLabel={`Variação de ${variacao.toFixed(1).replace(".", ",")} por cento em ${NOME_PERIODO[periodo]}`}>
                  <Icone nome={variacao >= 0 ? "arrow-trend-up" : "arrow-trend-down"} tamanho={11} cor={variacao >= 0 ? c.sucesso : c.erro} />
                  <Text style={{ ...tipo.corpo(12, "medium"), lineHeight: 16, color: c.texto }}>
                    {variacao >= 0 ? "+" : ""}{variacao.toFixed(1).replace(".", ",")}% em {NOME_PERIODO[periodo]}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ marginTop: 12 }} onLayout={(e) => setLarguraGrafico(e.nativeEvent.layout.width)}>
              <GraficoSaldo pontos={serie?.pontos ?? []} largura={larguraGrafico} cor={c.primario} reduzirMovimento={reduzir}
                rotulo={`Gráfico de evolução do saldo no período de ${NOME_PERIODO[periodo]}`} />
            </View>
            <SeletorPeriodo valor={periodo} aoMudar={setPeriodo} />
          </View>
        </Animated.View>

        {/* Minhas contas */}
        <Animated.View key={`3-${entrada}`} entering={entra(3)}>
          <View style={[s.linha, s.px, { justifyContent: "space-between", marginBottom: 12 }]}>
            <Text style={[s.tituloSecao, { color: c.texto }]} accessibilityRole="header">Minhas contas</Text>
            <Tocavel onPress={() => nav.navigate("NovaConta")} style={[s.pilula, { borderColor: c.borda }]} accessibilityRole="button" accessibilityLabel="Criar nova conta">
              <Text style={{ ...tipo.corpo(13, "semibold"), lineHeight: 18, color: c.primario }}>+ Nova conta</Text>
            </Tocavel>
          </View>
          {cartoes.length > 0 ? (
            <View style={{ alignItems: "center" }}>
              <WalletCardDeck width={larguraDeck(width)} frente={cartoes[contaIdx]!} cartoes={cartoes} ativo={contaIdx} fase="conta" aberto aoTrocar={setContaIdx} />
            </View>
          ) : (
            <Tocavel onPress={() => nav.navigate("NovaConta")} style={[s.vazio, s.mx, { borderColor: c.borda }]} accessibilityRole="button">
              <Text style={{ ...tipo.corpo(14), color: c.textoSuave, textAlign: "center" }}>Nenhuma conta ainda. Toque para criar a primeira.</Text>
            </Tocavel>
          )}
        </Animated.View>

        {/* Ações rápidas: painel 4 x 2 */}
        <Animated.View key={`4-${entrada}`} entering={entra(4)} style={s.px}>
          <Text style={[s.tituloSecao, { color: c.texto, marginBottom: 12 }]} accessibilityRole="header">Ações rápidas</Text>
          <View style={[s.painel, { backgroundColor: c.superficie, borderColor: c.borda }]}>
            {acoes.map(([rotulo, ic, acao]) => (
              <Tocavel key={rotulo} onPress={acao} style={s.acaoItem} accessibilityRole="button" accessibilityLabel={rotulo}>
                <View style={[s.acaoIcone, { backgroundColor: rotulo === "Solis AI" ? c.primario : c.fundo }]}>
                  <Icone nome={ic} tamanho={19} cor={rotulo === "Solis AI" ? c.sobrePrimario : c.texto} />
                </View>
                <Text style={{ ...tipo.corpo(12, "medium"), lineHeight: 16, color: c.textoSuave, textAlign: "center" }} numberOfLines={1}>{rotulo}</Text>
              </Tocavel>
            ))}
          </View>
        </Animated.View>

        {/* Estatísticas: gastos por categoria, meta e últimos 7 dias */}
        <Animated.View key={`5-${entrada}`} entering={entra(5)} style={[s.px, { gap: 12 }]}>
          <View style={[s.linha, { gap: 12, alignItems: "stretch" }]}>
            <View style={[s.tile, { backgroundColor: c.superficie, borderColor: c.borda }]}>
              <Text style={[s.rotuloTile, { color: c.textoSuave }]}>Gastos do mês</Text>
              <Text style={{ ...tipo.valor(19), color: c.texto, marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>{oculto ? OCULTO : formatarDinheiro(dados?.fluxo30.saidas ?? 0)}</Text>
              {(dados?.categorias.length ?? 0) > 0 ? (
                <>
                  <View style={s.segmentos} accessibilityLabel={`Gastos por categoria: ${dados!.categorias.map((f) => `${f.nome} ${f.pct} por cento`).join(", ")}`}>
                    {dados!.categorias.map((f) => <View key={String(f.categoriaId)} style={{ flex: Math.max(f.pct, 3), backgroundColor: corCategoria(f.categoriaId) }} />)}
                  </View>
                  {dados!.categorias.slice(0, 3).map((f) => (
                    <View key={String(f.categoriaId)} style={[s.linha, { marginTop: 6, gap: 6 }]}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: corCategoria(f.categoriaId) }} />
                      <Text style={{ ...tipo.corpo(11), lineHeight: 15, color: c.textoSuave, flex: 1 }} numberOfLines={1}>{f.nome}</Text>
                      <Text style={{ ...tipo.corpo(11, "semibold"), lineHeight: 15, color: c.texto }}>{f.pct}%</Text>
                    </View>
                  ))}
                </>
              ) : <Text style={{ ...tipo.corpo(12), color: c.textoSuave, marginTop: 10 }}>Sem gastos nos últimos 30 dias.</Text>}
            </View>
            <Tocavel onPress={() => irAba("Metas")} style={[s.tile, { backgroundColor: c.superficie, borderColor: c.borda }]} accessibilityRole="button"
              accessibilityLabel={dados?.meta ? `Meta ${dados.meta.nome}: ${Math.round(dados.meta.pct * 100)} por cento` : "Criar uma meta"}>
              <Text style={[s.rotuloTile, { color: c.textoSuave }]}>{dados?.meta ? "Meta" : "Metas"}</Text>
              {dados?.meta ? (
                <>
                  <View style={{ marginTop: 10, alignSelf: "flex-start" }}>
                    <AnelProgresso valor={dados.meta.pct} tamanho={64} espessura={7} cor={c.primario} fundo={c.fundo} reduzirMovimento={reduzir}>
                      <Text style={{ ...tipo.valor(15), color: c.texto }}>{Math.round(dados.meta.pct * 100)}%</Text>
                    </AnelProgresso>
                  </View>
                  <Text style={{ ...tipo.corpo(13, "semibold"), color: c.texto, marginTop: 10 }} numberOfLines={1}>{dados.meta.nome}</Text>
                  <Text style={{ ...tipo.corpo(11), lineHeight: 15, color: c.textoSuave }} numberOfLines={1}>
                    {oculto ? OCULTO : `${formatarDinheiro(dados.meta.atualCentavos)} de ${formatarDinheiro(dados.meta.alvoCentavos)}`}
                  </Text>
                </>
              ) : <Text style={{ ...tipo.corpo(12), color: c.textoSuave, marginTop: 10 }}>Crie um cofrinho para acompanhar aqui.</Text>}
            </Tocavel>
          </View>

          <View style={[s.card, { backgroundColor: c.superficie, borderColor: c.borda }]}>
            <View style={[s.linha, { justifyContent: "space-between" }]}>
              <Text style={{ ...tipo.corpo(13, "semibold"), color: c.texto }}>Gastos dos últimos 7 dias</Text>
              <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>Toque numa barra</Text>
            </View>
            <View style={s.barras} accessibilityRole="adjustable" accessibilityLabel="Gastos por dia nos últimos 7 dias">
              {(dados?.diario7 ?? []).map((d) => {
                const on = d.data === selecionado;
                return (
                  <Tocavel key={d.data} onPress={() => setDiaSel(d.data)} style={s.colunaBarra} hitSlop={{ top: 8, bottom: 8 }} accessibilityRole="button"
                    accessibilityLabel={`${grupoData(d.data) === "HOJE" ? "Hoje" : grupoData(d.data)}: ${oculto ? "valor oculto" : formatarDinheiro(d.centavos)}`}>
                    <View style={{ height: 22, justifyContent: "flex-end" }}>
                      {on && (
                        <View style={[s.dica, { backgroundColor: c.texto }]}>
                          <Text style={{ ...tipo.corpo(10, "semibold"), lineHeight: 13, color: c.fundo }} numberOfLines={1}>{oculto ? "•••" : formatarDinheiro(d.centavos).replace(/\s?R\$\s?/, "").replace(/,\d\d$/, "")}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ height: 76, justifyContent: "flex-end" }}>
                      <View style={{ height: Math.max(4, (d.centavos / maxDia) * 76), borderRadius: 6, backgroundColor: on ? c.primario : c.borda }} />
                    </View>
                    <Text style={{ ...tipo.corpo(11, on ? "semibold" : "regular"), lineHeight: 15, color: on ? c.texto : c.textoSuave, marginTop: 6 }}>{diaSemana(d.data)}</Text>
                  </Tocavel>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Possíveis lançamentos futuros */}
        <Animated.View key={`6-${entrada}`} entering={entra(6)}>
          <View style={s.px}>
            <Text style={[s.tituloSecao, { color: c.texto }]} accessibilityRole="header">Possíveis lançamentos futuros</Text>
            <View style={[s.badge, { borderWidth: 1, borderColor: c.borda, alignSelf: "flex-start", marginTop: 6, marginBottom: 12 }]}>
              <Icone nome="clock" tamanho={10} cor={c.textoSuave} />
              <Text style={{ ...tipo.corpo(11, "medium"), lineHeight: 14, color: c.textoSuave }}>Baseado nos últimos 3 meses</Text>
            </View>
          </View>
          {dados && dados.previsoes.length === 0 && !dados.historicoSuficiente && !dicaFechada ? (
            <View style={[s.aviso, s.mx, { backgroundColor: c.superficie, borderColor: c.borda }]}>
              <Text style={{ ...tipo.corpo(14), color: c.textoSuave, flex: 1 }}>
                Continue registrando seus gastos. Depois de 2 meses, o Solis identifica suas assinaturas e contas fixas automaticamente.
              </Text>
              <Tocavel onPress={() => setDicaFechada(true)} style={s.fechar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dispensar aviso">
                <Icone nome="cross-small" tamanho={16} cor={c.textoSuave} />
              </Tocavel>
            </View>
          ) : dados && dados.previsoes.length === 0 ? (
            <Text style={[s.px, { ...tipo.corpo(14), color: c.textoSuave }]}>Nenhuma conta fixa prevista para os próximos 30 dias.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {(dados?.previsoes ?? []).slice(0, 8).map((p) => (
                <CartaoPrevisao key={`${p.origem}-${p.chave}`} p={p} oculto={oculto} c={c} reduzir={reduzir}
                  aoRegistrar={() => abrirLancamento({
                    tipo: p.centavos < 0 ? "despesa" : "receita", descricao: p.desc, valorCentavos: Math.abs(p.centavos),
                    categoriaId: p.categoriaId ?? undefined, contaId: p.contaId ?? undefined,
                  })} />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* Últimos lançamentos, agrupados por dia */}
        <Animated.View key={`7-${entrada}`} entering={entra(7)} style={s.px}>
          <View style={[s.linha, { justifyContent: "space-between" }]}>
            <Text style={[s.tituloSecao, { color: c.texto }]} accessibilityRole="header">Últimos lançamentos</Text>
            <Tocavel onPress={() => irAba("Lancamentos")} accessibilityRole="button" style={{ paddingVertical: 14, paddingLeft: 12 }}>
              <Text style={{ ...tipo.corpo(14, "semibold"), lineHeight: 20, color: c.primario }}>Ver todos</Text>
            </Tocavel>
          </View>
          <View style={[s.linha, { gap: 8, marginBottom: 6 }]} accessibilityRole="tablist">
            {([["todos", "Todos"], ["despesa", "Despesas"], ["receita", "Receitas"]] as [Filtro, string][]).map(([k, r]) => (
              <Tocavel key={k} onPress={() => setFiltro(k)} accessibilityRole="tab" accessibilityState={{ selected: filtro === k }} hitSlop={{ top: 6, bottom: 6 }}
                style={[s.chip, filtro === k ? { backgroundColor: c.primario, borderColor: c.primario } : { backgroundColor: c.superficie, borderColor: c.borda }]}>
                <Text style={{ ...tipo.corpo(13, "semibold"), lineHeight: 18, color: filtro === k ? c.sobrePrimario : c.textoSuave }}>{r}</Text>
              </Tocavel>
            ))}
          </View>
          {dados && grupos.length === 0 && <Text style={{ ...tipo.corpo(14), color: c.textoSuave, marginTop: 12 }}>Nenhum lançamento {filtro === "todos" ? "ainda" : "deste tipo"}.</Text>}
          {grupos.map((g) => (
            <View key={g.rotulo}>
              <Text style={{ ...tipo.corpo(11, "semibold"), letterSpacing: 1, color: c.textoSuave, marginTop: 14, marginBottom: 2 }}>{g.rotulo}</Text>
              {g.lista.map((l) => {
                const entrou = l.valorCentavos >= 0 && l.tipo !== "transferencia";
                const texto = oculto ? OCULTO : `${entrou ? "+" : l.valorCentavos < 0 ? "−" : ""}${formatarDinheiro(Math.abs(l.valorCentavos))}`;
                return (
                  <Tocavel key={l.id} style={[s.item, { borderBottomColor: c.borda }]} accessibilityRole="button"
                    accessibilityLabel={`${l.descricao || "Sem descrição"}, ${oculto ? "valor oculto" : texto}, ${l.contaNome}, ${grupoData(l.data).toLowerCase()}`}
                    onPress={() => irAba("Lancamentos")}>
                    <CategoryIcon categoriaId={l.categoriaId} tipo={l.tipo} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ ...tipo.corpo(15, "medium"), lineHeight: 20, color: c.texto }} numberOfLines={1}>{l.descricao || "Sem descrição"}</Text>
                      <Text style={{ ...tipo.corpo(12), lineHeight: 17, color: c.textoSuave }} numberOfLines={1}>{l.contaNome}</Text>
                    </View>
                    <Text style={{ ...tipo.valor(15, false), color: entrou ? c.sucesso : c.texto }}>{texto}</Text>
                  </Tocavel>
                );
              })}
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </SafeScreen>
  );
}

function CartaoPrevisao({ p, oculto, c, reduzir, aoRegistrar }: { p: PrevisaoHome; oculto: boolean; c: Cores; reduzir: boolean; aoRegistrar: () => void }) {
  const valor = oculto ? OCULTO : `~${formatarDinheiro(Math.abs(p.centavos))}`;
  const dia = Number(p.dataPrevista.slice(8, 10));
  return (
    <View style={[s.previsao, { backgroundColor: c.superficie, borderColor: c.borda }]} accessible
      accessibilityLabel={`Possível lançamento futuro: ${p.desc}, valor estimado ${oculto ? "oculto" : formatarDinheiro(Math.abs(p.centavos))}, ${quando(p.diasAte).toLowerCase()}. Toque em Registrar para confirmar`}
      accessibilityActions={[{ name: "activate", label: "Registrar" }]} onAccessibilityAction={aoRegistrar}>
      <View style={[s.linha, { justifyContent: "space-between" }]}>
        <AnelProgresso valor={progressoCiclo(p.diasAte)} tamanho={48} espessura={5} cor={p.diasAte <= 3 ? c.primario : c.textoSuave} fundo={c.fundo} reduzirMovimento={reduzir}>
          <CategoryIcon categoriaId={p.categoriaId} tipo={p.centavos < 0 ? "despesa" : "receita"} tamanho={30} recorrente />
        </AnelProgresso>
        <View style={[s.badge, { backgroundColor: p.diasAte <= 3 ? c.primarioSuave : c.fundo }]}>
          <Text style={{ ...tipo.corpo(11, "semibold"), lineHeight: 14, color: p.diasAte <= 3 ? c.primario : c.textoSuave }}>{quando(p.diasAte)}</Text>
        </View>
      </View>
      <Text style={{ ...tipo.corpo(15, "semibold"), lineHeight: 20, color: c.texto, marginTop: 12 }} numberOfLines={1}>{p.desc}</Text>
      <Text style={{ ...tipo.corpo(12), lineHeight: 17, color: c.textoSuave }} numberOfLines={1}>Dia {dia}{p.origem === "cadastrada" ? " • Fixo" : ""}</Text>
      <Text style={{ ...tipo.valor(17, false), color: c.texto, marginTop: 6 }}>{valor}</Text>
      <Tocavel onPress={aoRegistrar} style={[s.registrar, { backgroundColor: c.primario }]} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Registrar ${p.desc}`}>
        <Text style={{ ...tipo.botao(13), color: c.sobrePrimario }}>Registrar</Text>
      </Tocavel>
    </View>
  );
}

function SeletorPeriodo({ valor, aoMudar }: { valor: PeriodoSaldo; aoMudar: (p: PeriodoSaldo) => void }) {
  const c = useTema().cores;
  const [largura, setLargura] = useState(0);
  const i = PERIODOS.indexOf(valor);
  const pos = useSharedValue(i);
  useEffect(() => { pos.value = withSpring(i, MOLA); }, [i]);
  const ind = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * (largura / PERIODOS.length) }] }));
  return (
    <View style={[s.periodos, { backgroundColor: c.fundo }]} onLayout={(e) => setLargura(e.nativeEvent.layout.width - 6)} accessibilityRole="tablist">
      {largura > 0 && <Animated.View style={[s.indicador, { width: largura / PERIODOS.length, backgroundColor: c.primario }, ind]} />}
      {PERIODOS.map((p) => (
        <Tocavel key={p} onPress={() => aoMudar(p)} style={s.periodo} hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="tab" accessibilityState={{ selected: p === valor }} accessibilityLabel={`Período de ${NOME_PERIODO[p]}`}>
          <Text style={{ ...tipo.corpo(13, "semibold"), lineHeight: 18, color: p === valor ? c.sobrePrimario : c.textoSuave }}>{p}</Text>
        </Tocavel>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop: 12, paddingBottom: 32, gap: 22 },
  px: { paddingHorizontal: 20 },
  mx: { marginHorizontal: 20 },
  linha: { flexDirection: "row", alignItems: "center" },
  brilhoTopo: { position: "absolute", top: 0, left: 0, right: 0, height: 260 },
  perfil: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 50, paddingLeft: 5, paddingRight: 12, paddingVertical: 5, minHeight: 48, maxWidth: "62%" },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  redondo: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pilulaInfo: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  botaoGrande: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 16 },
  card: { borderRadius: 20, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 50 },
  periodos: { flexDirection: "row", borderRadius: 50, padding: 3, marginTop: 12 },
  indicador: { position: "absolute", top: 3, bottom: 3, left: 3, borderRadius: 50 },
  periodo: { flex: 1, height: 34, alignItems: "center", justifyContent: "center" },
  tituloSecao: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 17 },
  pilula: { borderWidth: 1, borderRadius: 50, paddingHorizontal: 14, minHeight: 36, justifyContent: "center" },
  vazio: { borderWidth: 1, borderStyle: "dashed", borderRadius: 20, padding: 24 },
  painel: { flexDirection: "row", flexWrap: "wrap", borderRadius: 20, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth },
  acaoItem: { width: "25%", alignItems: "center", gap: 6, paddingVertical: 10, minHeight: 78 },
  acaoIcone: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tile: { flex: 1, borderRadius: 20, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  rotuloTile: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  segmentos: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", gap: 2, marginTop: 12 },
  barras: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  colunaBarra: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  dica: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, minWidth: 34, alignItems: "center" },
  aviso: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  fechar: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  previsao: { width: 224, borderRadius: 20, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  registrar: { height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 12 },
  chip: { borderWidth: 1, borderRadius: 50, paddingHorizontal: 14, minHeight: 36, justifyContent: "center" },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 64 },
});

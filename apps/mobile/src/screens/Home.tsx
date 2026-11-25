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
import { NavIcone, type NomeNav } from "../components/NavIcone";
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
const MESES_CURTOS = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
// Dimensões do ticket de previsão
const BIL_PERF_W = 10;
const BIL_COTO_W = 68;
const BIL_NOTCH_R = 7;
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
const diaSemana = (iso: string) => DIA_SEMANA[new Date(`${iso}T12:00:00`).getDay()]!;

export function Home() {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const reduzir = useReducedMotion();
  const [toquePerfil, setToquePerfil] = useState(0);
  // shortcut: o toque espera ~0,4 s antes de navegar, para a animação do ícone aparecer.
  const [toques, setToques] = useState<Record<string, number>>({});
  const tocar = (k: string) => setToques((t) => ({ ...t, [k]: (t[k] ?? 0) + 1 }));
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
          <Tocavel onPress={() => { setToquePerfil((n) => n + 1); setTimeout(() => irAba("Mais"), 420); }} style={s.perfil} accessibilityRole="button"
            accessibilityLabel={`Perfil de ${apelido}. ${saudacao(new Date().getHours()).replace("!", "")}`}>
            <View style={[s.avatar, { backgroundColor: c.primario }]}>
              <NavIcone nome="person" cor={c.sobrePrimario} tamanho={26} play={toquePerfil} />
            </View>
            <View style={{ marginLeft: 10, flexShrink: 1 }}>
              <Text style={{ ...tipo.corpo(11), lineHeight: 14, color: c.textoSuave }}>{saudacao(new Date().getHours()).replace("!", ",")}</Text>
              <Text style={{ fontFamily: tipo.marca(15).fontFamily, fontSize: 19, lineHeight: 24, color: c.texto }} numberOfLines={1}>{apelido}</Text>
            </View>
          </Tocavel>
          <View style={{ flex: 1 }} />
          <Tocavel onPress={() => { tocar("olho"); alternarPrivacidade(); }} style={[s.redondo, { backgroundColor: c.superficie, borderColor: c.borda }]}
            accessibilityRole="switch" accessibilityState={{ checked: oculto }} accessibilityLabel={oculto ? "Mostrar valores" : "Esconder valores"}>
            <NavIcone nome="eye" riscado={oculto} tamanho={18} cor={c.texto} play={toques.olho ?? 0} />
          </Tocavel>
          <Tocavel onPress={() => { tocar("busca"); setTimeout(() => irAba("Lancamentos", { focarBusca: Date.now() }), 380); }}
            style={[s.redondo, { backgroundColor: c.superficie, borderColor: c.borda, marginLeft: 8 }]} accessibilityRole="button" accessibilityLabel="Buscar lançamentos">
            <NavIcone nome="search" tamanho={18} cor={c.texto} play={toques.busca ?? 0} />
          </Tocavel>
        </Animated.View>

        {/* Card do saldo: valor, gastos por categoria, receitas e despesas */}
        <Animated.View key={`1-${entrada}`} entering={entra(1)} style={s.px}>
          <View style={[s.card, { backgroundColor: c.superficie, borderColor: c.borda, padding: 20, overflow: "hidden" }]}>
            <LinearGradient pointerEvents="none" colors={[`${c.primario}33`, `${c.primario}00`]} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.8 }} style={StyleSheet.absoluteFill} />
            <Text style={{ ...tipo.corpo(13, "medium"), color: c.textoSuave }}>Saldo atual</Text>
            {oculto
              ? <Text style={{ ...tipo.valor(38), letterSpacing: -1.2, color: c.texto, marginTop: 2 }} accessibilityLabel="Saldo oculto">{OCULTO}</Text>
              : (
                <Text style={{ ...tipo.valor(38), letterSpacing: -1.2, color: saldoRolando < 0 ? c.erro : c.texto, marginTop: 2 }} accessibilityLabel={`Saldo total: ${formatarDinheiro(dados?.saldoTotal ?? 0)}`}>
                  {textoSaldo.slice(0, virgula)}
                  <Text style={{ ...tipo.valor(38), letterSpacing: -1.2, color: c.textoSuave, opacity: 0.55 }}>{textoSaldo.slice(virgula)}</Text>
                </Text>
              )}
            {(dados?.categorias.length ?? 0) > 0 && (
              <>
                <View style={s.segmentos} accessibilityLabel={`Gastos por categoria: ${dados!.categorias.map((f) => `${f.nome} ${f.pct} por cento`).join(", ")}`}>
                  {dados!.categorias.map((f) => <View key={String(f.categoriaId)} style={{ flex: Math.max(f.pct, 3), backgroundColor: corCategoria(f.categoriaId) }} />)}
                </View>
                <View style={[s.linha, { flexWrap: "wrap", columnGap: 12, rowGap: 2, marginTop: 8 }]}>
                  {dados!.categorias.slice(0, 4).map((f) => (
                    <View key={String(f.categoriaId)} style={[s.linha, { gap: 5 }]}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: corCategoria(f.categoriaId) }} />
                      <Text style={{ ...tipo.corpo(11), lineHeight: 16, color: c.textoSuave }}>{f.nome}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            <View style={[s.linha, { gap: 10, marginTop: 16 }]}>
              {([["Receitas do mês", dados?.fluxo30.entradas ?? 0, "arrow-small-down", c.sucesso], ["Despesas do mês", dados?.fluxo30.saidas ?? 0, "arrow-small-up", c.erro]] as [string, number, NomeIcone, string][]).map(([r, v, ic, cor]) => (
                <View key={r} style={[s.mini, { backgroundColor: c.fundo }]}>
                  <View style={[s.linha, { gap: 6 }]}>
                    <View style={[s.miniIcone, { backgroundColor: `${cor}2E` }]}><Icone nome={ic} tamanho={11} cor={cor} /></View>
                    <Text style={{ ...tipo.corpo(11, "medium"), lineHeight: 15, color: c.textoSuave, flexShrink: 1 }} numberOfLines={1}>{r}</Text>
                  </View>
                  <Text style={{ ...tipo.valor(16, false), color: c.texto, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>{oculto ? OCULTO : formatarDinheiro(v)}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* Ações rápidas redondas */}
          <View style={[s.linha, { justifyContent: "space-between", marginTop: 20 }]}>
            {([["Despesa", "plus", () => abrirLancamento({ tipo: "despesa" })], ["Receita", "down", () => abrirLancamento({ tipo: "receita" })],
              ["Transferir", "exchange", () => abrirLancamento({ tipo: "transferencia" })], ["Importar", "import", () => nav.navigate("Importacao")]] as [string, NomeNav, () => void][]).map(([r, ic, acao], i) => (
              <Tocavel key={r} onPress={() => { tocar(r); setTimeout(acao, 380); }} style={s.acaoRedonda} accessibilityRole="button" accessibilityLabel={r === "Despesa" || r === "Receita" ? `Novo lançamento: ${r}` : r}>
                <View style={[s.bolha, { backgroundColor: i === 0 ? c.primario : c.superficie, borderColor: i === 0 ? c.primario : c.borda }]}>
                  <NavIcone nome={ic} tamanho={20} cor={i === 0 ? c.sobrePrimario : c.primario} play={toques[r] ?? 0} />
                </View>
                <Text style={{ ...tipo.corpo(12, "semibold"), lineHeight: 16, color: c.texto }}>{r}</Text>
              </Tocavel>
            ))}
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

        {/* Estatísticas: gastos por categoria, meta e últimos 7 dias */}
        <Animated.View key={`5-${entrada}`} entering={entra(5)} style={[s.px, { gap: 12 }]}>
          <View style={[s.linha, { gap: 12, alignItems: "stretch" }]}>
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
                <BilhetePrevisao key={`${p.origem}-${p.chave}`} p={p} oculto={oculto} c={c}
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

function BilhetePrevisao({ p, oculto, c, aoRegistrar }: { p: PrevisaoHome; oculto: boolean; c: Cores; aoRegistrar: () => void }) {
  const valor = oculto ? OCULTO : `~${formatarDinheiro(Math.abs(p.centavos))}`;
  const dia = String(Number(p.dataPrevista.slice(8, 10))).padStart(2, "0");
  const mes = MESES_CURTOS[Number(p.dataPrevista.slice(5, 7)) - 1] ?? "";
  const atrasado = p.diasAte < 0;
  const urgente = !atrasado && p.diasAte <= 3;
  const corTempo = atrasado ? c.erro : urgente ? c.primario : c.textoSuave;
  const bgCoto = atrasado ? `${c.erro}22` : urgente ? c.primarioSuave : c.superficie;
  const bordaCoto = atrasado ? c.erro : urgente ? c.primario : c.borda;
  const bgOK = atrasado || urgente ? bordaCoto : "transparent";
  const corOK = atrasado || urgente ? c.sobrePrimario : c.textoSuave;

  return (
    <Tocavel onPress={aoRegistrar} style={{ width: 224 }} accessible accessibilityRole="button"
      accessibilityLabel={`Registrar: ${p.desc}, ${oculto ? "" : formatarDinheiro(Math.abs(p.centavos)) + ", "}${quando(p.diasAte).toLowerCase()}`}>
      {/* Entalhes semicirculares nos cantos da perfuração (efeito de ticket rasgável) */}
      <View pointerEvents="none" style={[s.entalhe, { left: 224 - BIL_COTO_W - BIL_PERF_W / 2 - BIL_NOTCH_R, top: -BIL_NOTCH_R, backgroundColor: c.fundo }]} />
      <View pointerEvents="none" style={[s.entalhe, { left: 224 - BIL_COTO_W - BIL_PERF_W / 2 - BIL_NOTCH_R, bottom: -BIL_NOTCH_R, backgroundColor: c.fundo }]} />
      <View style={s.bilhete}>
        {/* Corpo: ícone + descrição + valor */}
        <View style={[s.bilCorpo, { backgroundColor: c.superficie, borderColor: c.borda }]}>
          <View style={[s.linha, { gap: 10, alignItems: "flex-start" }]}>
            <CategoryIcon categoriaId={p.categoriaId} tipo={p.centavos < 0 ? "despesa" : "receita"} tamanho={34} recorrente />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...tipo.corpo(14, "semibold"), lineHeight: 19, color: c.texto }} numberOfLines={2}>{p.desc}</Text>
              <Text style={{ ...tipo.corpo(11), lineHeight: 15, color: c.textoSuave, marginTop: 1 }}>
                {p.origem === "cadastrada" ? "Fixo" : "Recorrente"}
              </Text>
            </View>
          </View>
          <Text style={{ ...tipo.valor(20, false), color: c.texto, marginTop: 10 }}>{valor}</Text>
        </View>
        {/* Perfuração pontilhada */}
        <View style={s.bilPerf}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={[s.bilFuro, { backgroundColor: c.borda }]} />
          ))}
        </View>
        {/* Coto: data + botão de registrar */}
        <View style={[s.bilCoto, { backgroundColor: bgCoto, borderColor: bordaCoto }]}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}>
            <Text style={{ ...tipo.valor(26, false), color: corTempo, lineHeight: 30 }}>{dia}</Text>
            <Text style={{ ...tipo.corpo(11, "semibold"), color: corTempo, letterSpacing: 0.5 }}>{mes}</Text>
          </View>
          <View style={[s.bilOK, { backgroundColor: bgOK, borderColor: bordaCoto }]}>
            <Icone nome={atrasado || urgente ? "check" : "arrow-up-right"} tamanho={12} cor={corOK} />
          </View>
        </View>
      </View>
    </Tocavel>
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
  perfil: { flexDirection: "row", alignItems: "center", minHeight: 48, maxWidth: "62%" },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  redondo: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pilulaInfo: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  mini: { flex: 1, borderRadius: 16, padding: 12 },
  miniIcone: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  acaoRedonda: { alignItems: "center", gap: 7, width: 74 },
  bolha: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, alignItems: "center", justifyContent: "center" },
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
  bilhete: { flexDirection: "row", width: 224 },
  bilCorpo: { flex: 1, padding: 14, borderTopLeftRadius: 20, borderBottomLeftRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderRightWidth: 0 },
  bilPerf: { width: BIL_PERF_W, alignItems: "center", justifyContent: "space-around", paddingVertical: 12 },
  bilFuro: { width: 4, height: 4, borderRadius: 2 },
  bilCoto: { width: BIL_COTO_W, padding: 12, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderLeftWidth: 0, alignItems: "center", justifyContent: "space-between" },
  entalhe: { position: "absolute", width: BIL_NOTCH_R * 2, height: BIL_NOTCH_R * 2, borderRadius: BIL_NOTCH_R, zIndex: 10 },
  bilOK: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  chip: { borderWidth: 1, borderRadius: 50, paddingHorizontal: 14, minHeight: 36, justifyContent: "center" },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 64 },
});

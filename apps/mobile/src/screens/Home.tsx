import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { saudacao, type PeriodoSaldo } from "@solis/core";
import { lerPerfil, lerPrivacidade, montarHome, salvarPrivacidade } from "@solis/dados";
import type { PrevisaoHome, ResumoHome, TipoConta } from "@solis/dados";
import type { RootStackParams } from "../navigation";
import { SafeScreen } from "../components/SafeScreen";
import { Texto as Text } from "../components/Texto";
import { Icone, type NomeIcone } from "../components/Icone";
import { Tocavel } from "../components/Tocavel";
import { CategoryIcon } from "../components/CategoryIcon";
import { GraficoSaldo } from "../components/GraficoSaldo";
import { useBanco } from "../contexto/BancoContext";
import { tipo, useTema } from "../theme";
import { formatarDinheiro } from "../utils/dinheiro";
import { AnimatedNumber } from "../onboarding/componentes";
import { WalletCardDeck, larguraDeck } from "../onboarding/WalletCardDeck";
import type { Variante, WalletCardProps } from "../onboarding/WalletCard";

const MOLA = { stiffness: 280, damping: 26 };
const PERIODOS: PeriodoSaldo[] = ["7D", "1M", "3M", "6M", "1A"];
const NOME_PERIODO: Record<PeriodoSaldo, string> = { "7D": "7 dias", "1M": "1 mês", "3M": "3 meses", "6M": "6 meses", "1A": "1 ano" };
const OCULTO = "R$ ••••••";

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

function dataRelativa(iso: string): string {
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const d = new Date(`${iso}T12:00:00`);
  const dif = Math.round((hoje.getTime() - d.getTime()) / 86_400_000);
  if (dif === 0) return "Hoje";
  if (dif === 1) return "Ontem";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

const iniciais = (n: string) => n.trim().split(/\s+/).filter(Boolean).map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : "")).join("").toUpperCase() || "S";

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

  // A cada foco: recarrega e repete a entrada em cascata.
  useFocusEffect(useCallback(() => { carregar(); setEntrada((n) => n + 1); }, [carregar]));

  function alternarPrivacidade() {
    setOculto((o) => { salvarPrivacidade(!o).catch(() => {}); return !o; });
  }

  const entra = (i: number) => (reduzir ? undefined
    : FadeInDown.delay(i * 50).withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] }).springify().stiffness(MOLA.stiffness).damping(MOLA.damping));

  const serie = dados?.series[periodo];
  const variacao = serie?.variacaoPct ?? null;
  const proxima = dados?.previsoes[0];
  const apelido = nome.apelido || "você";
  const cartoes: Omit<WalletCardProps, "width">[] = (dados?.contas ?? []).map((ct) => ({
    title: ct.nome, subtitle: CONTA_VISUAL[ct.tipo].sub, balance: Math.abs(ct.saldoCentavos), negativo: ct.saldoCentavos < 0,
    variant: CONTA_VISUAL[ct.tipo].variante, badgeIcon: CONTA_VISUAL[ct.tipo].icone, tipoIcon: "shield-check",
    holder: nome.apelido || "Solis", isBalanceHidden: oculto,
  }));
  const abrirLancamento = (p: RootStackParams["NovoLancamento"]) => nav.navigate("NovoLancamento", p);
  const irAba = (screen: string, params?: object) => nav.navigate("App", { screen, params } as never);

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={carregar} tintColor={c.primario} colors={[c.primario]} />}>
        <LinearGradient pointerEvents="none" colors={[`${c.primario}22`, `${c.primario}00`]} style={s.brilhoTopo} />

        {/* A. Cabeçalho */}
        <Animated.View key={`0-${entrada}`} entering={entra(0)} style={[s.linha, s.px]}>
          <View style={[s.avatar, { backgroundColor: c.primarioSuave }]} accessibilityRole="image" accessibilityLabel={`Perfil de ${apelido}`}>
            <Text style={{ ...tipo.marca(15), color: c.primario }}>{iniciais(nome.completo || nome.apelido)}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ ...tipo.corpo(13), lineHeight: 18, color: c.textoSuave }}>{saudacao(new Date().getHours()).replace("!", ",")}</Text>
            <Text style={{ fontFamily: tipo.marca(18).fontFamily, fontSize: 18, color: c.texto }} numberOfLines={1}>{apelido}</Text>
          </View>
          <Tocavel onPress={alternarPrivacidade} style={[s.redondo, { backgroundColor: c.superficie, borderColor: c.borda }]}
            accessibilityRole="switch" accessibilityState={{ checked: oculto }} accessibilityLabel={oculto ? "Mostrar valores" : "Esconder valores"}>
            <Icone nome={oculto ? "eye-crossed" : "eye"} tamanho={18} cor={c.texto} />
          </Tocavel>
          <Tocavel onPress={() => irAba("Lancamentos", { focarBusca: Date.now() })}
            style={[s.redondo, { backgroundColor: c.superficie, borderColor: c.borda, marginLeft: 8 }]} accessibilityRole="button" accessibilityLabel="Buscar lançamentos">
            <Icone nome="search" tamanho={18} cor={c.texto} />
          </Tocavel>
        </Animated.View>

        {/* B. Saldo e gráfico */}
        <Animated.View key={`1-${entrada}`} entering={entra(1)} style={s.px}>
          <View style={[s.hero, { backgroundColor: c.superficie, borderColor: c.borda }]}>
            <LinearGradient pointerEvents="none" colors={[`${c.primario}26`, `${c.primario}00`]} style={s.brilhoCard} />
            <View style={[s.linha, { justifyContent: "space-between", gap: 8 }]}>
              <Text style={{ ...tipo.corpo(13, "medium"), color: c.textoSuave }}>Saldo total</Text>
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
            {oculto
              ? <Text style={{ ...tipo.valor(34), letterSpacing: -1, color: c.texto, marginTop: 6 }} accessibilityLabel="Saldo oculto">{OCULTO}</Text>
              : <AnimatedNumber key={entrada} centavos={dados?.saldoTotal ?? 0} inicial={reduzir ? undefined : 0} duracao={900}
                  style={{ ...tipo.valor(34), letterSpacing: -1, color: (dados?.saldoTotal ?? 0) < 0 ? c.erro : c.texto, marginTop: 6 }} />}
            <View style={{ marginTop: 14 }} onLayout={(e) => setLarguraGrafico(e.nativeEvent.layout.width)}>
              <GraficoSaldo pontos={serie?.pontos ?? []} largura={larguraGrafico} cor={c.primario} reduzirMovimento={reduzir}
                rotulo={`Gráfico de evolução do saldo no período de ${NOME_PERIODO[periodo]}`} />
            </View>
            <SeletorPeriodo valor={periodo} aoMudar={setPeriodo} />
          </View>
        </Animated.View>

        {/* C. Ações rápidas */}
        <Animated.View key={`2-${entrada}`} entering={entra(2)} style={[s.px, s.linha, { justifyContent: "space-between" }]}>
          {([
            ["Despesa", "arrow-small-up", () => abrirLancamento({ tipo: "despesa" })],
            ["Receita", "arrow-small-down", () => abrirLancamento({ tipo: "receita" })],
            ["Transferir", "exchange", () => abrirLancamento({ tipo: "transferencia" })],
            ["Solis AI", "sparkles", () => irAba("Chat")],
          ] as [string, NomeIcone, () => void][]).map(([rotulo, ic, acao], i) => (
            <View key={rotulo} style={{ alignItems: "center", gap: 6, width: 72 }}>
              <Tocavel onPress={acao} accessibilityRole="button" accessibilityLabel={i < 3 ? `Novo lançamento: ${rotulo}` : "Abrir Solis AI"}
                style={[s.acao, i === 3 ? { backgroundColor: c.primario, borderColor: c.primario } : { backgroundColor: c.superficie, borderColor: c.borda }]}>
                <Icone nome={ic} tamanho={20} cor={i === 3 ? c.sobrePrimario : c.texto} />
              </Tocavel>
              <Text style={{ ...tipo.corpo(12, "medium"), lineHeight: 16, color: c.textoSuave }}>{rotulo}</Text>
            </View>
          ))}
        </Animated.View>

        {/* D. Minhas contas */}
        <Animated.View key={`3-${entrada}`} entering={entra(3)}>
          <View style={[s.linha, s.px, { justifyContent: "space-between", marginBottom: 12 }]}>
            <Text style={[s.tituloSecao, { color: c.texto }]} accessibilityRole="header">Minhas contas</Text>
            <Tocavel onPress={() => nav.navigate("NovaConta")} style={[s.pilula, { borderColor: c.borda }]} accessibilityRole="button" accessibilityLabel="Criar nova conta">
              <Text style={{ ...tipo.corpo(13, "semibold"), lineHeight: 18, color: c.primario }}>+ Nova conta</Text>
            </Tocavel>
          </View>
          {cartoes.length > 0 ? (
            <View style={{ alignItems: "center" }}>
              <WalletCardDeck width={larguraDeck(width)} frente={cartoes[contaIdx]!} cartoes={cartoes} ativo={contaIdx}
                fase="conta" aberto aoTrocar={setContaIdx} />
            </View>
          ) : (
            <Tocavel onPress={() => nav.navigate("NovaConta")} style={[s.vazio, s.mx, { borderColor: c.borda }]} accessibilityRole="button">
              <Text style={{ ...tipo.corpo(14), color: c.textoSuave, textAlign: "center" }}>Nenhuma conta ainda. Toque para criar a primeira.</Text>
            </Tocavel>
          )}
        </Animated.View>

        {/* E. Bento: fluxo do mês e próxima previsão */}
        <Animated.View key={`4-${entrada}`} entering={entra(4)} style={[s.px, s.linha, { alignItems: "stretch", gap: 12 }]}>
          <View style={[s.bento, { backgroundColor: c.superficie, borderColor: c.borda }]}>
            <Text style={[s.rotuloBento, { color: c.textoSuave }]}>Fluxo do mês</Text>
            <LinhaFluxo rotulo="Entradas" valor={oculto ? OCULTO : formatarDinheiro(dados?.fluxo30.entradas ?? 0)} cor={c.sucesso} c={c} />
            <LinhaFluxo rotulo="Saídas" valor={oculto ? OCULTO : formatarDinheiro(dados?.fluxo30.saidas ?? 0)} cor={c.erro} c={c} />
            <View style={s.barraFluxo} accessibilityLabel="Proporção entre entradas e saídas dos últimos 30 dias">
              <View style={{ flex: Math.max(1, dados?.fluxo30.entradas ?? 1), backgroundColor: c.sucesso }} />
              <View style={{ flex: Math.max(1, dados?.fluxo30.saidas ?? 1), backgroundColor: c.erro }} />
            </View>
          </View>
          <View style={[s.bento, { backgroundColor: c.superficie, borderColor: c.borda }]}>
            {proxima ? (
              <>
                <Text style={[s.rotuloBento, { color: c.textoSuave }]}>Próxima previsão</Text>
                <Text style={{ ...tipo.corpo(14, "semibold"), color: c.texto, marginTop: 8 }} numberOfLines={1}>{proxima.desc}</Text>
                <Text style={{ ...tipo.valor(17, false), color: c.texto }}>{oculto ? OCULTO : `~${formatarDinheiro(Math.abs(proxima.centavos))}`}</Text>
                <View style={[s.badge, { backgroundColor: c.primarioSuave, alignSelf: "flex-start", marginTop: 8 }]}>
                  <Text style={{ ...tipo.corpo(11, "semibold"), lineHeight: 14, color: c.primario }}>
                    {proxima.diasAte > 1 ? `Previsto em ${proxima.diasAte} dias` : quando(proxima.diasAte)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={[s.rotuloBento, { color: c.textoSuave }]}>Balanço do mês</Text>
                <Text style={{ ...tipo.valor(20), color: c.texto, marginTop: 8 }} numberOfLines={1} adjustsFontSizeToFit>
                  {oculto ? OCULTO : formatarDinheiro((dados?.fluxo30.entradas ?? 0) - (dados?.fluxo30.saidas ?? 0))}
                </Text>
                <Text style={{ ...tipo.corpo(12), color: c.textoSuave, marginTop: 4 }}>Entradas menos saídas nos últimos 30 dias.</Text>
              </>
            )}
          </View>
        </Animated.View>

        {/* Possíveis lançamentos futuros */}
        <Animated.View key={`5-${entrada}`} entering={entra(5)} style={s.px}>
          <Text style={[s.tituloSecao, { color: c.texto }]} accessibilityRole="header">Possíveis lançamentos futuros</Text>
          <View style={[s.badge, { borderWidth: 1, borderColor: c.borda, alignSelf: "flex-start", marginTop: 6, marginBottom: 12 }]}>
            <Icone nome="clock" tamanho={10} cor={c.textoSuave} />
            <Text style={{ ...tipo.corpo(11, "medium"), lineHeight: 14, color: c.textoSuave }}>Baseado nos últimos 3 meses</Text>
          </View>
          {dados && dados.previsoes.length === 0 && !dados.historicoSuficiente && !dicaFechada ? (
            <View style={[s.dica, { backgroundColor: c.superficie, borderColor: c.borda }]}>
              <Text style={{ ...tipo.corpo(14), color: c.textoSuave, flex: 1 }}>
                Continue registrando seus gastos. Depois de 2 meses, o Solis identifica suas assinaturas e contas fixas automaticamente.
              </Text>
              <Tocavel onPress={() => setDicaFechada(true)} style={s.fechar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dispensar aviso">
                <Icone nome="cross-small" tamanho={16} cor={c.textoSuave} />
              </Tocavel>
            </View>
          ) : dados && dados.previsoes.length === 0 ? (
            <Text style={{ ...tipo.corpo(14), color: c.textoSuave }}>Nenhuma conta fixa prevista para os próximos 30 dias.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {(dados?.previsoes ?? []).slice(0, 5).map((p) => (
                <ItemPrevisao key={`${p.origem}-${p.chave}`} p={p} oculto={oculto} c={c}
                  aoRegistrar={() => abrirLancamento({
                    tipo: p.centavos < 0 ? "despesa" : "receita", descricao: p.desc, valorCentavos: Math.abs(p.centavos),
                    categoriaId: p.categoriaId ?? undefined, contaId: p.contaId ?? undefined,
                  })} />
              ))}
            </View>
          )}
        </Animated.View>

        {/* Últimos lançamentos */}
        <Animated.View key={`6-${entrada}`} entering={entra(6)} style={s.px}>
          <View style={[s.linha, { justifyContent: "space-between" }]}>
            <Text style={[s.tituloSecao, { color: c.texto }]} accessibilityRole="header">Últimos lançamentos</Text>
            <Tocavel onPress={() => irAba("Lancamentos")} accessibilityRole="button" style={{ paddingVertical: 14, paddingLeft: 12 }}>
              <Text style={{ ...tipo.corpo(14, "semibold"), lineHeight: 20, color: c.primario }}>Ver todos</Text>
            </Tocavel>
          </View>
          {dados && dados.ultimos.length === 0 && <Text style={{ ...tipo.corpo(14), color: c.textoSuave }}>Nenhum lançamento ainda.</Text>}
          {(dados?.ultimos ?? []).map((l) => {
            const entrou = l.valorCentavos >= 0 && l.tipo !== "transferencia";
            const texto = oculto ? OCULTO : `${entrou ? "+" : l.valorCentavos < 0 ? "−" : ""}${formatarDinheiro(Math.abs(l.valorCentavos))}`;
            return (
              <Tocavel key={l.id} style={[s.item, { borderBottomColor: c.borda }]} accessibilityRole="button"
                accessibilityLabel={`${l.descricao || "Sem descrição"}, ${oculto ? "valor oculto" : texto}, ${l.contaNome}, ${dataRelativa(l.data)}`}
                onPress={() => irAba("Lancamentos")}>
                <CategoryIcon categoriaId={l.categoriaId} tipo={l.tipo} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ ...tipo.corpo(15, "medium"), lineHeight: 20, color: c.texto }} numberOfLines={1}>{l.descricao || "Sem descrição"}</Text>
                  <Text style={{ ...tipo.corpo(12), lineHeight: 17, color: c.textoSuave }} numberOfLines={1}>{[l.contaNome, dataRelativa(l.data)].filter(Boolean).join(" • ")}</Text>
                </View>
                <Text style={{ ...tipo.valor(15, false), color: entrou ? c.sucesso : c.texto }}>{texto}</Text>
              </Tocavel>
            );
          })}
        </Animated.View>
      </ScrollView>
    </SafeScreen>
  );
}

function LinhaFluxo({ rotulo, valor, cor, c }: { rotulo: string; valor: string; cor: string; c: ReturnType<typeof useTema>["cores"] }) {
  return (
    <View style={{ marginTop: 8 }}>
      <View style={[s.linha, { gap: 6 }]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cor }} />
        <Text style={{ ...tipo.corpo(12), lineHeight: 16, color: c.textoSuave }}>{rotulo}</Text>
      </View>
      <Text style={{ ...tipo.valor(16, false), color: c.texto, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
    </View>
  );
}

function ItemPrevisao({ p, oculto, c, aoRegistrar }: { p: PrevisaoHome; oculto: boolean; c: ReturnType<typeof useTema>["cores"]; aoRegistrar: () => void }) {
  const valor = oculto ? OCULTO : `~${formatarDinheiro(Math.abs(p.centavos))}`;
  const dia = Number(p.dataPrevista.slice(8, 10));
  return (
    <View style={[s.previsao, { backgroundColor: c.superficie, borderColor: c.borda }]}
      accessible accessibilityLabel={`Possível lançamento futuro: ${p.desc}, valor estimado ${oculto ? "oculto" : formatarDinheiro(Math.abs(p.centavos))}, ${quando(p.diasAte).toLowerCase()}. Toque em Registrar para confirmar`}
      accessibilityActions={[{ name: "activate", label: "Registrar" }]} onAccessibilityAction={aoRegistrar}>
      <CategoryIcon categoriaId={p.categoriaId} tipo={p.centavos < 0 ? "despesa" : "receita"} recorrente />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ ...tipo.corpo(15, "semibold"), lineHeight: 20, color: c.texto }} numberOfLines={1}>{p.desc}</Text>
        <Text style={{ ...tipo.corpo(12), lineHeight: 17, color: c.textoSuave }} numberOfLines={1}>
          Previsto para dia {dia} • {quando(p.diasAte)}{p.origem === "cadastrada" ? " • Fixo" : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Text style={{ ...tipo.valor(15, false), color: c.texto }}>{valor}</Text>
        <Tocavel onPress={aoRegistrar} style={[s.registrar, { backgroundColor: c.primario }]} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Registrar ${p.desc}`}>
          <Text style={{ ...tipo.corpo(12, "semibold"), lineHeight: 16, color: c.sobrePrimario }}>Registrar</Text>
        </Tocavel>
      </View>
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
  scroll: { paddingTop: 12, paddingBottom: 32, gap: 20 },
  px: { paddingHorizontal: 20 },
  mx: { marginHorizontal: 20 },
  linha: { flexDirection: "row", alignItems: "center" },
  brilhoTopo: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  redondo: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  hero: { borderRadius: 24, padding: 20, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  brilhoCard: { position: "absolute", top: 0, left: 0, right: 0, height: 90 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 50 },
  periodos: { flexDirection: "row", borderRadius: 50, padding: 3, marginTop: 12 },
  indicador: { position: "absolute", top: 3, bottom: 3, left: 3, borderRadius: 50 },
  periodo: { flex: 1, height: 34, alignItems: "center", justifyContent: "center" },
  acao: { width: 54, height: 54, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  tituloSecao: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 17 },
  pilula: { borderWidth: 1, borderRadius: 50, paddingHorizontal: 14, minHeight: 36, justifyContent: "center" },
  vazio: { borderWidth: 1, borderStyle: "dashed", borderRadius: 20, padding: 24 },
  bento: { flex: 1, borderRadius: 20, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  rotuloBento: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  barraFluxo: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 12, gap: 2 },
  dica: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  fechar: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  previsao: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  registrar: { paddingHorizontal: 12, minHeight: 28, borderRadius: 50, justifyContent: "center" },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 64 },
});

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, RefreshControl, ScrollView, Share, StyleSheet, ToastAndroid, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { progressoCiclo, saudacao, textoAnalise, type AnaliseSemana, type PeriodoSaldo } from "@solis/core";
import { atualizarMemoriaSolis, gerarRelatorioSemana, lerCredenciaisPluggy, lerPerfil, lerPrivacidade, lerUltimoRelatorio, montarHome, montarPainel, salvarPrivacidade, sincronizarPluggy, ultimaSyncPluggy } from "@solis/dados";
import type { Painel, PrevisaoHome, ResumoHome, TipoConta } from "@solis/dados";
import type { RootStackParams } from "../navigation";
import { SafeScreen } from "../components/SafeScreen";
import { Texto as Text } from "../components/Texto";
import { Icone, type NomeIcone } from "../components/Icone";
import { Tocavel } from "../components/Tocavel";
import { NavIcone, type NomeNav } from "../components/NavIcone";
import { PopOut, medir, type Origem } from "../components/PopOut";
import { ConteudoCartao, ConteudoCofrinhos, ConteudoConta } from "../components/PainelFontes";
import { PassosAtualizacao, type Passo } from "../components/PassosAtualizacao";
import { ReciboAnalise, type ReciboRef } from "../components/ReciboAnalise";
import { CategoryIcon, corCategoria } from "../components/CategoryIcon";
import { GraficoSaldo } from "../components/GraficoSaldo";
import { AnelProgresso } from "../components/AnelProgresso";
import { useNumeroRolando } from "../components/useNumeroRolando";
import { useBanco } from "../contexto/BancoContext";
import { auxiliares, tipo, useTema } from "../theme";
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
type Pop = { tipo: "conta" | "cartao"; id: string } | { tipo: "cofrinho" | "atualizar" | "analise" | "exportar" };
type Medivel = Parameters<typeof medir>[0];
// Cores das marcas, só nos botões de envio.
const COR_ZAP = "#25D366";
const COR_TELE = "#2AABEE";
const PATH_ZAP = "M12 2.5a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.8-1.3A9.4 9.4 0 1 0 12 2.5zm5.4 13.3c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.7-1.1-4.4-3.9-4.6-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l2 .9c.3.1.4.2.5.3.1.2.1.7-.1 1.4z";
const PATH_TELE = "M21.4 4.2 2.9 11.3c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.5c.2.6.4.8.8.8s.6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.3-.5-1.8-1.3-1.4zM9 14.1l9.6-6.1c.5-.3.8-.1.4.2l-8 7.3-.3 3.3z";

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

  // relê ao voltar para a aba: o olho da carteira (Cartões) e o da Início ficam sempre iguais
  useFocusEffect(useCallback(() => { lerPrivacidade().then(setOculto).catch(() => {}); }, []));

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

  // ── Pop-outs: contas, cofrinhos, cartões e as ações rápidas ──
  const [painel, setPainel] = useState<Painel | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [popAberto, setPopAberto] = useState(false);
  const [origem, setOrigem] = useState<Origem | null>(null);
  const alvos = useRef<Record<string, Medivel | null>>({});
  const marcar = (k: string) => (r: unknown) => { alvos.current[k] = r as Medivel | null; };
  const [upd, setUpd] = useState<{ passos: Passo[]; soIA: boolean; fim: boolean; erro?: string } | null>(null);
  const [analise, setAnalise] = useState<AnaliseSemana | null>(null);
  const [impresso, setImpresso] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [relatorio, setRelatorio] = useState<AnaliseSemana | null>(null);
  const recibo = useRef<ReciboRef>(null);
  const { height } = useWindowDimensions();

  useFocusEffect(useCallback(() => { montarPainel(banco).then(setPainel).catch(() => {}); }, [banco]));

  async function abrir(k: string, p: Pop) {
    setOrigem(await medir(alvos.current[k] ?? null));
    setPop(p); setPopAberto(true);
  }
  const fechar = () => setPopAberto(false);

  const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function atualizar() {
    const cred = await lerCredenciaisPluggy().catch(() => null);
    const ultima = cred ? await ultimaSyncPluggy(banco).catch(() => null) : null;
    // A consulta automática ao Meu Pluggy é uma por dia; se já rodou, só o Solis AI relê os dados.
    const consultar = !!cred && (!ultima || Date.now() - Date.parse(ultima) >= 86_400_000);
    const passos: Passo[] = [
      ...(consultar ? [
        { grupo: "Meu Pluggy", rotulo: "Conectando ao Meu Pluggy", estado: "pend" as const, log: [] },
        { grupo: "Meu Pluggy", rotulo: "Baixando lançamentos dos bancos", estado: "pend" as const, log: [] },
        { grupo: "Meu Pluggy", rotulo: "Guardando no cofre do celular", estado: "pend" as const, log: [] },
      ] : []),
      { grupo: "Solis AI", rotulo: "Relendo os dados dos bancos", estado: "pend", log: [] },
      { grupo: "Solis AI", rotulo: "Recalculando previsões e metas", estado: "pend", log: [] },
      { grupo: "Solis AI", rotulo: "Atualizando a memória do Solis AI", estado: "pend", log: [] },
    ];
    setUpd({ passos, soIA: !consultar, fim: false });
    const mexe = (i: number, p: Partial<Passo>, linha?: string) => setUpd((u) => u && ({
      ...u, passos: u.passos.map((x, j) => (j === i ? { ...x, ...p, log: linha ? [...x.log, linha] : x.log } : x)),
    }));
    const etapa = async (i: number, linhas: string[], trabalho?: () => Promise<string[] | void>) => {
      mexe(i, { estado: "run" });
      for (const l of linhas) { await espera(320); mexe(i, {}, l); }
      const extra = trabalho ? await trabalho() : undefined;
      for (const l of extra ?? []) { await espera(260); mexe(i, {}, l); }
      await espera(240); mexe(i, { estado: "done" });
    };
    try {
      let i = 0;
      if (consultar && cred) {
        await etapa(i++, ["abrindo a conexão do Meu Pluggy", "credenciais lidas do cofre do celular"]);
        await etapa(i++, ["GET /v2/transactions"], async () => {
          const r = await sincronizarPluggy(banco, cred, { forcar: true });
          return [`${r.contas} ${r.contas === 1 ? "conta lida" : "contas lidas"}`, `${r.novos} ${r.novos === 1 ? "lançamento novo" : "lançamentos novos"}`, "duplicados conferidos"];
        });
        await etapa(i++, ["cifrado com SQLCipher", "gravado"]);
      }
      await etapa(i++, ["últimos 14 dias", "nada sai do celular"]);
      await etapa(i++, ["contas que se repetem", "ritmo de cada meta"], async () => { await carregar(); });
      await etapa(i++, ["refazendo a análise da semana"], async () => { await atualizarMemoriaSolis(banco); setPainel(await montarPainel(banco)); return ["pronto"]; });
      setUpd((u) => u && { ...u, fim: true });
      ToastAndroid.show(consultar ? "Bancos atualizados e Solis AI em dia." : "Solis AI atualizou a memória com os dados de hoje.", ToastAndroid.SHORT);
    } catch {
      setUpd((u) => u && { ...u, fim: true, erro: "Não deu para concluir. Confira a internet e o Meu Pluggy em Mais." });
    }
  }
  function tocarAtualizar() {
    tocar("Atualizar");
    if (upd && !upd.fim) abrir("acao-Atualizar", { tipo: "atualizar" });
    else atualizar();
  }

  async function abrirAnalise() {
    tocar("Análise");
    const r = await gerarRelatorioSemana(banco);
    setAnalise(r); setRelatorio(r); setImpresso(false); setDescartando(false);
    abrir("acao-Análise", { tipo: "analise" });
  }
  function descartar() { setDescartando(true); recibo.current?.descartar(); }
  function aoDescartar() { fechar(); ToastAndroid.show("Recibo guardado. Use Exportar para enviar.", ToastAndroid.SHORT); }

  async function abrirExportar() {
    tocar("Exportar");
    setRelatorio(await lerUltimoRelatorio(banco).catch(() => null));
    abrir("acao-Exportar", { tipo: "exportar" });
  }
  async function enviar(onde: "zap" | "tele" | "outro") {
    if (!relatorio) return;
    const t = textoAnalise(relatorio);
    const url = onde === "zap" ? `whatsapp://send?text=${encodeURIComponent(t)}` : `tg://msg?text=${encodeURIComponent(t)}`;
    // O texto vai direto para o app escolhido no celular; se ele não estiver instalado, abre a folha de compartilhar do Android.
    if (onde !== "outro") { try { await Linking.openURL(url); return; } catch { /* cai na folha de compartilhar */ } }
    await Share.share({ message: t }).catch(() => {});
  }

  const fontes = [
    ...(painel?.contas ?? []).map((ct) => ({ k: `conta-${ct.id}`, nome: ct.nome, valor: oculto ? OCULTO : formatarDinheiro(ct.saldoCentavos), icone: CONTA_VISUAL[ct.tipo].icone, pop: { tipo: "conta", id: ct.id } as Pop })),
    ...(painel?.cofrinhos ? [{ k: "cofrinhos", nome: "Cofrinhos", valor: oculto ? OCULTO : formatarDinheiro(painel.cofrinhos.totalCentavos), icone: "piggy-bank" as NomeIcone, pop: { tipo: "cofrinho" } as Pop }] : []),
    ...(painel?.cartoes ?? []).map((ct) => ({ k: `cartao-${ct.id}`, nome: ct.nome, valor: oculto ? "Fatura R$ ••••" : `Fatura ${formatarDinheiro(ct.faturaCentavos)}`, icone: "credit-card" as NomeIcone, pop: { tipo: "cartao", id: ct.id } as Pop })),
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
          <Tocavel onPress={() => { tocar("busca"); setTimeout(() => nav.navigate("Lancamentos", { focarBusca: Date.now() }), 380); }}
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
          {/* Contas, cofrinhos e cartões: o toque abre um pop-out com as últimas 24 h */}
          {fontes.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {fontes.map((f) => (
                <View key={f.k} ref={marcar(f.k)} collapsable={false}>
                  <Tocavel onPress={() => abrir(f.k, f.pop)} style={[s.fonteChip, { backgroundColor: c.superficie, borderColor: c.borda }]}
                    accessibilityRole="button" accessibilityLabel={`${f.nome}, ${f.valor}. Ver últimas 24 horas`}>
                    <View style={[s.chipIc, { backgroundColor: c.primario }]}><Icone nome={f.icone} tamanho={16} cor={c.sobrePrimario} /></View>
                    <View>
                      <Text style={{ ...tipo.corpo(13, "semibold"), lineHeight: 17, color: c.texto }} numberOfLines={1}>{f.nome}</Text>
                      <Text style={{ ...tipo.corpo(11.5), lineHeight: 15, color: c.textoSuave }} numberOfLines={1}>{f.valor}</Text>
                    </View>
                  </Tocavel>
                </View>
              ))}
            </ScrollView>
          )}
          {/* Ações rápidas: atualizar bancos, análise da semana e exportar o relatório */}
          <View style={[s.linha, { justifyContent: "space-around", marginTop: 20 }]}>
            {([
              ["Atualizar", upd && !upd.fim ? "Atualizando" : "Atualizar", "sync", tocarAtualizar],
              ["Análise", "Análise", "receipt", abrirAnalise],
              ["Exportar", "Exportar", "export", abrirExportar],
            ] as [string, string, NomeNav, () => void][]).map(([k, r, ic, acao], i) => (
              <View key={k} ref={marcar(`acao-${k}`)} collapsable={false}>
                <Tocavel onPress={acao} style={s.acaoRedonda} accessibilityRole="button"
                  accessibilityLabel={k === "Atualizar" ? (upd && !upd.fim ? "Atualizando. Toque para ver as etapas" : "Atualizar bancos e Solis AI") : k === "Análise" ? "Análise da semana" : "Exportar o último relatório"}>
                  <View style={[s.bolha, { backgroundColor: i === 0 ? c.primario : c.superficie, borderColor: i === 0 ? c.primario : c.borda }]}>
                    <NavIcone nome={ic} tamanho={20} cor={i === 0 ? c.sobrePrimario : c.primario} play={toques[k] ?? 0} girando={k === "Atualizar" && !!upd && !upd.fim} />
                  </View>
                  <Text style={{ ...tipo.corpo(12, "semibold"), lineHeight: 16, color: c.texto }}>{r}</Text>
                </Tocavel>
              </View>
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
              <GraficoSaldo pontos={serie?.pontos ?? []} largura={larguraGrafico} cor={c.texto} fundoPonto={c.superficie} reduzirMovimento={reduzir}
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
            <Tocavel onPress={() => nav.navigate("Lancamentos")} accessibilityRole="button" style={{ paddingVertical: 14, paddingLeft: 12 }}>
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
                    onPress={() => nav.navigate("Lancamentos")}>
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
      <PopOut aberto={popAberto} origem={origem} aoFechar={fechar} semRolagem={pop?.tipo === "analise"}
        titulo={pop?.tipo === "atualizar" ? "Atualização" : pop?.tipo === "analise" ? "Análise da semana" : pop?.tipo === "exportar" ? "Exportar relatório" : "Últimas 24 horas"}
        rodape={
          pop?.tipo === "atualizar" ? { texto: upd?.fim ? "Fechar" : "Continuar em segundo plano", acao: fechar }
          : pop?.tipo === "analise" ? { texto: "Descartar", acao: descartar, desativado: !impresso || descartando }
          : pop?.tipo === "exportar" && !relatorio ? { texto: "Gerar análise agora", acao: () => { fechar(); setTimeout(abrirAnalise, 350); } }
          : { texto: "Fechar", acao: fechar }
        }>
        {pop?.tipo === "conta" && painel?.contas.find((x) => x.id === pop.id) && <ConteudoConta conta={painel.contas.find((x) => x.id === pop.id)!} oculto={oculto} />}
        {pop?.tipo === "cofrinho" && painel?.cofrinhos && <ConteudoCofrinhos cof={painel.cofrinhos} oculto={oculto} />}
        {pop?.tipo === "cartao" && painel?.cartoes.find((x) => x.id === pop.id) && <ConteudoCartao cartao={painel.cartoes.find((x) => x.id === pop.id)!} oculto={oculto} titular={nome.completo || nome.apelido || "Você"} />}
        {pop?.tipo === "atualizar" && upd && (
          <PassosAtualizacao passos={upd.passos}
            titulo={upd.erro ? "Atualização interrompida" : upd.fim ? "Tudo atualizado" : upd.soIA ? "Solis AI reanalisando" : "Atualizando seus bancos"}
            sub={upd.erro ?? (upd.fim ? (upd.soIA ? "A consulta aos bancos de hoje já tinha sido feita" : "Bancos e memória do Solis AI em dia")
              : `Etapa ${Math.min(upd.passos.filter((p) => p.estado === "done").length + 1, upd.passos.length)} de ${upd.passos.length}`)} />
        )}
        {pop?.tipo === "analise" && analise && (
          <ReciboAnalise ref={recibo} analise={analise} oculto={oculto} alturaMax={Math.round(height * 0.46)} aoImprimir={() => setImpresso(true)} aoDescartar={aoDescartar} />
        )}
        {pop?.tipo === "exportar" && (relatorio ? (
          <>
            <View style={[s.exRel, { backgroundColor: c.fundo }]}>
              <Text style={{ ...tipo.corpo(14, "semibold"), color: c.texto }}>Análise da semana · {relatorio.ate.split("-").reverse().join("/")}</Text>
              <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>
                Gastos de {oculto ? OCULTO : formatarDinheiro(relatorio.gastos)}, {relatorio.positivos.length} pontos positivos, {relatorio.atencao.length} de atenção e {relatorio.sugestoes.length} sugestões.
              </Text>
            </View>
            <Text style={{ ...tipo.corpo(11, "semibold"), color: c.textoSuave, letterSpacing: 0.6 }}>ENVIAR POR</Text>
            <View style={s.linha}>
              {([["zap", "WhatsApp", COR_ZAP], ["tele", "Telegram", COR_TELE], ["outro", "Outros apps", c.primario]] as const).map(([k, r, cor]) => (
                <Tocavel key={k} onPress={() => enviar(k)} style={[s.exBt, { borderColor: c.borda, backgroundColor: c.superficie }]} accessibilityRole="button" accessibilityLabel={`Enviar por ${r}`}>
                  <View style={[s.exIc, { backgroundColor: cor }]}>
                    {k === "outro" ? <NavIcone nome="export" tamanho={22} cor={auxiliares.branco} play={0} />
                      : <Svg width={24} height={24} viewBox="0 0 24 24"><Path d={k === "zap" ? PATH_ZAP : PATH_TELE} fill={auxiliares.branco} /></Svg>}
                  </View>
                  <Text style={{ ...tipo.corpo(12, "semibold"), color: c.texto }}>{r}</Text>
                </Tocavel>
              ))}
            </View>
            <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>O relatório só sai do celular quando você envia, e só para a conversa que você escolher.</Text>
          </>
        ) : (
          <Text style={{ ...tipo.corpo(14), color: c.textoSuave }}>O Solis AI ainda não fez uma análise. Gere a da semana e ela fica pronta para enviar.</Text>
        ))}
      </PopOut>
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
      {largura > 0 && <Animated.View style={[s.indicador, { width: largura / PERIODOS.length, backgroundColor: c.texto }, ind]} />}
      {PERIODOS.map((p) => (
        <Tocavel key={p} onPress={() => aoMudar(p)} style={s.periodo} hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="tab" accessibilityState={{ selected: p === valor }} accessibilityLabel={`Período de ${NOME_PERIODO[p]}`}>
          <Text style={{ ...tipo.corpo(13, "semibold"), lineHeight: 18, color: p === valor ? c.fundo : c.textoSuave }}>{p}</Text>
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
  acaoRedonda: { alignItems: "center", gap: 7, width: 84 },
  fonteChip: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingLeft: 9, paddingRight: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, maxWidth: 220 },
  chipIc: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  exRel: { borderRadius: 16, padding: 14, gap: 4 },
  exBt: { flex: 1, alignItems: "center", gap: 8, paddingVertical: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, marginHorizontal: 4 },
  exIc: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
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

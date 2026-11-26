import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Defs, LinearGradient as Degrade, Path, Stop } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import { hojeLocal, lerPerfil, lerPrivacidade, listarComprasCartoes, montarPainel, salvarPrivacidade, type CompraCartao, type PainelCartao } from "@solis/dados";
import { SafeScreen } from "../components/SafeScreen";
import { Texto as Text, Entrada as TextInput } from "../components/Texto";
import { Tocavel } from "../components/Tocavel";
import { Icone } from "../components/Icone";
import { NavIcone } from "../components/NavIcone";
import { CategoryIcon, corCategoria } from "../components/CategoryIcon";
import { FaceCartao, PROPORCAO_CARTAO, misturar } from "../components/cartoes/FaceCartao";
import { AnelGastos, type Fatia } from "../components/cartoes/AnelGastos";
import { GraficoGastosCartao, type PontoGrafico } from "../components/cartoes/GraficoGastosCartao";
import { auxiliares, cartaoFisico, corBanco, tipo, useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";
import { formatarDinheiro } from "../utils/dinheiro";

type Estado = "carteira" | "leque" | "detalhe";
type Periodo = "Semana" | "Mês" | "Ano";
type Alvo = { x: number; y: number; rot: number; esc: number; op: number; z: number };

const MOLA = { damping: 18, stiffness: 160 };
const DIA = 86_400_000;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const OCULTO = "R$ •••••";
const ALTURA_PALCO: Record<Estado, number> = { carteira: 346, leque: 236, detalhe: 222 };

const diasAte = (data: string, hoje: string) => Math.round((Date.parse(hoje) - Date.parse(data)) / DIA);
const somarDias = (data: string, n: number) => { const d = new Date(`${data}T12:00:00`); d.setDate(d.getDate() + n); return hojeLocal(d); };
const quando = (data: string, hoje: string) => { const d = diasAte(data, hoje); if (d <= 0) return "Hoje"; if (d === 1) return "Ontem"; const x = new Date(`${data}T12:00:00`); return `${x.getDate()} ${MESES[x.getMonth()]}`; };

/** Onde cada cartão fica em cada estado: guardado na carteira, aberto em leque ou só o escolhido, em destaque. */
function alvoDe(estado: Estado, i: number, foco: number): Alvo {
  const k = i - foco, a = Math.abs(k);
  if (estado === "carteira") return { x: 0, y: 6 + i * 34, rot: 0, esc: 1, op: 1, z: i + 1 };
  if (estado === "leque") return { x: k * 42, y: 18 + a * 12, rot: k * 6, esc: 1 - a * 0.08, op: a > 2 ? 0 : 1, z: 10 - a };
  return k ? { x: k * 70, y: -30, rot: 0, esc: 0.8, op: 0, z: 1 } : { x: 0, y: 12, rot: 0, esc: 1.04, op: 1, z: 10 };
}

function Vaga({ alvo, esquerda, reduzir, children }: { alvo: Alvo; esquerda: number; reduzir: boolean; children: React.ReactNode }) {
  const x = useSharedValue(alvo.x), y = useSharedValue(alvo.y), rot = useSharedValue(alvo.rot), esc = useSharedValue(alvo.esc), op = useSharedValue(alvo.op);
  useEffect(() => {
    const m = (v: number) => (reduzir ? v : withSpring(v, MOLA));
    x.value = m(alvo.x); y.value = m(alvo.y); rot.value = m(alvo.rot); esc.value = m(alvo.esc);
    op.value = reduzir ? alvo.op : withTiming(alvo.op, { duration: 300 });
  }, [alvo.x, alvo.y, alvo.rot, alvo.esc, alvo.op, reduzir]);
  const estilo = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${rot.value}deg` }, { scale: esc.value }],
  }));
  return <Animated.View pointerEvents={alvo.op ? "auto" : "none"} style={[{ position: "absolute", top: 0, left: esquerda, zIndex: alvo.z, elevation: alvo.z }, estilo]}>{children}</Animated.View>;
}

/** Frente e verso do cartão aberto; o ângulo vem do arraste (gira para o lado em que a pessoa arrastou). */
function CartaoVirando({ ang, frente, verso, largura }: { ang: SharedValue<number>; frente: React.ReactNode; verso: React.ReactNode; largura: number }) {
  const lado = (extra: number) => () => {
    "worklet";
    const n = (((ang.value + extra) % 360) + 360) % 360;
    return { opacity: n < 90 || n > 270 ? 1 : 0, transform: [{ perspective: 1100 }, { rotateY: `${ang.value + extra}deg` }] };
  };
  const ef = useAnimatedStyle(lado(0)), ev = useAnimatedStyle(lado(180));
  return (
    <View style={{ width: largura, height: largura * PROPORCAO_CARTAO }}>
      <Animated.View style={[StyleSheet.absoluteFill, { backfaceVisibility: "hidden" }, ef]}>{frente}</Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { backfaceVisibility: "hidden" }, ev]}>{verso}</Animated.View>
    </View>
  );
}

export function Cartoes() {
  const tema = useTema(), c = tema.cores, banco = useBanco(), reduzir = useReducedMotion();
  const { width } = useWindowDimensions();
  const palcoL = width - 40, W = Math.min(290, palcoL - 40);

  const [cartoes, setCartoes] = useState<PainelCartao[]>([]);
  const [compras, setCompras] = useState<CompraCartao[]>([]);
  const [titular, setTitular] = useState("Você");
  const [oculto, setOculto] = useState(false);
  const [estado, setEstado] = useState<Estado>("carteira");
  const [foco, setFoco] = useState(0);
  const [virado, setVirado] = useState(false);
  const [busca, setBusca] = useState("");
  const [soParceladas, setSoParceladas] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("Mês");
  const [larguraFolha, setLarguraFolha] = useState(0);
  const [olhoToques, setOlhoToques] = useState(0);
  const hoje = hojeLocal();

  const carregar = useCallback(async () => {
    const [p, cs, perfil, oc] = await Promise.all([montarPainel(banco), listarComprasCartoes(banco, somarDias(hojeLocal(), -365)), lerPerfil(banco), lerPrivacidade()]);
    setCartoes(p.cartoes); setCompras(cs); setOculto(oc);
    setTitular(perfil?.nomeCompleto?.trim() || perfil?.apelido?.trim() || "Você");
    setFoco((f) => Math.min(f, Math.max(0, p.cartoes.length - 1)));
  }, [banco]);
  // o olho é o mesmo da Início: relê ao entrar na aba para as duas telas ficarem iguais
  useFocusEffect(useCallback(() => { carregar().catch(() => {}); }, [carregar]));

  const alternarOlho = () => { setOlhoToques((n) => n + 1); setOculto((o) => { salvarPrivacidade(!o).catch(() => {}); return !o; }); };
  const val = (v: number) => (oculto ? OCULTO : formatarDinheiro(v));
  const cor = (id: string) => corBanco(cartoes.find((k) => k.id === id)?.nome ?? "");
  const nomeDe = (id: string) => cartoes.find((k) => k.id === id)?.nome ?? "Cartão";
  const recentes = (id: string) => compras.filter((x) => x.cartaoId === id && diasAte(x.data, hoje) < 30);
  const atual = cartoes[foco];

  // ── giro do cartão aberto ──
  const ang = useSharedValue(0), base = useRef(0);
  const virar = (dir: 1 | -1) => {
    base.current += dir * 180;
    ang.value = reduzir ? base.current : withSpring(base.current, { damping: 20, stiffness: 120 });
    setVirado((v) => !v);
  };
  const irPara = (e: Estado) => {
    base.current = 0; ang.value = 0; setVirado(false);
    if (e === "detalhe") { setBusca(""); setSoParceladas(false); setPeriodo("Mês"); }
    setEstado(e);
  };

  // ── arraste: no leque troca o cartão; no detalhe vira o cartão acompanhando o dedo ──
  const ref = useRef({ estado, foco, total: cartoes.length, reduzir });
  ref.current = { estado, foco, total: cartoes.length, reduzir };
  const arraste = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => ref.current.estado !== "carteira" && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
    onPanResponderMove: (_, g) => {
      if (ref.current.estado === "detalhe" && !ref.current.reduzir) ang.value = base.current + Math.max(-55, Math.min(55, g.dx * 0.45));
    },
    onPanResponderRelease: (_, g) => {
      const { estado: e, foco: f, total } = ref.current, longe = Math.abs(g.dx) > 36;
      if (e === "detalhe") { if (longe) virar(g.dx < 0 ? -1 : 1); else ang.value = withSpring(base.current, MOLA); }
      else if (e === "leque" && longe) setFoco(Math.max(0, Math.min(total - 1, f + (g.dx < 0 ? 1 : -1))));
    },
    onPanResponderTerminate: () => { ang.value = withSpring(base.current, MOLA); },
  }), []);

  const tocarCartao = (i: number) => {
    if (estado === "carteira") { setFoco(i); irPara("leque"); }
    else if (estado === "leque") { if (i === foco) irPara("detalhe"); else setFoco(i); }
  };

  // ── palco e bolso ──
  const altura = useSharedValue(ALTURA_PALCO.carteira), bolso = useSharedValue(1);
  useEffect(() => {
    altura.value = reduzir ? ALTURA_PALCO[estado] : withSpring(ALTURA_PALCO[estado], MOLA);
    bolso.value = reduzir ? Number(estado === "carteira") : withTiming(Number(estado === "carteira"), { duration: 450 });
  }, [estado, reduzir]);
  const estiloPalco = useAnimatedStyle(() => ({ height: altura.value }));
  const estiloBolso = useAnimatedStyle(() => ({ opacity: bolso.value, transform: [{ translateY: (1 - bolso.value) * 150 }] }));
  const corBolso = tema.dark ? cartaoFisico.bolsoEscuro : c.primario, corBolsoFim = tema.dark ? cartaoFisico.bolsoEscuroFim : misturar(c.primario, auxiliares.preto, 0.25);
  const totalFaturas = cartoes.reduce((s, k) => s + k.faturaCentavos, 0);

  const face = (k: PainelCartao) => <FaceCartao nome={k.nome} cor={corBanco(k.nome)} faturaCentavos={k.faturaCentavos} oculto={oculto} titular={titular} diaFechamento={k.diaFechamento} largura={W} soTopo={estado === "carteira"} />;

  // ── verso: anel por categoria; painel: gráfico por período ──
  const fatias: Fatia[] = useMemo(() => {
    if (!atual) return [];
    const por = new Map<string, Fatia>();
    for (const x of recentes(atual.id)) {
      const k = x.categoriaId ?? "outros";
      const f = por.get(k) ?? { chave: k, nome: x.categoriaNome ?? "Outros", cor: corCategoria(k), valor: 0 };
      f.valor += x.valorCentavos; por.set(k, f);
    }
    return [...por.values()].sort((a, b) => b.valor - a.valor);
  }, [atual?.id, compras]);
  const serie: PontoGrafico[] = useMemo(() => {
    if (!atual) return [];
    const xs = compras.filter((x) => x.cartaoId === atual.id);
    if (periodo === "Ano") return Array.from({ length: 12 }, (_, m) => {
      const d = new Date(`${hoje}T12:00:00`); d.setDate(1); d.setMonth(d.getMonth() - 11 + m);
      const pre = hojeLocal(d).slice(0, 7);
      return { rotulo: MESES[d.getMonth()]!, valor: xs.filter((x) => x.data.startsWith(pre)).reduce((s, x) => s + x.valorCentavos, 0) };
    });
    const n = periodo === "Semana" ? 7 : 10, passo = periodo === "Semana" ? 1 : 3;
    return Array.from({ length: n }, (_, j) => {
      const fim = (n - 1 - j) * passo, d = new Date(`${somarDias(hoje, -fim)}T12:00:00`);
      return {
        rotulo: periodo === "Semana" ? ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][d.getDay()]! : `${d.getDate()}/${d.getMonth() + 1}`,
        valor: xs.filter((x) => { const k = diasAte(x.data, hoje); return k >= fim && k < fim + passo; }).reduce((s, x) => s + x.valorCentavos, 0),
      };
    });
  }, [atual?.id, compras, periodo]);
  const totalSerie = serie.reduce((s, p) => s + p.valor, 0);

  const Linha = ({ x, i, etiqueta }: { x: CompraCartao; i: number; etiqueta: boolean }) => (
    <Animated.View entering={reduzir ? undefined : FadeInDown.delay(i * 35)} style={[s.li, { borderBottomColor: c.borda }]}
      accessible accessibilityLabel={`${x.descricao}, ${quando(x.data, hoje)}, ${oculto ? "valor oculto" : formatarDinheiro(x.valorCentavos)}${x.parcela ? `, parcela ${x.parcela}` : ""}${etiqueta ? `, cartão ${nomeDe(x.cartaoId)}` : ""}`}>
      <CategoryIcon categoriaId={x.categoriaId} tamanho={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...tipo.corpo(14, "semibold"), color: c.texto }} numberOfLines={1}>{x.descricao}</Text>
        <Text style={{ ...tipo.corpo(12, "medium"), color: c.textoSuave }} numberOfLines={1}>
          {quando(x.data, hoje)}{x.parcela ? <Text style={{ ...tipo.corpo(12, "semibold"), color: c.primario }}> · parcela {x.parcela}</Text> : null}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={{ ...tipo.valor(14, false), color: c.texto }}>−{val(x.valorCentavos)}</Text>
        {etiqueta && <View style={[s.tag, { backgroundColor: `${cor(x.cartaoId)}26` }]}><Text style={{ ...tipo.corpo(10.5, "semibold"), color: misturar(cor(x.cartaoId), c.texto, 0.28) }} numberOfLines={1}>{nomeDe(x.cartaoId)}</Text></View>}
      </View>
    </Animated.View>
  );
  const Lista = ({ itens, etiqueta, vazio }: { itens: CompraCartao[]; etiqueta: boolean; vazio: string }) => (
    itens.length ? <>{itens.map((x, i) => <Linha key={x.id} x={x} i={i} etiqueta={etiqueta} />)}</>
      : <Text style={{ ...tipo.corpo(13), color: c.textoSuave, textAlign: "center", paddingVertical: 14 }}>{vazio}</Text>
  );
  const Limite = ({ k }: { k: PainelCartao }) => {
    const p = k.limiteCentavos > 0 ? Math.min(1, k.faturaCentavos / k.limiteCentavos) : 0;
    return (
      <View style={[s.card, { backgroundColor: c.superficie, borderColor: c.borda, padding: 14, gap: 9 }]}>
        <View style={s.entre}><Text style={{ ...tipo.corpo(13, "medium"), color: c.textoSuave }}>Gasto neste ciclo</Text>
          <Text style={{ ...tipo.valor(16), color: c.texto }}>{val(k.faturaCentavos)}<Text style={{ ...tipo.corpo(12, "medium"), color: c.textoSuave }}> / {oculto ? "•••" : formatarDinheiro(k.limiteCentavos)}</Text></Text></View>
        <View style={[s.barra, { backgroundColor: c.fundo }]}>
          <View style={[StyleSheet.absoluteFill, s.tracos]}>{Array.from({ length: 60 }, (_, j) => <View key={j} style={{ width: 3, height: 12, backgroundColor: c.borda }} />)}</View>
          <View style={{ width: `${Math.max(1.5, p * 100)}%`, height: "100%", borderRadius: 4, backgroundColor: corBanco(k.nome) }} />
        </View>
        <View style={s.entre}><Text style={{ ...tipo.corpo(11.5, "medium"), color: c.textoSuave }}>{Math.round(p * 100)}% do limite</Text>
          <Text style={{ ...tipo.corpo(11.5, "medium"), color: c.textoSuave }}>Disponível {val(Math.max(0, k.limiteCentavos - k.faturaCentavos))}</Text></View>
      </View>
    );
  };

  const titulo = estado === "carteira" ? "Cartões" : estado === "leque" ? "Seus cartões" : atual?.nome ?? "Cartão";
  const sub = estado === "carteira" ? "Faturas e compras" : estado === "leque" ? `${foco + 1} de ${cartoes.length}` : `Fecha dia ${atual?.diaFechamento ?? "-"}`;
  const ultimas = compras.filter((x) => diasAte(x.data, hoje) < 30).slice(0, 8);

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={s.rolagem} showsVerticalScrollIndicator={false}>
        <View style={s.cab}>
          {estado !== "carteira" && (
            <Animated.View entering={reduzir ? undefined : FadeIn} exiting={reduzir ? undefined : FadeOut}>
              <Tocavel onPress={() => irPara(estado === "detalhe" ? "leque" : "carteira")} style={[s.redondo, { backgroundColor: c.superficie, borderColor: c.borda }]} accessibilityRole="button" accessibilityLabel="Voltar">
                <Icone nome="angle-small-left" tamanho={22} cor={c.texto} />
              </Tocavel>
            </Animated.View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ ...tipo.corpo(13), color: c.textoSuave }}>{sub}</Text>
            <Text style={{ ...tipo.display(22), color: c.texto }} accessibilityRole="header">{titulo}</Text>
          </View>
        </View>

        {cartoes.length === 0 ? (
          <View style={[s.card, { backgroundColor: c.superficie, borderColor: c.borda, padding: 20, gap: 6 }]}>
            <Text style={{ ...tipo.valor(17), color: c.texto }}>Nenhum cartão por aqui</Text>
            <Text style={{ ...tipo.corpo(14), color: c.textoSuave }}>Conecte seu banco pelo Meu Pluggy (em Mais) e os cartões aparecem nesta carteira.</Text>
          </View>
        ) : (
          <>
            <Animated.View style={[{ width: palcoL }, estiloPalco]} {...arraste.panHandlers}>
              <Animated.View style={[s.costas, { backgroundColor: misturar(corBolso, auxiliares.branco, tema.dark ? 0.08 : 0.25) }, estiloBolso]} />
              {cartoes.map((k, i) => {
                const aberto = estado === "detalhe" && i === foco;
                return (
                  <Vaga key={k.id} alvo={alvoDe(estado, i, foco)} esquerda={(palcoL - W) / 2} reduzir={reduzir}>
                    <Pressable onPress={() => tocarCartao(i)} disabled={estado === "detalhe"} accessibilityRole="button"
                      accessibilityLabel={estado === "leque" && i === foco ? `${k.nome}. Toque para abrir` : `${k.nome}, fatura ${val(k.faturaCentavos)}`}>
                      {aberto ? (
                        <CartaoVirando ang={ang} largura={W} frente={face(k)} verso={
                          <View style={[s.verso, { width: W, height: W * PROPORCAO_CARTAO, backgroundColor: cartaoFisico.versoFundo }]}>
                            <AnelGastos fatias={fatias} total={fatias.reduce((s2, f) => s2 + f.valor, 0)} oculto={oculto} ativo={virado} reduzir={reduzir} />
                            <Text style={s.dicaVerso}>Arraste para ver a frente</Text>
                          </View>
                        } />
                      ) : face(k)}
                    </Pressable>
                  </Vaga>
                );
              })}
              <Animated.View pointerEvents={estado === "carteira" ? "auto" : "none"} style={[s.bolso, estiloBolso]}>
                <Svg width={palcoL} height={204} viewBox="0 0 350 168" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                  <Defs>
                    <Degrade id="bolso" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={corBolso} /><Stop offset="1" stopColor={corBolsoFim} /></Degrade>
                    <Degrade id="brilho" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={auxiliares.branco} stopOpacity={0.16} /><Stop offset="0.5" stopColor={auxiliares.branco} stopOpacity={0} /></Degrade>
                  </Defs>
                  <Path d="M0 34Q0 10 24 10C110 10 118 50 175 50S240 10 326 10Q350 10 350 34V144Q350 168 326 168H24Q0 168 0 144Z" fill="url(#bolso)" />
                  <Path d="M0 34Q0 10 24 10C110 10 118 50 175 50S240 10 326 10Q350 10 350 34V144Q350 168 326 168H24Q0 168 0 144Z" fill="url(#brilho)" />
                  <Path d="M10 36Q10 20 28 20C108 20 118 60 175 60S242 20 322 20Q340 20 340 36V142Q340 158 324 158H26Q10 158 10 142Z" fill="none" stroke={auxiliares.branco} strokeOpacity={0.42} strokeWidth={1.4} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
                </Svg>
                <View style={s.bolsoC}>
                  <Text style={{ ...tipo.corpo(12.5, "medium"), color: auxiliares.branco, opacity: 0.82 }} numberOfLines={1}>Total das faturas atuais</Text>
                  <Text style={{ ...tipo.valor(28), color: auxiliares.branco }} numberOfLines={1} adjustsFontSizeToFit>{val(totalFaturas)}</Text>
                  <View style={[s.entre, { marginTop: 10 }]}>
                    <Tocavel onPress={() => irPara("leque")} style={s.pilulaBolso} accessibilityRole="button" accessibilityLabel="Minha Carteira, abrir os cartões">
                      <Text style={{ ...tipo.corpo(13, "semibold"), color: auxiliares.branco }}>Minha Carteira</Text>
                      <Icone nome="angle-small-right" tamanho={16} cor={auxiliares.branco} />
                    </Tocavel>
                    <Tocavel onPress={alternarOlho} style={s.olho} accessibilityRole="button" accessibilityState={{ selected: oculto }} accessibilityLabel={oculto ? "Mostrar valores" : "Esconder valores"}>
                      <NavIcone nome="eye" riscado={oculto} tamanho={18} cor={auxiliares.branco} play={olhoToques} />
                    </Tocavel>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>

            {estado === "carteira" && (
              <Animated.View key="carteira" entering={reduzir ? undefined : FadeInDown} style={{ gap: 12 }}>
                <Text style={[s.secao, { color: c.texto }]} accessibilityRole="header">Últimas compras no cartão</Text>
                <View style={[s.card, s.lista, { backgroundColor: c.superficie, borderColor: c.borda }]}>
                  <Lista itens={ultimas} etiqueta vazio="Nenhuma compra nos cartões nos últimos 30 dias." />
                </View>
              </Animated.View>
            )}

            {estado === "leque" && atual && (
              <Animated.View key={`leque-${atual.id}`} entering={reduzir ? undefined : FadeInDown} style={{ gap: 14 }}>
                <View style={s.pontos} accessibilityRole="tablist">
                  {cartoes.map((k, i) => (
                    <Pressable key={k.id} onPress={() => setFoco(i)} hitSlop={8} accessibilityRole="tab" accessibilityState={{ selected: i === foco }} accessibilityLabel={k.nome}
                      style={{ width: i === foco ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === foco ? c.primario : c.borda }} />
                  ))}
                </View>
                <Text style={{ ...tipo.corpo(12, "medium"), color: c.textoSuave, textAlign: "center", marginTop: -6 }}>Deslize para trocar · toque no cartão da frente para abrir</Text>
                <View style={[s.card, { backgroundColor: c.superficie, borderColor: c.borda, padding: 16, gap: 2 }]}>
                  <Text style={{ ...tipo.corpo(12.5, "medium"), color: c.textoSuave }}>Gasto no {atual.nome} nos últimos 30 dias</Text>
                  <Text style={{ ...tipo.valor(28), color: c.texto }}>{val(recentes(atual.id).reduce((s2, x) => s2 + x.valorCentavos, 0))}</Text>
                  <Text style={{ ...tipo.corpo(12.5, "medium"), color: c.textoSuave }}>{recentes(atual.id).length} compras nos últimos 30 dias</Text>
                </View>
                <Limite k={atual} />
                {fatias.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                    {fatias.map((f) => (
                      <View key={f.chave} style={[s.chip, { backgroundColor: c.superficie, borderColor: c.borda }]}>
                        <CategoryIcon categoriaId={f.chave === "outros" ? null : f.chave} tamanho={32} />
                        <View><Text style={{ ...tipo.corpo(12.5, "semibold"), color: c.texto }}>{f.nome}</Text><Text style={{ ...tipo.corpo(11.5), color: c.textoSuave }}>{val(f.valor)}</Text></View>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <Text style={[s.secao, { color: c.texto }]} accessibilityRole="header">Compras recentes</Text>
                <View style={[s.card, s.lista, { backgroundColor: c.superficie, borderColor: c.borda }]}>
                  <Lista itens={recentes(atual.id).slice(0, 6)} etiqueta={false} vazio="Nenhuma compra neste cartão nos últimos 30 dias." />
                </View>
              </Animated.View>
            )}

            {estado === "detalhe" && atual && (
              <Animated.View key={`det-${atual.id}`} entering={reduzir ? undefined : FadeInDown} style={{ gap: 14 }}>
                <Limite k={atual} />
                <View style={[s.linha, { justifyContent: "center", gap: 6, marginTop: -4 }]}>
                  <Icone nome="angle-small-left" tamanho={14} cor={c.primario} />
                  <Text style={{ ...tipo.corpo(11.5, "medium"), color: c.textoSuave }}>Arraste para a direita ou esquerda para virar o cartão</Text>
                  <Icone nome="angle-small-right" tamanho={14} cor={c.primario} />
                </View>
                <View style={[s.folha, { backgroundColor: c.superficie, borderColor: c.borda }]} onLayout={(e) => setLarguraFolha(e.nativeEvent.layout.width - 40)}>
                  <View style={[s.alca, { backgroundColor: c.borda }]} />
                  {!virado ? (
                    <Animated.View key="frente" entering={reduzir ? undefined : FadeInDown.delay(120)} exiting={reduzir ? undefined : FadeOut.duration(150)}>
                      <View style={[s.busca, { backgroundColor: c.fundo, borderColor: c.borda }]}>
                        <Icone nome="search" tamanho={16} cor={c.textoSuave} />
                        <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar compra ou categoria" placeholderTextColor={c.textoSuave}
                          style={{ flex: 1, ...tipo.corpo(14, "medium"), color: c.texto, paddingVertical: 0 }} accessibilityLabel="Buscar compras deste cartão" />
                      </View>
                      <View style={[s.linha, { gap: 8, marginTop: 12, marginBottom: 2 }]}>
                        {([["Todas", false], ["Parceladas", true]] as const).map(([r, v]) => (
                          <Tocavel key={r} onPress={() => setSoParceladas(v)} accessibilityRole="radio" accessibilityState={{ checked: soParceladas === v }}
                            style={[s.filtro, { borderColor: soParceladas === v ? c.primario : c.borda, backgroundColor: soParceladas === v ? c.primario : "transparent" }]}>
                            <Text style={{ ...tipo.corpo(12, "semibold"), color: soParceladas === v ? c.sobrePrimario : c.textoSuave }}>{r}</Text>
                          </Tocavel>
                        ))}
                      </View>
                      <Lista etiqueta={false}
                        itens={recentes(atual.id).filter((x) => (!soParceladas || x.parcela) && (!busca.trim() || `${x.descricao} ${x.categoriaNome ?? ""}`.toLowerCase().includes(busca.trim().toLowerCase()))).slice(0, 12)}
                        vazio={recentes(atual.id).length ? "Nenhuma compra encontrada." : "Nenhuma compra neste cartão nos últimos 30 dias."} />
                    </Animated.View>
                  ) : (
                    <Animated.View key="verso" entering={reduzir ? undefined : FadeInDown.delay(120)} exiting={reduzir ? undefined : FadeOut.duration(150)}>
                      <View style={[s.entre, { alignItems: "flex-end", marginBottom: 40 }]}>
                        <View>
                          <Text style={{ ...tipo.corpo(12, "medium"), color: c.textoSuave }}>{periodo === "Semana" ? "Últimos 7 dias" : periodo === "Mês" ? "Últimos 30 dias" : "Últimos 12 meses"}</Text>
                          <Text style={{ ...tipo.valor(24), color: c.texto }}>{val(totalSerie)}</Text>
                        </View>
                        <View style={[s.periodos, { backgroundColor: misturar(c.fundo, c.texto, 0.06) }]} accessibilityRole="tablist">
                          {(["Semana", "Mês", "Ano"] as const).map((p) => (
                            <Pressable key={p} onPress={() => setPeriodo(p)} accessibilityRole="tab" accessibilityState={{ selected: p === periodo }}
                              style={[s.periodo, p === periodo && { backgroundColor: c.texto }]}>
                              <Text style={{ ...tipo.corpo(12, "semibold"), color: p === periodo ? c.fundo : c.textoSuave }}>{p}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      <GraficoGastosCartao pontos={serie} largura={larguraFolha} oculto={oculto} rotulo={`Gastos do ${atual.nome}, ${periodo.toLowerCase()}`} />
                      <Text style={{ ...tipo.corpo(12), color: c.textoSuave, marginTop: 14 }}>
                        Média de {val(Math.round(totalSerie / Math.max(1, serie.length)))} por {periodo === "Ano" ? "mês" : periodo === "Semana" ? "dia" : "3 dias"}. Arraste no gráfico para ver cada ponto.
                      </Text>
                    </Animated.View>
                  )}
                </View>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  rolagem: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 18 },
  cab: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 46 },
  redondo: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  linha: { flexDirection: "row", alignItems: "center" },
  entre: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  card: { borderRadius: 24, borderWidth: 1 },
  lista: { paddingHorizontal: 14, paddingVertical: 4 },
  li: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  tag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, maxWidth: 120 },
  secao: { ...tipo.valor(17, false) },
  costas: { position: "absolute", left: 0, right: 0, top: 74, height: 226, borderRadius: 28 },
  // costura do SVG vai de y=20..158 em 168: com 204 de altura o conteúdo cabe abaixo da curva, longe da linha
  bolso: { position: "absolute", left: 0, right: 0, top: 126, height: 204, zIndex: 40, elevation: 40 },
  bolsoC: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 30, paddingBottom: 28 },
  pilulaBolso: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingLeft: 18, paddingRight: 14, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  olho: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  verso: { borderRadius: 20, overflow: "hidden", paddingLeft: 16, paddingRight: 14, paddingTop: 14, paddingBottom: 22, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  dicaVerso: { position: "absolute", left: 0, right: 0, bottom: 7, textAlign: "center", ...tipo.corpo(10, "medium"), color: "rgba(255,255,255,0.55)" },
  pontos: { flexDirection: "row", justifyContent: "center", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8, paddingLeft: 8, paddingRight: 12, borderRadius: 16, borderWidth: 1 },
  barra: { height: 12, borderRadius: 4, overflow: "hidden" },
  tracos: { flexDirection: "row", gap: 3 },
  folha: { marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, minHeight: 380 },
  alca: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, marginBottom: 14 },
  busca: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  filtro: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
  periodos: { flexDirection: "row", padding: 3, borderRadius: 99 },
  periodo: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
});

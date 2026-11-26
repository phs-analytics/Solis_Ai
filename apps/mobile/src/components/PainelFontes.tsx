import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import type { PainelCartao, PainelCofrinhos, PainelConta, Mov24 } from "@solis/dados";
import { hojeLocal, listarMovsConta } from "@solis/dados";
import { inicioPeriodo, tipoLancamento } from "@solis/core";
import { useBanco } from "../contexto/BancoContext";
import { auxiliares, tipo, useTema } from "../theme";
import { formatarDinheiro } from "../utils/dinheiro";
import { Texto as Text } from "./Texto";
import { Icone } from "./Icone";
import { CategoryIcon, corCategoria } from "./CategoryIcon";
import { FaceCartao } from "./cartoes/FaceCartao";
import { corBanco } from "../theme";

const OCULTO = "R$ ••••";
const entra = (i: number) => FadeInDown.delay(80 + i * 45).springify().damping(18).stiffness(220);
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const sinal = (v: number) => (v > 0 ? "+" : "−");

function Resumo({ movs, oculto }: { movs: { centavos: number }[]; oculto: boolean }) {
  const c = useTema().cores;
  const e = movs.filter((m) => m.centavos > 0).reduce((s, m) => s + m.centavos, 0);
  const sa = movs.filter((m) => m.centavos < 0).reduce((s, m) => s - m.centavos, 0);
  return (
    <Animated.View entering={entra(2)} style={{ flexDirection: "row", gap: 8 }}>
      {([["Entrou", e, c.sucesso, "+"], ["Saiu", sa, c.erro, "−"]] as const).map(([r, v, cor, sg]) => (
        <View key={r} style={[s.mini, { backgroundColor: c.fundo }]}>
          <Text style={{ ...tipo.corpo(11, "medium"), color: c.textoSuave }}>{r}</Text>
          <Text style={{ ...tipo.valor(15), color: cor }}>{oculto ? OCULTO : `${sg}${formatarDinheiro(v)}`}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

function Rotulo({ texto, i }: { texto: string; i: number }) {
  const c = useTema().cores;
  return <Animated.View entering={entra(i)}><Text style={{ ...tipo.corpo(11, "semibold"), color: c.textoSuave, letterSpacing: 0.6 }}>{texto.toUpperCase()}</Text></Animated.View>;
}

function Vazio({ i }: { i: number }) {
  const c = useTema().cores;
  return <Animated.View entering={entra(i)}><Text style={{ ...tipo.corpo(13), color: c.textoSuave, textAlign: "center", paddingVertical: 12 }}>Nenhum movimento nas últimas 24 horas.</Text></Animated.View>;
}

function Linha({ m, i, oculto, extra, icone }: { m: Mov24; i: number; oculto: boolean; extra?: React.ReactNode; icone: React.ReactNode }) {
  const c = useTema().cores;
  return (
    <Animated.View entering={entra(i)} style={[s.li, { borderColor: c.borda }]}>
      {icone}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...tipo.corpo(14, "medium"), color: c.texto }} numberOfLines={1}>{m.descricao}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {!!m.quando && <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>{hora(m.quando)}</Text>}
          {extra}
        </View>
      </View>
      <Text style={{ ...tipo.valor(14, false), color: m.centavos > 0 ? c.sucesso : c.texto }}>{oculto ? OCULTO : `${sinal(m.centavos)}${formatarDinheiro(Math.abs(m.centavos))}`}</Text>
    </Animated.View>
  );
}

function Cabecalho({ icone, cor, titulo, sub }: { icone: React.ComponentProps<typeof Icone>["nome"]; cor: string; titulo: string; sub: string }) {
  const c = useTema().cores;
  return (
    <Animated.View entering={entra(0)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={[s.tile, { backgroundColor: cor }]}><Icone nome={icone} tamanho={22} cor={auxiliares.branco} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...tipo.display(17), color: c.texto }} numberOfLines={1}>{titulo}</Text>
        <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>{sub}</Text>
      </View>
    </Animated.View>
  );
}

function Saldo({ rotulo, valor, oculto }: { rotulo: string; valor: number; oculto: boolean }) {
  const c = useTema().cores;
  return (
    <Animated.View entering={entra(1)}>
      <Text style={{ ...tipo.corpo(11, "semibold"), color: c.textoSuave, letterSpacing: 0.6 }}>{rotulo.toUpperCase()}</Text>
      <Text style={{ ...tipo.valor(28), color: c.texto, letterSpacing: -0.8 }}>{oculto ? OCULTO : formatarDinheiro(valor)}</Text>
    </Animated.View>
  );
}

const PERIODOS = [["hoje", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["6m", "Últ. 6 meses"]] as const;
type PeriodoConta = (typeof PERIODOS)[number][0];
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Pop-out do banco: saldo e lançamentos de hoje, da semana atual, do mês atual ou dos últimos 6 meses. */
export function ConteudoConta({ conta, oculto }: { conta: PainelConta; oculto: boolean }) {
  const c = useTema().cores;
  const banco = useBanco();
  const [periodo, setPeriodo] = useState<PeriodoConta>("semana");
  const [movs, setMovs] = useState<Mov24[] | null>(null);
  useEffect(() => {
    let vivo = true;
    setMovs(null);
    listarMovsConta(banco, conta.id, inicioPeriodo(hojeLocal(), periodo)).then((m) => { if (vivo) setMovs(m); }).catch(() => vivo && setMovs([]));
    return () => { vivo = false; };
  }, [banco, conta.id, periodo]);
  return (
    <>
      <Cabecalho icone="bank" cor={c.primario} titulo={conta.nome} sub="Conta" />
      <Saldo rotulo="Saldo" valor={conta.saldoCentavos} oculto={oculto} />
      <Animated.View entering={entra(2)} style={s.periodos} accessibilityRole="tablist">
        {PERIODOS.map(([k, r]) => {
          const on = periodo === k;
          return (
            <Pressable key={k} onPress={() => setPeriodo(k)} style={[s.per, { borderColor: on ? c.texto : c.borda, backgroundColor: on ? c.texto : "transparent" }]}
              accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={{ ...tipo.corpo(12, "semibold"), color: on ? c.fundo : c.textoSuave }} numberOfLines={1}>{r}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
      {movs === null ? <ActivityIndicator color={c.primario} style={{ paddingVertical: 16 }} /> : (
        <>
          <Resumo movs={movs} oculto={oculto} />
          <View>
            {movs.length ? movs.map((m, i) => (
              <Linha key={m.id} m={{ ...m, quando: "" }} i={Math.min(i, 8) + 3} oculto={oculto}
                extra={<Text style={{ ...tipo.corpo(12), color: c.textoSuave }} numberOfLines={1}>{tipoLancamento(m.descricao, m.centavos)} · {diaMes(m.quando)}</Text>}
                icone={<CategoryIcon categoriaId={m.categoriaId} tipo={m.centavos > 0 ? "receita" : "despesa"} tamanho={36} />} />
            )) : (
              <Text style={{ ...tipo.corpo(13), color: c.textoSuave, textAlign: "center", paddingVertical: 12 }}>
                Nenhum lançamento {periodo === "hoje" ? "hoje" : "neste período"}.
              </Text>
            )}
          </View>
        </>
      )}
    </>
  );
}

// Cor estável por meta, das cores de categoria do app.
const CORES_META = ["cat_transporte", "cat_alimentacao", "cat_saude", "cat_vestuario", "cat_educacao", "cat_lazer"];
const corMeta = (nome: string) => corCategoria(CORES_META[[...nome].reduce((s, ch) => s + ch.charCodeAt(0), 0) % CORES_META.length]);

export function ConteudoCofrinhos({ cof, oculto }: { cof: PainelCofrinhos; oculto: boolean }) {
  const c = useTema().cores;
  return (
    <>
      <Cabecalho icone="piggy-bank" cor={c.primario} titulo="Cofrinhos" sub={`${cof.metas.length} ${cof.metas.length === 1 ? "meta guardando" : "metas guardando"} dinheiro`} />
      <Saldo rotulo="Total guardado" valor={cof.totalCentavos} oculto={oculto} />
      <Animated.ScrollView entering={entra(2)} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
        {cof.metas.map((m) => {
          const cor = corMeta(m.nome), pct = m.alvoCentavos > 0 ? Math.min(1, m.atualCentavos / m.alvoCentavos) : 0;
          return (
            <View key={m.id} style={[s.meta, { backgroundColor: `${cor}1F`, borderColor: `${cor}47` }]}>
              <Text style={{ ...tipo.corpo(12, "semibold"), color: c.texto }} numberOfLines={1}>{m.nome}</Text>
              <Text style={{ ...tipo.valor(15), color: c.texto }}>{oculto ? OCULTO : formatarDinheiro(m.atualCentavos)}</Text>
              <View style={[s.barra, { backgroundColor: `${cor}38` }]}><View style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 3, backgroundColor: cor }} /></View>
            </View>
          );
        })}
      </Animated.ScrollView>
      <Resumo movs={cof.mov24} oculto={oculto} />
      <Rotulo texto="Últimas 24 horas" i={4} />
      <View>
        {cof.mov24.length ? cof.mov24.map((m, i) => {
          const cor = corMeta(m.meta);
          return (
            <Linha key={m.id} m={m} i={i + 5} oculto={oculto}
              icone={<View style={[s.ic, { backgroundColor: cor }]}><Icone nome="piggy-bank" tamanho={16} cor={auxiliares.branco} /></View>}
              extra={<View style={[s.tag, { backgroundColor: `${cor}29` }]}><View style={[s.ponto, { backgroundColor: cor }]} /><Text style={{ ...tipo.corpo(10.5, "semibold"), color: cor }} numberOfLines={1}>{m.meta}</Text></View>} />
          );
        }) : <Vazio i={5} />}
      </View>
    </>
  );
}

export function ConteudoCartao({ cartao, oculto, titular = "Você" }: { cartao: PainelCartao; oculto: boolean; titular?: string }) {
  const c = useTema().cores;
  const [largura, setLargura] = useState(0);
  const pct = cartao.limiteCentavos > 0 ? Math.min(1, cartao.faturaCentavos / cartao.limiteCentavos) : 0;
  return (
    <>
      <Animated.View entering={entra(0)} onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
        {largura > 0 && <FaceCartao nome={cartao.nome} cor={corBanco(cartao.nome)} faturaCentavos={cartao.faturaCentavos} oculto={oculto} titular={titular} diaFechamento={cartao.diaFechamento} largura={largura} />}
      </Animated.View>
      <Animated.View entering={entra(1)} style={{ gap: 6 }}>
        <View style={[s.limite, { backgroundColor: c.fundo }]}><View style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 4, backgroundColor: corBanco(cartao.nome) }} /></View>
        <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>
          {oculto ? "Limite oculto" : `${formatarDinheiro(cartao.faturaCentavos)} usados de ${formatarDinheiro(cartao.limiteCentavos)}`} · fecha dia {cartao.diaFechamento}
        </Text>
      </Animated.View>
      <Rotulo texto="Últimas 24 horas no cartão" i={2} />
      {cartao.mov.length ? (
        <Animated.View entering={entra(3)} style={[s.cupom, { backgroundColor: c.fundo }]}>
          {cartao.mov.map((m, i) => (
            <View key={m.id} style={[s.cp, i < cartao.mov.length - 1 && { borderBottomWidth: 1, borderStyle: "dashed", borderColor: c.borda }]}>
              <Text style={{ ...tipo.corpo(12, "semibold"), color: c.textoSuave, width: 44 }}>{m.dia === "hoje" ? "Hoje" : "Ontem"}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...tipo.corpo(14, "medium"), color: c.texto }} numberOfLines={1}>{m.descricao}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ ...tipo.corpo(11.5), color: c.textoSuave }}>{m.pagamento ? "Pagamento recebido" : m.parcela ? "Parcela" : "Compra à vista"}</Text>
                  {m.parcela && <View style={[s.parc, { backgroundColor: c.primarioSuave }]}><Text style={{ ...tipo.corpo(10, "semibold"), color: c.texto }}>{m.parcela}</Text></View>}
                </View>
              </View>
              <Text style={{ ...tipo.valor(14, false), color: m.pagamento ? c.sucesso : c.texto }}>{oculto ? OCULTO : `${m.pagamento ? "+" : "−"}${formatarDinheiro(Math.abs(m.centavos))}`}</Text>
            </View>
          ))}
        </Animated.View>
      ) : <Vazio i={3} />}
    </>
  );
}

const s = StyleSheet.create({
  periodos: { flexDirection: "row", gap: 6 },
  per: { flex: 1, height: 32, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tile: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  mini: { flex: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  li: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  ic: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, borderRadius: 99, flexShrink: 1 },
  ponto: { width: 6, height: 6, borderRadius: 3 },
  meta: { width: 140, borderRadius: 16, padding: 12, borderWidth: 1, gap: 2 },
  barra: { height: 5, borderRadius: 3, marginTop: 8, overflow: "hidden" },
  plastico: { borderRadius: 20, padding: 16, gap: 2 },
  chip: { width: 30, height: 22, borderRadius: 5, backgroundColor: auxiliares.offwhite, opacity: 0.75, marginBottom: 12 },
  limite: { height: 8, borderRadius: 4, overflow: "hidden" },
  cupom: { borderRadius: 16, paddingHorizontal: 14 },
  cp: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 },
  parc: { paddingHorizontal: 6, borderRadius: 6 },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";
import { SafeScreen } from "../components/SafeScreen";
import { Texto as Text, Entrada as TextInput } from "../components/Texto";
import { Icone } from "../components/Icone";
import { Folha } from "../components/investimentos/Folha";
import { GraficoPreco } from "../components/investimentos/GraficoPreco";
import type { PontoPreco } from "../components/investimentos/GraficoPreco";
import { auxiliares, coresClasseAtivo, corFavorito, tipo, useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";
import { formatarDinheiro } from "../utils/dinheiro";
import {
  lerChaveBrapi, lerConsentimentoCotacoes, lerCredenciaisPluggy, lerFavoritosMercado, lerPerfil, lerPrivacidade,
  listarAtivosPluggy, salvarFavoritosMercado, salvarPrivacidade, sincronizarPluggy, ultimaSyncPluggy,
} from "@solis/dados";
import type { Ativo, TipoAtivo } from "@solis/dados";
import {
  ATIVOS_SEM_CHAVE, buscarAtivosMercado, buscarHistorico, buscarIndices, cotacaoDoDia, listarEmAlta,
} from "@solis/core";
import type { AtivoMercado, IndiceEconomico, OrdemMercado, PeriodoHistorico, PerfilInvestidor } from "@solis/core";

const CLASSES: Record<TipoAtivo, [string, string]> = {
  renda_fixa: ["Renda fixa", "Empréstimo para o banco ou para o governo: você sabe as regras de rendimento antes. Ex.: Tesouro, CDB, caixinhas."],
  acao: ["Ações", "Um pedacinho de uma empresa. O preço sobe e desce todo dia."],
  fii: ["FIIs", "Fundos que têm imóveis ou títulos de imóveis. Costumam pagar uma parte do aluguel todo mês."],
  etf: ["ETFs", "Uma cesta com várias ações num código só."],
  cripto: ["Cripto", "Moedas digitais. O preço muda muito e muito rápido."],
  outro: ["Outros", "Previdência, fundos e outros investimentos do seu banco."],
};
const PERFIS: [PerfilInvestidor, string, string][] = [
  ["conservador", "Conservador", "Prefere segurança. Não gosta de ver o dinheiro cair, mesmo que por pouco tempo."],
  ["moderado", "Moderado", "Aceita alguma subida e descida em troca de render um pouco mais, com parte guardada em segurança."],
  ["arrojado", "Arrojado", "Aguenta quedas grandes pensando no longo prazo."],
];
const AJUDA_TAXA: Record<string, string> = {
  selic: "A taxa básica de juros do Brasil, decidida pelo Banco Central. Quando sobe, empréstimos ficam mais caros e a renda fixa rende mais.",
  cdi: "A referência de rendimento da maioria das caixinhas e CDBs. \"100% do CDI\" quer dizer que rende igual a ela.",
  ipca: "A inflação oficial: quanto os preços subiram. Se seu dinheiro rende menos que o IPCA, ele perde poder de compra.",
};
const PERIODOS: [PeriodoHistorico, string][] = [["5d", "1S"], ["1mo", "1M"], ["3mo", "3M"]];
const ORDENS: [OrdemMercado, string][] = [["volume", "Mais negociadas"], ["sobe", "Subiram"], ["cai", "Caíram"]];
const CODIGO_B3 = /^[A-Z]{4}\d{1,2}$/;

const pct = (p: number) => `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(2).replace(".", ",")}%`;
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const compacto = (n: number) => n.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const sigla = (cod: string) => /\s/.test(cod.trim())
  ? cod.trim().split(/\s+/).filter((w) => /^[A-Za-zÀ-ú]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
  : cod.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
const valorHoje = (a: Ativo) => a.valorAtualCentavos ?? Math.round(a.quantidade * a.precoMedioCentavos);
const aplicado = (a: Ativo) => Math.round(a.quantidade * a.precoMedioCentavos);
const corMercado = (t: AtivoMercado["tipo"]) => coresClasseAtivo[t === "outro" ? "outro" : t];

type Aberto = { tipo: "ativo"; ativo: Ativo } | { tipo: "mercado"; ativo: AtivoMercado } | { tipo: "perfil" } | { tipo: "taxa"; indice: IndiceEconomico; chave: string } | null;

export function Investimentos() {
  const c = useTema().cores;
  const banco = useBanco();
  const { width } = useWindowDimensions();

  const [visao, setVisao] = useState<"cart" | "merc">("cart");
  const [oculto, setOculto] = useState(false);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [sync, setSync] = useState<string | null>(null);
  const [temPluggy, setTemPluggy] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [perfil, setPerfil] = useState<PerfilInvestidor | null>(null);
  const [cotOnline, setCotOnline] = useState(true);
  const [chave, setChave] = useState<string | null>(null);
  const [indices, setIndices] = useState<IndiceEconomico[]>([]);
  const [aberto, setAberto] = useState<Aberto>(null);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    const [lista, ultima, cred, pf, online, k, priv] = await Promise.all([
      listarAtivosPluggy(banco), ultimaSyncPluggy(banco), lerCredenciaisPluggy(), lerPerfil(banco).catch(() => null),
      lerConsentimentoCotacoes(), lerChaveBrapi(), lerPrivacidade(),
    ]);
    setAtivos(lista); setSync(ultima); setTemPluggy(!!cred); setPerfil(pf?.perfilInvestidor ?? null);
    setCotOnline(online); setChave(k); setOculto(priv);
  }, [banco]);
  useFocusEffect(useCallback(() => { carregar().catch(() => {}); }, [carregar]));
  useEffect(() => { buscarIndices().then(setIndices).catch(() => setIndices([])); }, []);

  function mostrarAviso(t: string) { setAviso(t); setTimeout(() => setAviso(""), 2600); }
  function alternarOculto() { setOculto((o) => { salvarPrivacidade(!o).catch(() => {}); return !o; }); }

  async function atualizar() {
    const cred = await lerCredenciaisPluggy();
    if (!cred) { mostrarAviso("Conecte um banco pelo Meu Pluggy em Mais."); return; }
    setAtualizando(true);
    try {
      const r = await sincronizarPluggy(banco, cred, { forcar: true });
      await carregar();
      mostrarAviso(r.investimentos ? `${r.investimentos} investimento(s) atualizados.` : "Nenhum investimento encontrado nos bancos conectados.");
    } catch (e) {
      mostrarAviso(e instanceof Error ? e.message : "Não deu para atualizar agora.");
    } finally {
      setAtualizando(false);
    }
  }

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={s.col} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(380)} style={s.cab}>
          <Text style={{ ...tipo.display(22), color: c.texto, flex: 1 }} accessibilityRole="header">Investimentos</Text>
          <Pressable onPress={alternarOculto} style={[s.bt, { borderColor: c.borda, backgroundColor: c.superficie }]}
            accessibilityRole="button" accessibilityLabel={oculto ? "Mostrar valores" : "Esconder valores"}>
            <Icone nome={oculto ? "eye-crossed" : "eye"} tamanho={16} cor={c.texto} />
          </Pressable>
          <Pressable onPress={atualizar} disabled={atualizando} style={[s.bt, { borderColor: c.borda, backgroundColor: c.superficie }]}
            accessibilityRole="button" accessibilityLabel="Atualizar investimentos do Meu Pluggy">
            {atualizando ? <ActivityIndicator size="small" color={c.primario} /> : <Icone nome="arrows-repeat" tamanho={16} cor={c.texto} />}
          </Pressable>
        </Animated.View>

        <View style={[s.seg, { backgroundColor: c.superficie, borderColor: c.borda }]} accessibilityRole="tablist">
          {(["cart", "merc"] as const).map((v) => {
            const on = visao === v;
            return (
              <Pressable key={v} onPress={() => setVisao(v)} style={[s.segBt, on && { backgroundColor: c.primario }]}
                accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <Text style={{ ...tipo.corpo(13, "semibold"), color: on ? c.sobrePrimario : c.textoSuave }}>{v === "cart" ? "Minha carteira" : "Mercado e taxas"}</Text>
              </Pressable>
            );
          })}
        </View>

        {visao === "cart"
          ? <Carteira ativos={ativos} oculto={oculto} sync={sync} temPluggy={temPluggy} perfil={perfil} largura={width}
              abrir={setAberto} />
          : <Mercado banco={banco} indices={indices} cotOnline={cotOnline} abrir={setAberto} />}

        <View style={[s.avisoLegal, { borderColor: c.borda }]} accessibilityRole="text">
          <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>
            <Text style={{ ...tipo.corpo(12, "semibold"), color: c.texto }}>Só informação. </Text>
            O Solis mostra seus próprios dados e números públicos. Nada aqui é recomendação de investimento.
          </Text>
        </View>
      </ScrollView>

      <Detalhe aberto={aberto} fechar={() => setAberto(null)} oculto={oculto} chave={chave} cotOnline={cotOnline}
        perfil={perfil} ativos={ativos} largura={width - 40} banco={banco} />

      {!!aviso && (
        <Animated.View entering={FadeIn} style={[s.toast, { backgroundColor: c.texto }]} pointerEvents="none" accessibilityLiveRegion="polite">
          <Text style={{ ...tipo.corpo(13, "medium"), color: c.fundo }}>{aviso}</Text>
        </Animated.View>
      )}
    </SafeScreen>
  );
}

// ── Minha carteira: só o que veio dos bancos conectados no Meu Pluggy ─────────

function Carteira({ ativos, oculto, sync, temPluggy, perfil, abrir }: {
  ativos: Ativo[]; oculto: boolean; sync: string | null; temPluggy: boolean; perfil: PerfilInvestidor | null; largura: number; abrir: (a: Aberto) => void;
}) {
  const c = useTema().cores;
  if (!ativos.length) {
    return (
      <Animated.View entering={FadeInDown.delay(80).duration(380)} style={[s.card, s.vazio, { backgroundColor: c.superficie, borderColor: c.borda }]}>
        <View style={[s.tile, s.tileGrande, { backgroundColor: c.primarioSuave }]}><Icone nome="bank" tamanho={26} cor={c.primario} /></View>
        <Text style={{ ...tipo.display(16), color: c.texto, textAlign: "center" }}>Nenhum investimento encontrado</Text>
        <Text style={{ ...tipo.corpo(13), color: c.textoSuave, textAlign: "center" }}>
          {temPluggy
            ? "Os bancos conectados no Meu Pluggy não mostraram investimentos. Toque em ⇄ para buscar de novo."
            : "A carteira mostra o que você tem aplicado nos bancos conectados pelo Meu Pluggy. Conecte um banco em Mais."}
        </Text>
      </Animated.View>
    );
  }
  const total = ativos.reduce((n, a) => n + valorHoje(a), 0);
  const pago = ativos.reduce((n, a) => n + aplicado(a), 0);
  const dif = total - pago, difPct = pago ? (dif / pago) * 100 : 0, sobe = dif >= 0;
  const porClasse = (Object.keys(CLASSES) as TipoAtivo[])
    .map((k) => [k, ativos.filter((a) => a.tipo === k).reduce((n, a) => n + valorHoje(a), 0)] as const)
    .filter(([, v]) => v > 0);
  const quando = sync ? new Date(sync).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;
  const nomePerfil = PERFIS.find((p) => p[0] === perfil)?.[1];
  return (
    <>
      <Animated.View entering={FadeInDown.delay(60).duration(380)} style={[s.card, { backgroundColor: c.superficie, borderColor: c.borda }]}>
        <Text style={[s.rot, { color: c.textoSuave }]}>Valor hoje</Text>
        <Text style={{ ...tipo.valor(30), color: c.texto, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>{oculto ? "R$ •••••" : formatarDinheiro(total)}</Text>
        <View style={s.linhaVar}>
          <View style={[s.tag, { backgroundColor: `${sobe ? c.sucesso : c.erro}22` }]}>
            <Text style={{ ...tipo.corpo(12, "semibold"), color: sobe ? c.sucesso : c.erro }}>{pct(difPct)}</Text>
          </View>
          {!oculto && <Text style={{ ...tipo.corpo(13, "semibold"), color: sobe ? c.sucesso : c.erro }}>{sobe ? "+" : "−"}{formatarDinheiro(Math.abs(dif))}</Text>}
          <Text style={{ ...tipo.corpo(13), color: c.textoSuave }}>desde a aplicação</Text>
        </View>
        {nomePerfil && (
          <Pressable onPress={() => abrir({ tipo: "perfil" })} style={[s.perfil, { borderColor: c.borda, backgroundColor: c.primarioSuave }]}
            accessibilityRole="button" accessibilityLabel={`Perfil ${nomePerfil}. Ver o que significa`}>
            <View style={[s.ponto, { backgroundColor: c.primario }]} />
            <Text style={{ ...tipo.corpo(12, "semibold"), color: c.texto }}>Perfil: {nomePerfil} ›</Text>
          </Pressable>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(380)} style={[s.card, { backgroundColor: c.superficie, borderColor: c.borda }]}>
        <Text style={{ ...tipo.display(16), color: c.texto }}>Onde está seu dinheiro</Text>
        <View style={s.barra} accessible accessibilityLabel={porClasse.map(([k, v]) => `${CLASSES[k][0]} ${Math.round((v / total) * 100)}%`).join(", ")}>
          {porClasse.map(([k, v]) => <View key={k} style={{ flex: v, backgroundColor: coresClasseAtivo[k], borderRadius: 4 }} />)}
        </View>
        <View style={s.legenda}>
          {porClasse.map(([k, v]) => (
            <View key={k} style={s.legItem}>
              <View style={[s.legCor, { backgroundColor: coresClasseAtivo[k] }]} />
              <Text style={{ ...tipo.corpo(12), color: c.textoSuave, flex: 1 }} numberOfLines={1}>{CLASSES[k][0]}</Text>
              <Text style={{ ...tipo.valor(12), color: c.texto }}>{Math.round((v / total) * 100)}%</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={s.sec}>
        <Text style={{ ...tipo.display(17), color: c.texto }}>Seus investimentos</Text>
        <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>{ativos.length} {ativos.length === 1 ? "item" : "itens"}</Text>
      </View>
      {quando && <Text style={{ ...tipo.corpo(12), color: c.textoSuave, marginTop: -8 }}>Do Meu Pluggy · atualizado {quando}</Text>}
      {ativos.map((a, i) => {
        const cor = coresClasseAtivo[a.tipo], v = aplicado(a) ? ((valorHoje(a) - aplicado(a)) / aplicado(a)) * 100 : 0;
        return (
          <Animated.View key={a.id} entering={FadeInDown.delay(160 + Math.min(i, 6) * 40).duration(360)}>
            <Pressable onPress={() => abrir({ tipo: "ativo", ativo: a })} style={[s.linha, { backgroundColor: c.superficie, borderColor: c.borda }]}
              accessibilityRole="button" accessibilityLabel={`${a.ticker}, ${CLASSES[a.tipo][0]}, ${a.bancoNome ?? ""}`}>
              <View style={[s.tile, { backgroundColor: `${cor}26` }]}><Text style={{ ...tipo.valor(10.5), color: cor }}>{sigla(a.ticker)}</Text></View>
              <View style={s.info}>
                <Text style={{ ...tipo.corpo(14, "semibold"), color: c.texto }} numberOfLines={1}>{a.ticker}</Text>
                <View style={s.sub}>
                  <View style={[s.badge, { backgroundColor: `${cor}24` }]}><Text style={{ ...tipo.corpo(10, "semibold"), color: cor, lineHeight: 14 }}>{CLASSES[a.tipo][0]}</Text></View>
                  <Text style={{ ...tipo.corpo(11), color: c.textoSuave, flexShrink: 1 }} numberOfLines={1}>
                    {a.bancoNome}{a.tipo === "renda_fixa" ? "" : ` · ${a.quantidade.toLocaleString("pt-BR")} cotas`}
                  </Text>
                </View>
              </View>
              <View style={s.val}>
                <Text style={{ ...tipo.valor(14), color: c.texto }} numberOfLines={1}>{oculto ? "R$ •••" : formatarDinheiro(valorHoje(a))}</Text>
                <Text style={{ ...tipo.corpo(11, "semibold"), color: v >= 0 ? c.sucesso : c.erro }}>{pct(v)}</Text>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
    </>
  );
}

// ── Mercado e taxas ─────────────────────────────────────────────────────────

function Mercado({ banco, indices, cotOnline, abrir }: { banco: ReturnType<typeof useBanco>; indices: IndiceEconomico[]; cotOnline: boolean; abrir: (a: Aberto) => void }) {
  const c = useTema().cores;
  const [aba, setAba] = useState<"alta" | "fav">("alta");
  const [ordem, setOrdem] = useState<OrdemMercado>("volume");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<AtivoMercado[] | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const pedido = useRef(0);

  useEffect(() => { lerFavoritosMercado(banco).then(setFavs).catch(() => {}); }, [banco]);

  // Só a lista recarrega ao trocar filtro ou digitar; o resto da tela fica parado.
  useEffect(() => {
    if (!cotOnline) { setLista([]); return; }
    const n = ++pedido.current;
    const q = busca.trim();
    const t = setTimeout(async () => {
      setErro("");
      try {
        let r: AtivoMercado[];
        if (q.length >= 2) r = await buscarAtivosMercado(q);
        else if (aba === "alta") r = await listarEmAlta(ordem);
        else r = (await Promise.all(favs.map((f) => cotacaoDoDia(f).catch(() => null)))).filter((x): x is AtivoMercado => !!x);
        if (n === pedido.current) setLista(r);
      } catch (e) {
        if (n === pedido.current) { setLista([]); setErro(e instanceof Error ? e.message : "Não deu para buscar agora."); }
      }
    }, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [aba, ordem, busca, favs, cotOnline]);

  function favoritar(cod: string) {
    setFavs((f) => {
      const novo = f.includes(cod) ? f.filter((x) => x !== cod) : [...f, cod];
      salvarFavoritosMercado(banco, novo).catch(() => {});
      return novo;
    });
  }

  const taxas = indices.map((i) => ({ i, chave: i.nome.toLowerCase().startsWith("selic") ? "selic" : i.nome.toLowerCase().startsWith("cdi") ? "cdi" : "ipca" }));
  const buscando = busca.trim().length >= 2;

  return (
    <>
      <View style={s.taxas}>
        {taxas.length === 0
          ? <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>Taxas indisponíveis agora (sem internet?).</Text>
          : taxas.map(({ i, chave }) => (
            <View key={chave} style={[s.tx, { backgroundColor: c.superficie, borderColor: c.borda }]}>
              <Text style={{ ...tipo.corpo(11, "semibold"), color: c.textoSuave }}>{chave.toUpperCase()}</Text>
              <Text style={{ ...tipo.valor(18), color: c.texto }} numberOfLines={1} adjustsFontSizeToFit>{i.valor.toFixed(2).replace(".", ",")}%</Text>
              <Text style={{ ...tipo.corpo(10), color: c.textoSuave, lineHeight: 13 }} numberOfLines={1}>{i.unidade.includes("a.m.") ? "no mês" : "ao ano"}</Text>
              <Pressable onPress={() => abrir({ tipo: "taxa", indice: i, chave })} style={[s.q, { borderColor: c.borda }]} hitSlop={8}
                accessibilityRole="button" accessibilityLabel={`O que é ${chave.toUpperCase()}?`}>
                <Icone nome="interrogation" tamanho={11} cor={c.textoSuave} />
              </Pressable>
            </View>
          ))}
      </View>

      <View style={[s.busca, { backgroundColor: c.superficie, borderColor: c.borda }]}>
        <Icone nome="search" tamanho={16} cor={c.textoSuave} />
        <TextInput value={busca} onChangeText={setBusca} editable={cotOnline} placeholderTextColor={c.textoSuave}
          placeholder={cotOnline ? "Buscar pelo nome ou código (ex.: Vale)" : "Cotações online desligadas em Mais"}
          style={{ flex: 1, color: c.texto, ...tipo.corpo(14), paddingVertical: 0 }} accessibilityLabel="Buscar ação, FII ou ETF" autoCorrect={false} />
      </View>

      {!buscando && cotOnline && (
        <>
          <View style={[s.abas, { borderBottomColor: c.borda }]}>
            {([["alta", "Em alta"], ["fav", `Favoritos · ${favs.length}`]] as const).map(([k, r]) => (
              <Pressable key={k} onPress={() => setAba(k)} style={[s.aba, aba === k && { borderBottomColor: c.primario }]}
                accessibilityRole="tab" accessibilityState={{ selected: aba === k }}>
                <Text style={{ ...tipo.corpo(14, "semibold"), color: aba === k ? c.texto : c.textoSuave }}>{r}</Text>
              </Pressable>
            ))}
          </View>
          {aba === "alta"
            ? <View style={s.ordens}>
                {ORDENS.map(([k, r]) => {
                  const on = ordem === k;
                  return (
                    <Pressable key={k} onPress={() => setOrdem(k)} style={[s.ordem, k === "volume" && { flex: 1.5 }, { borderColor: on ? c.texto : c.borda, backgroundColor: on ? c.texto : c.superficie }]}
                      accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={{ ...tipo.corpo(12, "semibold"), color: on ? c.fundo : c.textoSuave }} numberOfLines={1}>{r}</Text>
                    </Pressable>
                  );
                })}
              </View>
            : <Text style={[s.notaOrdem, { color: c.textoSuave }]}>Toque na ☆ para tirar dos favoritos</Text>}
        </>
      )}
      {buscando && <Text style={{ ...tipo.display(16), color: c.texto }}>Resultados</Text>}

      {lista === null ? <ActivityIndicator color={c.primario} style={{ marginVertical: 20 }} />
        : erro ? <Text style={{ ...tipo.corpo(13), color: c.erro }}>{erro}</Text>
        : lista.length === 0
          ? <Text style={{ ...tipo.corpo(13), color: c.textoSuave }}>
              {!cotOnline ? "Ligue \"Buscar cotações online\" em Mais para ver o mercado." : buscando ? `Nada encontrado para "${busca.trim()}".` : aba === "fav" ? "Nenhum favorito ainda. Busque um nome e toque na ☆." : "Nada para mostrar agora."}
            </Text>
          : lista.map((a, i) => (
            <Animated.View key={`${aba}-${ordem}-${a.codigo}`} entering={FadeInDown.delay(Math.min(i, 5) * 35).duration(300)}>
              <LinhaMercado a={a} fav={favs.includes(a.codigo)} favoritar={() => favoritar(a.codigo)} abrir={() => abrir({ tipo: "mercado", ativo: a })} />
            </Animated.View>
          ))}
      {aba === "alta" && !buscando && cotOnline && (
        <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>Lista igual para todo mundo, pelo movimento de hoje na B3. Não é indicação de compra.</Text>
      )}
    </>
  );
}

function LinhaMercado({ a, fav, favoritar, abrir }: { a: AtivoMercado; fav: boolean; favoritar: () => void; abrir: () => void }) {
  const c = useTema().cores;
  const cor = corMercado(a.tipo), v = a.variacaoDia ?? 0;
  return (
    <View style={[s.linha, { backgroundColor: c.superficie, borderColor: c.borda, paddingRight: 4 }]}>
      <Pressable onPress={abrir} style={s.abre} accessibilityRole="button" accessibilityLabel={`Ver ${a.codigo}, ${a.nome}`}>
        <View style={[s.tile, { backgroundColor: `${cor}26` }]}><Text style={{ ...tipo.valor(10.5), color: cor }}>{sigla(a.codigo)}</Text></View>
        <View style={s.info}>
          <Text style={{ ...tipo.corpo(14, "semibold"), color: c.texto }} numberOfLines={1}>{a.codigo}</Text>
          <Text style={{ ...tipo.corpo(11), color: c.textoSuave, lineHeight: 14 }} numberOfLines={2}>{a.nome}</Text>
        </View>
        <View style={s.val}>
          <Text style={{ ...tipo.valor(14), color: c.texto }} numberOfLines={1}>{a.preco != null ? reais(a.preco) : "—"}</Text>
          {a.variacaoDia != null && <Text style={{ ...tipo.corpo(11, "semibold"), color: v >= 0 ? c.sucesso : c.erro }}>{pct(v)}</Text>}
        </View>
      </Pressable>
      <Pressable onPress={favoritar} style={s.estrela} hitSlop={6} accessibilityRole="button" accessibilityState={{ selected: fav }}
        accessibilityLabel={fav ? `Tirar ${a.codigo} dos favoritos` : `Favoritar ${a.codigo}`}>
        <Icone nome="star" tamanho={17} cor={fav ? corFavorito : c.borda} />
      </Pressable>
    </View>
  );
}

// ── Folha de detalhe (ativo, mercado, perfil, taxa) ─────────────────────────

function Detalhe({ aberto, fechar, oculto, chave, cotOnline, perfil, ativos, largura }: {
  aberto: Aberto; fechar: () => void; oculto: boolean; chave: string | null; cotOnline: boolean; perfil: PerfilInvestidor | null;
  ativos: Ativo[]; largura: number; banco: ReturnType<typeof useBanco>;
}) {
  const c = useTema().cores;
  const [periodo, setPeriodo] = useState<PeriodoHistorico>("1mo");
  const [hist, setHist] = useState<PontoPreco[] | null>(null);
  const [msgHist, setMsgHist] = useState("");
  const codigo = aberto?.tipo === "mercado" ? aberto.ativo.codigo : aberto?.tipo === "ativo" && CODIGO_B3.test(aberto.ativo.ticker) ? aberto.ativo.ticker : null;

  useEffect(() => { setPeriodo("1mo"); }, [aberto]);
  useEffect(() => {
    setHist(null); setMsgHist("");
    if (!codigo || !cotOnline) return;
    if (!chave && !ATIVOS_SEM_CHAVE.includes(codigo)) {
      setMsgHist("Para ver o histórico deste ativo, coloque sua chave grátis da brapi em Mais.");
      return;
    }
    let vivo = true;
    buscarHistorico(codigo, periodo, chave)
      .then((p) => { if (vivo) { setHist(p); if (p.length < 2) setMsgHist("Sem histórico para este período."); } })
      .catch((e) => { if (vivo) setMsgHist(e instanceof Error ? e.message : "Não deu para buscar o histórico."); });
    return () => { vivo = false; };
  }, [codigo, periodo, chave, cotOnline]);

  const grafico = (cor: string) => codigo && cotOnline ? (
    <>
      <View style={{ marginTop: 16 }}>
        {hist && hist.length >= 2 ? <GraficoPreco pontos={hist} largura={largura} cor={cor} oculto={oculto} />
          : msgHist ? <Text style={{ ...tipo.corpo(13), color: c.textoSuave, paddingVertical: 24 }}>{msgHist}</Text>
          : <ActivityIndicator color={cor} style={{ height: 150 }} />}
      </View>
      {!msgHist && <Text style={{ ...tipo.corpo(12), color: c.textoSuave, textAlign: "center", marginTop: 4 }}>Arraste no gráfico para ver o preço de cada dia.</Text>}
      <View style={s.periodos}>
        {PERIODOS.map(([k, r]) => (
          <Pressable key={k} onPress={() => setPeriodo(k)} style={[s.per, periodo === k && { backgroundColor: c.primarioSuave }]}
            accessibilityRole="button" accessibilityState={{ selected: periodo === k }}>
            <Text style={{ ...tipo.corpo(12, "semibold"), color: periodo === k ? c.texto : c.textoSuave }}>{r}</Text>
          </Pressable>
        ))}
      </View>
    </>
  ) : null;

  const stat = (r: string, v: string) => (
    <View style={s.stat} key={r}>
      <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>{r}</Text>
      <Text style={{ ...tipo.valor(15), color: c.texto }}>{v}</Text>
    </View>
  );
  const din = (cent: number) => (oculto ? "R$ •••" : formatarDinheiro(cent));

  let cab: React.ReactNode = null, corpo: React.ReactNode = null;
  if (aberto?.tipo === "ativo") {
    const a = aberto.ativo, cor = coresClasseAtivo[a.tipo], v = aplicado(a) ? ((valorHoje(a) - aplicado(a)) / aplicado(a)) * 100 : 0;
    cab = <CabDetalhe cor={cor} sigla={sigla(a.ticker)} titulo={a.ticker} sub={`${a.nome} · ${CLASSES[a.tipo][0]}`}
      extra={<Text style={{ ...tipo.corpo(13, "semibold"), color: v >= 0 ? c.sucesso : c.erro }}>{v >= 0 ? "↑" : "↓"} {pct(v).slice(1)} <Text style={{ ...tipo.corpo(12), color: c.textoSuave }}>desde a aplicação</Text></Text>} />;
    corpo = (
      <>
        {grafico(cor)}
        <View style={[s.stats, { borderColor: c.borda }]}>
          {[stat("Quantidade", a.quantidade.toLocaleString("pt-BR")), stat("Preço médio", din(a.precoMedioCentavos)),
            stat("Aplicado", din(aplicado(a))), stat("Valor hoje", din(valorHoje(a))),
            stat("Banco", a.bancoNome ?? "—"), stat("Desde", a.dataAplicacao ? new Date(a.dataAplicacao + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—")]}
        </View>
        <Sobre tipo={a.tipo} />
        <Text style={[s.rodape, { color: c.textoSuave }]}>Dados do Meu Pluggy. Informação sobre seus dados, não é recomendação de investimento.</Text>
      </>
    );
  } else if (aberto?.tipo === "mercado") {
    const a = aberto.ativo, cor = corMercado(a.tipo), v = a.variacaoDia ?? 0;
    const tenho = ativos.find((x) => x.ticker === a.codigo);
    const vs = hist?.map((p) => p.preco) ?? [];
    cab = <CabDetalhe cor={cor} sigla={sigla(a.codigo)} titulo={a.codigo} sub={a.nome}
      extra={a.preco != null ? <Text style={{ ...tipo.valor(24), color: c.texto }}>{reais(a.preco)} <Text style={{ ...tipo.corpo(13, "semibold"), color: v >= 0 ? c.sucesso : c.erro }}>{v >= 0 ? "↑" : "↓"} {pct(v).slice(1)} hoje</Text></Text> : null} />;
    corpo = (
      <>
        {grafico(cor)}
        <View style={[s.stats, { borderColor: c.borda }]}>
          {[stat("Máxima do período", vs.length ? reais(Math.max(...vs)) : "—"), stat("Mínima do período", vs.length ? reais(Math.min(...vs)) : "—"),
            stat("Negociado hoje", a.volume != null ? compacto(a.volume) : "—"), stat("Valor da empresa", a.valorMercado != null ? `R$ ${compacto(a.valorMercado)}` : "—"),
            stat("Setor", a.setor ?? "—"), stat("Na sua carteira", tenho ? tenho.quantidade.toLocaleString("pt-BR") : "Não")]}
        </View>
        <Sobre tipo={a.tipo === "outro" ? "outro" : a.tipo} />
        <Text style={[s.rodape, { color: c.textoSuave }]}>Preço com atraso (brapi.dev). Só informação: não é recomendação de investimento.</Text>
      </>
    );
  } else if (aberto?.tipo === "perfil") {
    cab = <Text style={{ ...tipo.display(18), color: c.texto, paddingHorizontal: 20 }} accessibilityRole="header">Seu perfil de investidor</Text>;
    corpo = (
      <>
        <Text style={{ ...tipo.corpo(13), color: c.textoSuave, marginTop: 8 }}>Vem das respostas do início do app. Ele mostra como você lida com o risco. Não diz o que comprar.</Text>
        {PERFIS.map(([k, r, t]) => (
          <View key={k} style={[s.perfilItem, { borderColor: k === perfil ? c.primario : c.borda, backgroundColor: k === perfil ? c.primarioSuave : "transparent" }]}>
            <Text style={{ ...tipo.display(14), color: c.texto }}>{r}{k === perfil ? " · você" : ""}</Text>
            <Text style={{ ...tipo.corpo(13), color: c.textoSuave }}>{t}</Text>
          </View>
        ))}
      </>
    );
  } else if (aberto?.tipo === "taxa") {
    cab = <Text style={{ ...tipo.display(18), color: c.texto, paddingHorizontal: 20 }} accessibilityRole="header">{aberto.chave.toUpperCase()}: {aberto.indice.valor.toFixed(2).replace(".", ",")}% <Text style={{ ...tipo.corpo(13), color: c.textoSuave }}>{aberto.indice.unidade}</Text></Text>;
    corpo = <Text style={{ ...tipo.corpo(14), color: c.texto, marginTop: 10 }}>{AJUDA_TAXA[aberto.chave]}</Text>;
  }

  return <Folha aberta={!!aberto} aoFechar={fechar} cabecalho={cab}>{corpo}</Folha>;
}

function CabDetalhe({ cor, sigla: sg, titulo, sub, extra }: { cor: string; sigla: string; titulo: string; sub: string; extra?: React.ReactNode }) {
  const c = useTema().cores;
  return (
    <View style={{ paddingHorizontal: 20, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[s.tile, { backgroundColor: `${cor}26` }]}><Text style={{ ...tipo.valor(10.5), color: cor }}>{sg}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...tipo.display(18), color: c.texto }} numberOfLines={1} accessibilityRole="header">{titulo}</Text>
          <Text style={{ ...tipo.corpo(12), color: c.textoSuave }} numberOfLines={1}>{sub}</Text>
        </View>
      </View>
      {extra}
    </View>
  );
}

function Sobre({ tipo: t }: { tipo: TipoAtivo }) {
  const c = useTema().cores;
  return (
    <Text style={{ ...tipo.corpo(14), color: c.texto, marginTop: 14 }}>
      <Text style={{ ...tipo.corpo(14, "semibold"), color: c.texto }}>O que é {CLASSES[t][0].toLowerCase()}?{"\n"}</Text>{CLASSES[t][1]}
    </Text>
  );
}

const s = StyleSheet.create({
  col: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 16 },
  cab: { flexDirection: "row", alignItems: "center", gap: 8 },
  bt: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  seg: { flexDirection: "row", padding: 4, borderRadius: 999, borderWidth: 1 },
  segBt: { flex: 1, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 22, borderWidth: 1, padding: 18 },
  vazio: { alignItems: "center", gap: 8, paddingVertical: 28 },
  rot: { ...tipo.corpo(11, "semibold"), letterSpacing: 0.5, textTransform: "uppercase" },
  linhaVar: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  perfil: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: 14, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  barra: { flexDirection: "row", gap: 3, height: 12, marginVertical: 14 },
  legenda: { flexDirection: "row", flexWrap: "wrap", rowGap: 8, columnGap: 14 },
  legItem: { width: "46%", flexDirection: "row", alignItems: "center", gap: 8 },
  legCor: { width: 10, height: 10, borderRadius: 3 },
  sec: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  linha: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 18, borderWidth: 1 },
  abre: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  tile: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileGrande: { width: 64, height: 64, borderRadius: 20 },
  info: { flex: 1, minWidth: 0, gap: 3 },
  sub: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  badge: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6 },
  val: { alignItems: "flex-end", gap: 3, flexShrink: 0 },
  estrela: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  taxas: { flexDirection: "row", gap: 8 },
  tx: { flex: 1, minWidth: 0, borderRadius: 18, borderWidth: 1, paddingTop: 12, paddingBottom: 10, paddingHorizontal: 10, gap: 2 },
  q: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  busca: { flexDirection: "row", alignItems: "center", gap: 10, height: 46, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  abas: { flexDirection: "row", borderBottomWidth: 1 },
  aba: { flex: 1, height: 42, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  ordens: { flexDirection: "row", gap: 8, minHeight: 36, alignItems: "center" },
  ordem: { flex: 1, height: 32, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  notaOrdem: { ...tipo.corpo(12), minHeight: 36, textAlignVertical: "center", paddingTop: 8 },
  avisoLegal: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 14 },
  toast: { position: "absolute", left: 20, right: 20, bottom: 110, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, elevation: 6, shadowColor: auxiliares.preto, shadowOpacity: 0.2, shadowRadius: 10 },
  periodos: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  per: { minWidth: 48, height: 30, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  stats: { flexDirection: "row", flexWrap: "wrap", rowGap: 14, marginTop: 14, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1 },
  stat: { width: "50%", paddingRight: 8, gap: 2 },
  perfilItem: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 10, gap: 2 },
  rodape: { ...tipo.corpo(12), marginTop: 14 },
});

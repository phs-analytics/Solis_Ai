import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming, Easing, FadeInDown } from "react-native-reanimated";
import { useBanco } from "../../contexto/BancoContext";
import { buscarMeta, depositar, retirar, listarMovimentos } from "@solis/dados";
import type { Meta, MovimentoMeta } from "@solis/dados";
import { auxiliares, corBanco, tipo, useTema } from "../../theme";
import { formatarDinheiro, parseDinheiro } from "../../utils/dinheiro";
import { Texto as Text, Entrada as TextInput } from "../Texto";
import { Icone } from "../Icone";
import { iconeMeta } from "./iconesMeta";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R_ANEL = 56, CIRCUNF = 2 * Math.PI * R_ANEL;


function AnelProgresso({ pct, cor, ativo }: { pct: number; cor: string; ativo: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = ativo ? withDelay(200, withTiming(pct, { duration: 1000, easing: Easing.out(Easing.cubic) })) : 0;
  }, [ativo, pct]);
  const animProps = useAnimatedProps(() => ({
    strokeDasharray: [CIRCUNF * Math.min(1, p.value), CIRCUNF],
  }));
  return (
    <Svg width={176} height={176} viewBox="0 0 130 130">
      <Circle r={R_ANEL} cx={65} cy={65} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={14} />
      <G rotation={-90} origin="65,65">
        <AnimatedCircle animatedProps={animProps} r={R_ANEL} cx={65} cy={65} fill="none" stroke={cor} strokeWidth={14} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function LinhaMovimento({ m, oculto }: { m: MovimentoMeta; oculto: boolean }) {
  const c = useTema().cores;
  const e = m.valorCentavos > 0;
  const data = new Date(m.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={[s.linhaMov, { borderColor: c.borda }]}>
      <View style={[s.dotMov, { backgroundColor: `${e ? c.sucesso : c.erro}22` }]}>
        <Text style={{ ...tipo.corpo(16, "semibold"), color: e ? c.sucesso : c.erro }}>{e ? "↑" : "↓"}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
        <Text style={{ ...tipo.corpo(13, "medium"), color: c.texto }} numberOfLines={1}>{m.descricao ?? (e ? "Depósito" : "Retirada")}</Text>
        <Text style={{ ...tipo.corpo(11), color: c.textoSuave }}>{data}</Text>
      </View>
      <Text style={{ ...tipo.valor(14, false), color: e ? c.sucesso : c.erro }}>
        {oculto ? "R$ •••" : `${e ? "+" : "−"}${formatarDinheiro(Math.abs(m.valorCentavos))}`}
      </Text>
    </Animated.View>
  );
}

export function DetalheMeta({
  metaId, oculto, visivel, aoFechar,
}: {
  metaId: string; oculto: boolean; visivel: boolean; aoFechar: () => void;
}) {
  const c = useTema().cores;
  const banco = useBanco();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [movs, setMovs] = useState<MovimentoMeta[]>([]);
  const [valorDeposito, setValorDeposito] = useState("");
  const [modoRetirada, setModoRetirada] = useState(false);
  const [inputVisivel, setInputVisivel] = useState(false);
  const [filtro, setFiltro] = useState<"dep" | "ret" | null>(null);
  const movsFiltrados = filtro ? movs.filter((m) => (m.valorCentavos > 0) === (filtro === "dep")) : movs;

  const carregar = useCallback(async () => {
    if (!metaId) return;
    const [m, mv] = await Promise.all([buscarMeta(banco, metaId), listarMovimentos(banco, metaId)]);
    setMeta(m); setMovs(mv);
  }, [banco, metaId]);

  useEffect(() => { if (visivel) carregar(); }, [visivel, carregar]);

  const cor = meta ? (meta.cor ?? corBanco(meta.bancNome ?? meta.nome)) : c.primario;
  const pct = meta && meta.alvoCentavos > 0 ? Math.min(1, meta.atualCentavos / meta.alvoCentavos) : 0;
  const falta = meta ? Math.max(0, meta.alvoCentavos - meta.atualCentavos) : 0;

  async function confirmarMovimento() {
    if (!meta) return;
    const centavos = parseDinheiro(valorDeposito);
    if (!centavos || centavos <= 0) { Alert.alert("Valor inválido"); return; }
    if (modoRetirada && centavos > meta.atualCentavos) { Alert.alert("Não dá para retirar mais do que está guardado."); return; }
    if (modoRetirada) await retirar(banco, meta.id, centavos);
    else await depositar(banco, meta.id, centavos);
    setValorDeposito(""); setInputVisivel(false);
    carregar();
  }

  if (!meta) return null;

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#0D1520" }}>
        {/* Header imersivo */}
        <View style={[s.header, { paddingTop: 56 }]}>
          {/* brilho radial simulado com círculo grande transparente */}
          <View style={[s.brilho, { backgroundColor: `${cor}30` }]} />
          <View style={s.headerNav}>
            <Pressable onPress={aoFechar} style={s.btnVoltar} accessibilityLabel="Voltar">
              <Text style={{ color: auxiliares.branco, fontSize: 20 }}>‹</Text>
            </Pressable>
            <View style={s.titulo}>
              <View style={s.tituloIc}><Icone nome={iconeMeta(meta.icone)} tamanho={14} cor={cor} /></View>
              <Text style={{ ...tipo.corpo(16, "semibold"), color: auxiliares.branco, flexShrink: 1 }} numberOfLines={1}>{meta.nome}</Text>
            </View>
            <View style={s.btnVoltar} />
          </View>

          {/* Pills de status */}
          <View style={s.pills}>
            {meta.bancNome && (
              <View style={[s.pill, { backgroundColor: `${cor}33` }]}>
                <View style={[s.dot, { backgroundColor: cor }]} />
                <Text style={{ ...tipo.corpo(11, "medium"), color: auxiliares.branco }}>{meta.bancNome}</Text>
              </View>
            )}
            {meta.prazo && (
              <View style={[s.pill, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                <Text style={{ ...tipo.corpo(11, "medium"), color: auxiliares.branco }}>Até {meta.prazo}</Text>
              </View>
            )}
          </View>

          {/* Anel de progresso */}
          <View style={s.anelWrap}>
            <AnelProgresso pct={pct} cor={cor} ativo={visivel} />
            <View style={[StyleSheet.absoluteFill, s.anelCentro]}>
              <Text style={{ ...tipo.valor(20), color: auxiliares.branco, maxWidth: 118 }} numberOfLines={1} adjustsFontSizeToFit>
                {oculto ? "R$ •••" : formatarDinheiro(meta.atualCentavos)}
              </Text>
              <Text style={{ ...tipo.corpo(11), color: "rgba(255,255,255,0.65)", maxWidth: 118 }} numberOfLines={1} adjustsFontSizeToFit>
                de {oculto ? "R$ •••" : formatarDinheiro(meta.alvoCentavos)}
              </Text>
              <Text style={{ ...tipo.corpo(12, "semibold"), color: cor, marginTop: 2 }}>{Math.round(pct * 100)}%</Text>
            </View>
          </View>

          {/* Mini cards */}
          <View style={s.miniCards}>
            <View style={[s.miniCard, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <Text style={{ ...tipo.corpo(11), color: "rgba(255,255,255,0.65)" }}>Falta guardar</Text>
              <Text style={{ ...tipo.valor(16), color: auxiliares.branco }}>{oculto ? "R$ •••" : formatarDinheiro(falta)}</Text>
            </View>
            <View style={[s.miniCard, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <Text style={{ ...tipo.corpo(11), color: "rgba(255,255,255,0.65)" }}>Guardado</Text>
              <Text style={{ ...tipo.valor(16), color: auxiliares.branco }}>{oculto ? "R$ •••" : formatarDinheiro(meta.atualCentavos)}</Text>
            </View>
          </View>

          <View style={s.acoes}>
            <Pressable onPress={() => { setModoRetirada(false); setInputVisivel(true); }}
              style={[s.btnAcao, { backgroundColor: cor }]} accessibilityRole="button" accessibilityLabel="Guardar dinheiro">
              <Text style={{ ...tipo.corpo(13, "semibold"), color: auxiliares.branco }}>+ Guardar</Text>
            </Pressable>
            <Pressable onPress={() => { setModoRetirada(true); setInputVisivel(true); }}
              style={[s.btnAcao, { backgroundColor: "rgba(255,255,255,0.12)" }]} accessibilityRole="button" accessibilityLabel="Retirar dinheiro">
              <Text style={{ ...tipo.corpo(13, "semibold"), color: auxiliares.branco }}>− Retirar</Text>
            </Pressable>
          </View>
        </View>

        {/* Painel inferior */}
        <View style={[s.painel, { backgroundColor: c.fundo }]}>
          <View style={s.painelTopo}>
            <Text style={{ ...tipo.corpo(15, "semibold"), color: c.texto }}>Lançamentos</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([["dep", "Depósitos"], ["ret", "Retiradas"]] as const).map(([k, rotulo]) => {
                const on = filtro === k;
                return (
                  <Pressable key={k} onPress={() => setFiltro(on ? null : k)}
                    style={[s.chip, { borderColor: on ? cor : c.borda, backgroundColor: on ? cor : "transparent" }]}
                    accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Mostrar só ${rotulo.toLowerCase()}`}>
                    <Text style={{ ...tipo.corpo(12, "semibold"), color: on ? auxiliares.branco : c.texto }}>{rotulo}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {inputVisivel && (
            <View style={[s.inputArea, { backgroundColor: c.superficie, borderColor: c.borda }]}>
              <TextInput
                style={{ ...tipo.valor(18), color: c.texto, flex: 1, minWidth: 0 }}
                placeholder="R$ 0,00" placeholderTextColor={c.textoSuave}
                keyboardType="decimal-pad" autoFocus
                value={valorDeposito} onChangeText={setValorDeposito}
              />
              <Pressable onPress={confirmarMovimento} style={[s.btnConfirmar, { backgroundColor: cor }]}>
                <Text style={{ ...tipo.corpo(13, "semibold"), color: auxiliares.branco }}>OK</Text>
              </Pressable>
              <Pressable onPress={() => setInputVisivel(false)} style={s.btnCancelar}>
                <Text style={{ ...tipo.corpo(13), color: c.textoSuave }}>×</Text>
              </Pressable>
            </View>
          )}

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            {movsFiltrados.length === 0 ? (
              <Text style={{ ...tipo.corpo(13), color: c.textoSuave, textAlign: "center", paddingTop: 24 }}>
                {filtro === "dep" ? "Nenhum depósito" : filtro === "ret" ? "Nenhuma retirada" : "Nenhum lançamento"} ainda
              </Text>
            ) : (
              movsFiltrados.map((m) => <LinhaMovimento key={m.id} m={m} oculto={oculto} />)
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 0, overflow: "hidden" },
  brilho: { position: "absolute", width: 300, height: 300, borderRadius: 150, top: -60, alignSelf: "center" },
  headerNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  btnVoltar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  titulo: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 8 },
  tituloIc: { width: 28, height: 28, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  pills: { flexDirection: "row", gap: 8, marginBottom: 20 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  anelWrap: { alignItems: "center", marginBottom: 16, position: "relative" },
  anelCentro: { alignItems: "center", justifyContent: "center" },
  miniCards: { flexDirection: "row", gap: 10, marginBottom: 12 },
  miniCard: { flex: 1, borderRadius: 12, padding: 12, gap: 2 },
  painel: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20 },
  painelTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  acoes: { flexDirection: "row", gap: 10, marginBottom: 20 },
  btnAcao: { flex: 1, borderRadius: 22, paddingVertical: 11, alignItems: "center" },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  inputArea: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  btnConfirmar: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  btnCancelar: { paddingHorizontal: 8 },
  linhaMov: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dotMov: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});

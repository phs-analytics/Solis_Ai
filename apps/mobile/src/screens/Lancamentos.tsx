import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View, FlatList, Pressable } from "react-native";
import { Texto as Text, Entrada as TextInput } from "../components/Texto";
import { SafeScreen } from "../components/SafeScreen";
import { useTema } from "../theme";
import { useBanco } from "../contexto/BancoContext";
import { listarLancamentos } from "@solis/dados";
import type { Lancamento, FiltroLancamentos } from "@solis/dados";
import { formatarDinheiro } from "../utils/dinheiro";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParams } from "../navigation";

type Periodo = "30d" | "7d" | "60d";
const PERIODOS: { label: string; valor: Periodo }[] = [
  { label: "7 dias", valor: "7d" },
  { label: "30 dias", valor: "30d" },
  { label: "60 dias", valor: "60d" },
];

export function Lancamentos() {
  const tema = useTema();
  const c = tema.cores;
  const banco = useBanco();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();

  const [items, setItems] = useState<Lancamento[]>([]);
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [carregando, setCarregando] = useState(false);
  const busca$ = useRef<React.ComponentRef<typeof TextInput>>(null);
  // A lupa da Home abre esta aba já com o cursor na busca.
  const focarBusca = useRoute<RouteProp<RootStackParams, "Lancamentos">>().params?.focarBusca;
  useEffect(() => { if (focarBusca) setTimeout(() => busca$.current?.focus(), 250); }, [focarBusca]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const filtro: FiltroLancamentos = { periodo };
      if (busca.trim()) filtro.busca = busca.trim();
      setItems(await listarLancamentos(banco, filtro));
    } finally {
      setCarregando(false);
    }
  }, [banco, busca, periodo]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return (
    <SafeScreen>
      <View style={[s.cabecalho, { paddingHorizontal: tema.spacing.lg }]}>
        <Text style={[tema.font.legenda, { color: c.textoSuave }]}>Contas e importações</Text>
        <Pressable
          onPress={() => nav.navigate("NovoLancamento")}
          style={[s.botaoNovo, { backgroundColor: c.primario }]}
          accessibilityRole="button"
          accessibilityLabel="Novo lançamento"
        >
          <Text style={{ color: c.sobrePrimario, fontSize: 20, lineHeight: 24 }}>+</Text>
        </Pressable>
      </View>

      {/* Busca */}
      <View style={[s.buscaContainer, { marginHorizontal: tema.spacing.lg }]}>
        <TextInput
          ref={busca$}
          style={[s.busca, { backgroundColor: c.superficie, color: c.texto, borderColor: c.borda }]}
          placeholder="Buscar lançamentos…"
          placeholderTextColor={c.textoSuave}
          value={busca}
          onChangeText={setBusca}
          returnKeyType="search"
          accessibilityLabel="Buscar lançamentos"
        />
      </View>

      {/* Filtro de período */}
      <View style={[s.filtros, { paddingHorizontal: tema.spacing.lg }]}>
        {PERIODOS.map((p) => (
          <Pressable
            key={p.valor}
            style={[
              s.chip,
              { borderColor: c.borda, backgroundColor: periodo === p.valor ? c.primario : c.superficie },
            ]}
            onPress={() => setPeriodo(p.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: periodo === p.valor }}
            accessibilityLabel={`Filtrar por ${p.label}`}
          >
            <Text style={{ color: periodo === p.valor ? c.sobrePrimario : c.textoSuave, fontSize: 13, fontWeight: "600" }}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: tema.spacing.lg, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.vazio}>
            <Text style={[tema.font.corpo, { color: c.textoSuave, textAlign: "center" }]}>
              {carregando ? "Carregando…" : "Nenhum lançamento neste período"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[s.linha, { borderBottomColor: c.borda }]}
            accessibilityRole="button"
            accessibilityLabel={`${item.descricao || "Sem descrição"}, ${formatarDinheiro(item.valorCentavos)}, ${item.data}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={[tema.font.corpo, { color: c.texto }]} numberOfLines={1}>
                {item.descricao || "Sem descrição"}
              </Text>
              <Text style={[tema.font.legenda, { color: c.textoSuave }]}>{item.data}</Text>
            </View>
            <Text style={[tema.font.corpo, {
              color: item.tipo === "receita" ? c.sucesso : c.erro,
              fontWeight: "700",
            }]}>
              {item.tipo === "receita" ? "+" : ""}{formatarDinheiro(item.valorCentavos)}
            </Text>
          </Pressable>
        )}
      />
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  cabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, paddingBottom: 12 },
  botaoNovo: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  buscaContainer: { marginBottom: 10 },
  busca: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  filtros: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, borderWidth: 1 },
  linha: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  vazio: { paddingTop: 48, alignItems: "center" },
});

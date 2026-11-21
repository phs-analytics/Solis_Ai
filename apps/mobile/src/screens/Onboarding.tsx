import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Animated, KeyboardAvoidingView, Platform } from "react-native";
import { PERFIL_VAZIO, calcularIdade, classificarInvestidor } from "@solis/core";
import type { Perfil, PerfilInvestidor } from "@solis/core";
import { lerPerfil, salvarPerfil } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { SafeScreen } from "../components/SafeScreen";
import { Icone } from "../components/Icone";
import { useTema } from "../theme";
import { ConfigurarAcesso } from "./ConfigurarAcesso";

type Opcao = { v: string; t: string };
const op = (...itens: [string, string][]): Opcao[] => itens.map(([v, t]) => ({ v, t }));

const PRONOMES = op(["ela", "Ela/dela"], ["ele", "Ele/dele"], ["elu", "Elu/delu"], ["outro", "Outro"], ["nao_dizer", "Prefiro não dizer"]);
const GENEROS = op(["mulher", "Mulher"], ["homem", "Homem"], ["nao_binario", "Não binário"], ["outro", "Outro"], ["nao_dizer", "Prefiro não dizer"]);
const TRABALHO = op(
  ["clt", "CLT (carteira assinada)"], ["autonomo", "Autônomo(a)"], ["mei", "MEI / empresário(a)"], ["freela", "Freelancer / bicos"],
  ["app", "Apps (entrega, motorista)"], ["servidor", "Servidor(a) público(a)"], ["estudante", "Estudante"],
  ["desempregado", "Procurando trabalho"], ["aposentado", "Aposentado(a)"], ["lar", "Cuido da casa"],
);
const RENDA = op(
  ["ate_1sm", "Até 1 salário mínimo"], ["1_2sm", "De 1 a 2 salários"], ["2_3sm", "De 2 a 3 salários"],
  ["3_5sm", "De 3 a 5 salários"], ["5_10sm", "De 5 a 10 salários"], ["mais_10sm", "Mais de 10 salários"],
  ["variavel", "Varia muito todo mês"], ["nao_dizer", "Prefiro não dizer"],
);
const ATIVIDADES = op(
  ["trabalho", "Trabalho"], ["estudos", "Estudos"], ["filhos", "Cuidar de filhos"], ["casa", "Casa"],
  ["esporte", "Esporte"], ["academia", "Academia"], ["musica", "Música"], ["games", "Games"],
  ["leitura", "Leitura"], ["igreja", "Fé / igreja"], ["amigos", "Amigos"], ["series", "Séries"],
  ["cozinhar", "Cozinhar"], ["artes", "Artes"], ["viagens", "Passeios"], ["negocio", "Vender / renda extra"],
);
const RITMO = op(["corrida", "Muito corrida"], ["estressante", "Estressante"], ["flexivel", "Flexível"], ["tranquila", "Tranquila"], ["imprevisivel", "Cada dia é um"]);
const OBJ_VIDA = op(
  ["financas", "Organizar o dinheiro"], ["produtividade", "Produtividade"], ["saude", "Saúde"], ["foco", "Foco"],
  ["carreira", "Crescer no trabalho"], ["estudos", "Estudar"], ["familia", "Família"], ["casa_propria", "Casa própria"],
  ["negocio", "Abrir um negócio"], ["paz", "Mais tranquilidade"],
);
const CONTROLE = op(
  ["controlo_tudo", "Anoto e controlo tudo"], ["mais_ou_menos", "Controlo mais ou menos"],
  ["sem_controle", "Não tenho controle"], ["gasto_mais", "Gasto mais do que ganho"], ["dividas", "Estou com dívidas"],
);
const OBJ_FIN = op(
  ["sair_dividas", "Sair das dívidas"], ["reserva", "Criar uma reserva de emergência"], ["comprar_bem", "Comprar algo (casa, carro, moto)"],
  ["longo_prazo", "Investir a longo prazo"], ["aposentadoria", "Me preparar para a aposentadoria"],
);
const REACAO = op(
  ["vendo_tudo", "Tiro tudo na hora, não quero perder mais"], ["espero", "Espero com calma até melhorar"],
  ["compro_mais", "Aproveito para colocar mais dinheiro"],
);
const EXPERIENCIA = op(
  ["nenhuma", "Nunca investi"], ["poupanca", "Poupança"], ["renda_fixa", "CDB, Tesouro, LCI"],
  ["fundos", "Fundos"], ["acoes", "Ações / FIIs"], ["cripto", "Criptomoedas"],
);
const DISCIPLINA = op(["alta", "Alta: faço o que planejo"], ["media", "Média: às vezes escorrego"], ["baixa", "Baixa: começo e paro"]);
const DIFICULDADES = op(
  ["celular", "Celular / redes sociais"], ["cansaco", "Cansaço"], ["tempo", "⏰ Falta de tempo"], ["ansiedade", "Ansiedade"],
  ["impulso", "Compras por impulso"], ["barulho", "Barulho / interrupções"], ["procrastinar", "Deixar para depois"],
  ["dinheiro_curto", "Dinheiro curto no fim do mês"],
);
const HORARIOS = op(["manha", "Manhã"], ["tarde", "Tarde"], ["noite", "Noite"], ["madrugada", "Madrugada"]);

const NOME_PERFIL: Record<PerfilInvestidor, string> = { conservador: "Conservador", moderado: "Moderado", arrojado: "Arrojado" };

const ETAPAS = [
  { titulo: "Vamos nos conhecer", desc: "Conta um pouco sobre você. Tudo fica guardado só neste celular, protegido." },
  { titulo: "Trabalho e renda", desc: "Assim a gente adapta as contas e dicas à sua realidade. Sem julgamento." },
  { titulo: "Seu dia a dia", desc: "Escolha o que tem a ver com você. Pode marcar várias opções." },
  { titulo: "Você e o dinheiro", desc: "Não existe resposta certa. Isso ajuda a Solis AI a falar a sua língua." },
  { titulo: "Seus hábitos", desc: "Último bloco de perguntas! Assim os lembretes chegam na hora certa." },
  { titulo: "Proteja seus dados", desc: "Crie uma senha forte. Ela tranca tudo o que você contou e ninguém, nem a gente, consegue ver." },
];

/** DD/MM/AAAA digitado -> AAAA-MM-DD */
function paraISO(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

function mascaraData(t: string): string {
  const d = t.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/");
}

export function Onboarding({ aoConcluir }: { aoConcluir: (banco: Banco) => void }) {
  const tema = useTema();
  const c = tema.cores;
  const [passo, setPasso] = useState(0);
  const [p, setP] = useState<Perfil>(PERFIL_VAZIO);
  const [dataBR, setDataBR] = useState("");
  const [generoOutro, setGeneroOutro] = useState("");
  const [pronomeOutro, setPronomeOutro] = useState("");
  const [pronto, setPronto] = useState<{ banco: Banco; perfil: Perfil } | null>(null);
  const progresso = useRef(new Animated.Value(0)).current;
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const total = ETAPAS.length;
  useEffect(() => {
    Animated.timing(progresso, { toValue: pronto ? 1 : (passo + 1) / total, duration: 400, useNativeDriver: false }).start();
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [passo, pronto]);

  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) => setP((x) => ({ ...x, [k]: v }));
  const alternar = (k: "atividades" | "objetivosVida" | "dificuldades" | "horarios" | "experiencia", v: string) =>
    setP((x) => {
      const atual = x[k] as string[];
      let novo = atual.includes(v) ? atual.filter((i) => i !== v) : [...atual, v];
      if (k === "experiencia") novo = v === "nenhuma" ? (novo.includes("nenhuma") ? ["nenhuma"] : []) : novo.filter((i) => i !== "nenhuma");
      return { ...x, [k]: novo };
    });
  // "Prefiro não dizer" exclui os outros pronomes, e vice-versa.
  const alternarPronome = (v: string) =>
    setP((x) => {
      const tinha = x.pronomes.includes(v);
      const sem = x.pronomes.filter((i) => i !== v && (v === "nao_dizer" ? false : i !== "nao_dizer"));
      return { ...x, pronomes: tinha ? sem : [...sem, v] };
    });

  const idade = calcularIdade(paraISO(dataBR));
  const valido = [
    p.nomeCompleto.trim().length >= 3 && p.apelido.trim().length >= 1 && idade !== null && idade >= 13 && idade <= 120 &&
      (!p.pronomes.includes("outro") || !!pronomeOutro.trim()) && (p.genero !== "outro" || !!generoOutro.trim()),
    !!p.trabalho && !!p.faixaRenda,
    !!p.ritmo,
    !!p.controleFinancas && !!p.objetivoFinanceiro && !!p.reacaoQueda && p.experiencia.length > 0,
    !!p.disciplina,
    false,
  ][passo];

  function continuar() {
    if (!valido) return;
    if (passo === 0) set("nascimento", paraISO(dataBR));
    setPasso(passo + 1);
  }

  async function aoAbrir(banco: Banco, restaurado: boolean) {
    // Guarda como a pessoa escreveria, para a Solis AI usar direto ("ela/dela", "elu/delu", texto livre).
    const final: Perfil = {
      ...p,
      pronomes: p.pronomes.map((v) => (v === "outro" ? pronomeOutro.trim() : PRONOMES.find((o) => o.v === v)?.t ?? v)).filter(Boolean),
      genero: p.genero === "outro" ? generoOutro.trim() : GENEROS.find((o) => o.v === p.genero)?.t ?? p.genero,
      perfilInvestidor: classificarInvestidor(p),
      concluidoEm: new Date().toISOString(),
    };
    // Backup restaurado já traz o perfil do aparelho antigo.
    const existente = restaurado ? await lerPerfil(banco) : null;
    if (existente) {
      aoConcluir(banco);
      return;
    }
    await salvarPerfil(banco, final);
    setPronto({ banco, perfil: final });
  }

  const largura = progresso.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  if (pronto) {
    const perfil = pronto.perfil;
    return (
      <SafeScreen>
        <View style={[s.topoBar]}>
          <View style={[s.barraFundo, { backgroundColor: c.primario, flex: 1 }]}>
            <View style={[s.barra, { width: "100%", backgroundColor: c.primario }]} />
          </View>
        </View>
        <View style={{ alignItems: "center", paddingTop: 32, paddingHorizontal: 24 }}>
          <View style={[s.iconeEtapa, { backgroundColor: c.primarioSuave, width: 72, height: 72, borderRadius: 36 }]}>
            <Icone nome="party-horn" tamanho={32} cor={c.primario} />
          </View>
          <Text style={[s.titulo, { color: c.texto, textAlign: "center", marginTop: 16 }]} accessibilityRole="header">
            Tudo pronto,{"\n"}{perfil.apelido.trim()}!
          </Text>
        </View>
        <ScrollView contentContainerStyle={[s.fim, { paddingTop: 16 }]}>
          <Text style={[s.desc, { color: c.textoSuave, textAlign: "center" }]}>
            Seu perfil está configurado. A partir de agora, o Solis organiza tudo pensando em você.
          </Text>
          <View style={[s.cartaoDestaque, { backgroundColor: c.primarioSuave, borderColor: c.primario }]}>
            <Text style={{ color: c.textoSuave, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 }}>Perfil de investidor</Text>
            <Text style={{ color: c.primario, fontSize: 28, fontWeight: "800", marginTop: 4 }}>
              {NOME_PERFIL[perfil.perfilInvestidor ?? "conservador"]}
            </Text>
            <Text style={{ color: c.textoSuave, fontSize: 12, marginTop: 4 }}>
              Só uma informação sobre como você lida com risco. Não é recomendação de investimento.
            </Text>
          </View>
          <View style={[s.cartao, { backgroundColor: c.superficie, borderColor: c.borda }]}>
            <Text style={{ color: c.textoSuave, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 }}>Seu foco agora</Text>
            <Text style={{ color: c.texto, fontSize: 17, fontWeight: "700", marginTop: 4 }}>
              {OBJ_FIN.find((o) => o.v === perfil.objetivoFinanceiro)?.t}
            </Text>
          </View>
        </ScrollView>
        <View style={s.rodape}>
          <Pressable style={[s.botaoPrincipal, { backgroundColor: c.primario }]} onPress={() => aoConcluir(pronto.banco)}
            accessibilityRole="button">
            <Text style={[s.botaoTextoCheio, tema.dark && { color: "#0A1628" }]}>Ir para o início →</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  const etapa = ETAPAS[passo]!;

  return (
    <SafeScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.topoBar}>
          <Pressable onPress={() => setPasso(passo - 1)} disabled={passo === 0} hitSlop={12} style={s.voltar}
            accessibilityRole="button" accessibilityLabel="Voltar" accessibilityState={{ disabled: passo === 0 }}>
            {passo > 0 && <Icone nome="angle-small-left" tamanho={24} cor={c.primario} />}
          </Pressable>
          <View style={[s.barraFundo, { backgroundColor: c.borda, flex: 1 }]}
            accessibilityRole="progressbar" accessibilityLabel={`Etapa ${passo + 1} de ${total}`}
            accessibilityValue={{ min: 0, max: total, now: passo + 1 }}>
            <Animated.View style={[s.barra, { width: largura, backgroundColor: c.primario }]} />
          </View>
          <Text style={{ color: c.textoSuave, fontSize: 12, fontWeight: "600", minWidth: 28, textAlign: "right" }}>
            {passo + 1}/{total}
          </Text>
        </View>

        <ScrollView ref={scroll} contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
          <View style={s.cabecalhoConteudo}>
            <Text style={[s.titulo, { color: c.texto }]} accessibilityRole="header">{etapa.titulo}</Text>
            <Text style={[s.desc, { color: c.textoSuave }]}>{etapa.desc}</Text>
          </View>

          {passo === 0 && (
            <>
              <Campo rotulo="Nome completo" valor={p.nomeCompleto} aoMudar={(v) => set("nomeCompleto", v)} autoCapitalize="words" />
              <Campo rotulo="Como quer ser chamado(a)?" dica="Apelido ou nome social" valor={p.apelido}
                aoMudar={(v) => set("apelido", v)} autoCapitalize="words" />
              <Campo rotulo="Data de nascimento" dica="DD/MM/AAAA" valor={dataBR} aoMudar={(v) => setDataBR(mascaraData(v))}
                teclado="number-pad" />
              {dataBR.length === 10 && (idade === null || idade > 120) && <Aviso cor={c.erro}>Confira a data, parece que algo não bate.</Aviso>}
              {idade !== null && idade < 13 && <Aviso cor={c.erro}>O Solis é para quem tem 13 anos ou mais.</Aviso>}
              {idade !== null && idade >= 13 && idade < 18 && (
                <Aviso cor={c.aviso}>Como você tem menos de 18, combine com um responsável antes de usar.</Aviso>
              )}
              <Pergunta texto="Quais pronomes você usa?" ajuda="Pode marcar mais de um. A Solis AI vai falar com você assim." />
              <Chips opcoes={PRONOMES} sel={p.pronomes} aoTocar={alternarPronome} />
              {p.pronomes.includes("outro") && (
                <Campo rotulo="Escreva seus pronomes" dica="Ex.: ile/dile" valor={pronomeOutro} aoMudar={setPronomeOutro} autoCapitalize="none" />
              )}
              <Pergunta texto="Gênero" />
              <Chips opcoes={GENEROS} sel={[p.genero]} aoTocar={(v) => set("genero", p.genero === v ? "" : v)} />
              {p.genero === "outro" && <Campo rotulo="Como você se identifica?" dica="Escreva do seu jeito" valor={generoOutro} aoMudar={setGeneroOutro} />}
            </>
          )}

          {passo === 1 && (
            <>
              <Pergunta texto="Como você trabalha hoje?" />
              <Chips opcoes={TRABALHO} sel={[p.trabalho]} aoTocar={(v) => set("trabalho", v)} lista />
              <Pergunta texto="Quanto entra por mês, em média?" ajuda="Somando tudo o que você recebe." />
              <Chips opcoes={RENDA} sel={[p.faixaRenda]} aoTocar={(v) => set("faixaRenda", v)} lista />
            </>
          )}

          {passo === 2 && (
            <>
              <Pergunta texto="O que ocupa o seu dia e o seu tempo livre?" />
              <Chips opcoes={ATIVIDADES} sel={p.atividades} aoTocar={(v) => alternar("atividades", v)} />
              <Pergunta texto="Como é a sua rotina?" />
              <Chips opcoes={RITMO} sel={[p.ritmo]} aoTocar={(v) => set("ritmo", v)} />
              <Pergunta texto="O que você mais quer agora?" />
              <Chips opcoes={OBJ_VIDA} sel={p.objetivosVida} aoTocar={(v) => alternar("objetivosVida", v)} />
            </>
          )}

          {passo === 3 && (
            <>
              <Pergunta texto="Como você lida com seu dinheiro hoje?" />
              <Chips opcoes={CONTROLE} sel={[p.controleFinancas]} aoTocar={(v) => set("controleFinancas", v)} lista />
              <Pergunta texto="Qual é o seu principal objetivo com dinheiro?" />
              <Chips opcoes={OBJ_FIN} sel={[p.objetivoFinanceiro]} aoTocar={(v) => set("objetivoFinanceiro", v as Perfil["objetivoFinanceiro"])} lista />
              <Pergunta texto="Seu dinheiro guardado caiu 10% num mês. O que você faz?" />
              <Chips opcoes={REACAO} sel={[p.reacaoQueda]} aoTocar={(v) => set("reacaoQueda", v as Perfil["reacaoQueda"])} lista />
              <Pergunta texto="Onde você já guardou ou investiu dinheiro?" ajuda="Pode marcar mais de uma." />
              <Chips opcoes={EXPERIENCIA} sel={p.experiencia} aoTocar={(v) => alternar("experiencia", v)} />
            </>
          )}

          {passo === 4 && (
            <>
              <Pergunta texto="Como está sua disciplina no dia a dia?" />
              <Chips opcoes={DISCIPLINA} sel={[p.disciplina]} aoTocar={(v) => set("disciplina", v)} lista />
              <Pergunta texto="O que mais atrapalha a sua rotina?" />
              <Chips opcoes={DIFICULDADES} sel={p.dificuldades} aoTocar={(v) => alternar("dificuldades", v)} />
              <Pergunta texto="Em que horário você rende mais?" />
              <Chips opcoes={HORARIOS} sel={p.horarios} aoTocar={(v) => alternar("horarios", v)} />
            </>
          )}

          {passo === 5 && (
            <ConfigurarAcesso
              aoAbrir={aoAbrir}
              pessoais={[...p.nomeCompleto.split(/\s+/), p.apelido, p.nascimento.slice(0, 4)]}
            />
          )}
        </ScrollView>

        {passo < total - 1 && (
          <View style={s.rodape}>
            <Pressable
              style={[s.botaoPrincipal, { backgroundColor: valido ? c.primario : c.borda }, !valido && s.semSombra]}
              onPress={continuar}
              disabled={!valido}
              accessibilityRole="button"
              accessibilityState={{ disabled: !valido }}
            >
              <Text style={[s.botaoTextoCheio, !valido ? { color: c.textoSuave } : tema.dark && { color: "#1A0929" }]}>Continuar</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

function Pergunta({ texto, ajuda }: { texto: string; ajuda?: string }) {
  const c = useTema().cores;
  return (
    <View style={{ marginTop: 24, marginBottom: 12 }}>
      <Text style={{ color: c.texto, fontSize: 17, fontWeight: "700", lineHeight: 24 }}>{texto}</Text>
      {ajuda && <Text style={{ color: c.textoSuave, fontSize: 13, marginTop: 3 }}>{ajuda}</Text>}
    </View>
  );
}

function Aviso({ cor, children }: { cor: string; children: React.ReactNode }) {
  return <Text style={{ color: cor, fontSize: 13, marginTop: 6 }} accessibilityLiveRegion="polite">{children}</Text>;
}

function Campo(props: {
  rotulo: string; dica?: string; valor: string; aoMudar: (v: string) => void;
  teclado?: "default" | "number-pad"; autoCapitalize?: "none" | "words";
}) {
  const { cores: c } = useTema();
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={{ color: foco ? c.primario : c.textoSuave, fontSize: 13, fontWeight: "500" }}>{props.rotulo}</Text>
      <TextInput
        style={[s.input, { borderBottomColor: foco ? c.primario : c.borda, color: c.texto }]}
        value={props.valor}
        onChangeText={props.aoMudar}
        placeholder={props.dica}
        placeholderTextColor={c.textoSuave}
        keyboardType={props.teclado ?? "default"}
        autoCapitalize={props.autoCapitalize ?? "sentences"}
        accessibilityLabel={props.rotulo}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
      />
    </View>
  );
}

function Chips({ opcoes, sel, aoTocar, lista }: { opcoes: Opcao[]; sel: string[]; aoTocar: (v: string) => void; lista?: boolean }) {
  const tema = useTema();
  const c = tema.cores;
  return (
    <View style={lista ? [s.lista, { borderTopColor: c.borda }] : s.chips}>
      {opcoes.map((o) => {
        const ativo = sel.includes(o.v);
        return lista ? (
          <Pressable
            key={o.v}
            onPress={() => aoTocar(o.v)}
            style={({ pressed }) => [s.itemLista, { borderBottomColor: c.borda }, pressed && { backgroundColor: c.primarioSuave }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: ativo }}
          >
            <Text style={{ color: ativo ? c.primario : c.texto, fontWeight: ativo ? "700" : "500", fontSize: 16, flex: 1 }}>{o.t}</Text>
            {ativo
              ? <Icone nome="check" tamanho={16} cor={c.primario} />
              : <Icone nome="angle-small-right" tamanho={18} cor={c.textoSuave} style={{ opacity: 0.5 }} />}
          </Pressable>
        ) : (
          <Pressable
            key={o.v}
            onPress={() => aoTocar(o.v)}
            style={[s.chip, ativo ? { borderColor: c.primario, backgroundColor: c.primario } : { borderColor: c.borda, backgroundColor: c.superficie }]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ativo }}
          >
            <Text style={{ color: ativo ? (tema.dark ? "#1A0929" : "#fff") : c.texto, fontWeight: "600", fontSize: 14 }}>{o.t}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  topoBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 12 },
  voltar: { width: 32, height: 44, justifyContent: "center" },
  barraFundo: { height: 3, borderRadius: 2, overflow: "hidden" },
  barra: { height: 3, borderRadius: 2 },
  cabecalhoConteudo: { alignItems: "flex-start", marginBottom: 8, gap: 8 },
  iconeEtapa: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  conteudo: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  titulo: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6, lineHeight: 36 },
  desc: { fontSize: 15, lineHeight: 22 },
  input: { borderBottomWidth: 1.5, paddingHorizontal: 0, paddingTop: 6, paddingBottom: 10, fontSize: 17 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
  lista: { borderTopWidth: StyleSheet.hairlineWidth },
  itemLista: {
    borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16, minHeight: 56,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12,
  },
  rodape: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  botaoPrincipal: { paddingVertical: 17, borderRadius: 14, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  semSombra: { shadowOpacity: 0, elevation: 0 },
  botaoTextoCheio: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.2 },
  fim: { padding: 24, gap: 16, alignItems: "stretch", justifyContent: "center", flexGrow: 1 },
  cartao: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 4 },
  cartaoDestaque: { borderWidth: 1.5, borderRadius: 20, padding: 18, gap: 4 },
});

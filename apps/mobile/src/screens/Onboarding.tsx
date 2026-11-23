import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { PERFIL_VAZIO, calcularIdade, classificarInvestidor } from "@solis/core";
import type { Perfil, PerfilInvestidor } from "@solis/core";
import { atualizarConta, criarConta, lerPerfil, salvarPerfil } from "@solis/dados";
import type { Banco } from "@solis/dados";
import { SafeScreen } from "../components/SafeScreen";
import { Icone } from "../components/Icone";
import { ForcarTema, temaEscuro, useTema } from "../theme";
import { ConfigurarAcesso } from "./ConfigurarAcesso";
import { OnboardingContainer } from "../onboarding/OnboardingContainer";
import { BotaoCTA, BotaoTopo, BrilhoAmbiente, MOLA, SegmentedProgressBar } from "../onboarding/componentes";
import { Cascata, ResumoCard, SetupStage } from "../onboarding/SetupStage";
import type { WalletCardProps } from "../onboarding/WalletCard";
import { CONTA_INICIAL, PRONTO, SETUP_ROTULOS } from "../onboarding/onboardingConfig";
import { formatarDinheiro, parseDinheiro } from "../utils/dinheiro";

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

/** Fluxo inteiro, sempre no tema escuro: tour → perfil → senha → primeira conta → pronto. */
export function Onboarding({ aoConcluir }: { aoConcluir: (banco: Banco) => void }) {
  const [tourVisto, setTourVisto] = useState(false);
  // O setup fica montado mesmo ao voltar para o tour, para não perder o que já foi preenchido.
  return (
    <ForcarTema value={temaEscuro}>
      {!tourVisto && <SafeScreen><OnboardingContainer aoTerminar={() => setTourVisto(true)} /></SafeScreen>}
      <View style={{ flex: 1, display: tourVisto ? "flex" : "none" }}>
        <PerfilOnboarding aoConcluir={aoConcluir} aoVoltarTour={() => setTourVisto(false)} />
      </View>
    </ForcarTema>
  );
}

// Passos do setup: 0–4 perguntas do perfil, 5 senha, 6 primeira conta, 7 tudo pronto.
const P_SENHA = 5, P_CONTA = 6, P_PRONTO = 7, TOTAL_SETUP = 8;

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1]![0] : "")).toUpperCase();
}

function PerfilOnboarding({ aoConcluir, aoVoltarTour }: { aoConcluir: (banco: Banco) => void; aoVoltarTour: () => void }) {
  const tema = useTema();
  const c = tema.cores;
  const [passo, setPasso] = useState(0);
  const [p, setP] = useState<Perfil>(PERFIL_VAZIO);
  const [dataBR, setDataBR] = useState("");
  const [generoOutro, setGeneroOutro] = useState("");
  const [pronomeOutro, setPronomeOutro] = useState("");
  const [pronto, setPronto] = useState<{ banco: Banco; perfil: Perfil } | null>(null);
  const [forca, setForca] = useState(0);
  const [tipoIdx, setTipoIdx] = useState(0);
  const [contaNome, setContaNome] = useState("");
  const [contaSaldo, setContaSaldo] = useState("");
  const [contaId, setContaId] = useState<string | null>(null);
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [brilhos, setBrilhos] = useState(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [passo]);
  // Senha forte faz a luz passar pelo cartão; o "Tudo pronto" também.
  useEffect(() => { if (forca === 1) setBrilhos((n) => n + 1); }, [forca]);
  useEffect(() => { if (passo === P_PRONTO) setBrilhos((n) => n + 1); }, [passo]);

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
  ][passo] ?? false;

  function continuar() {
    if (!valido) return;
    if (passo === 0) set("nascimento", paraISO(dataBR));
    setPasso(passo + 1);
  }

  // Depois da senha o cofre já existe: da conta não se volta; do "Tudo pronto" volta-se para editar a conta.
  const podeVoltar = passo !== P_CONTA;
  function voltar() {
    if (passo === 0) aoVoltarTour();
    else setPasso(passo - 1);
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
    // Backup restaurado já traz o perfil e as contas do aparelho antigo.
    const existente = restaurado ? await lerPerfil(banco) : null;
    if (existente) {
      aoConcluir(banco);
      return;
    }
    await salvarPerfil(banco, final);
    setPronto({ banco, perfil: final });
    setPasso(P_CONTA);
  }

  const tipo = CONTA_INICIAL.tipos[tipoIdx]!;
  const saldoCentavos = parseDinheiro(contaSaldo) ?? 0;

  async function concluirConta() {
    if (!pronto || !contaNome.trim()) return;
    setSalvandoConta(true);
    try {
      const dados = { nome: contaNome.trim(), tipo: tipo.v, saldoInicialCentavos: saldoCentavos };
      if (contaId) await atualizarConta(pronto.banco, contaId, dados);
      else setContaId((await criarConta(pronto.banco, { ...dados, moeda: "BRL" })).id);
      setPasso(P_PRONTO);
    } catch {
      Alert.alert("Não deu para salvar a conta", "Tente de novo, ou crie depois pela tela inicial.");
    } finally {
      setSalvandoConta(false);
    }
  }

  // ----- Cartão do palco: muda de conteúdo a cada passo, sem desmontar -----
  const apelido = p.apelido.trim();
  const naConta = passo >= P_CONTA;
  const temConta = !!contaId;
  const frente: Omit<WalletCardProps, "width"> = {
    title: naConta ? (contaNome.trim() || tipo.exemplo.replace("Ex.: ", "")) : SETUP_ROTULOS.cartaoPerfil(apelido),
    subtitle: naConta ? tipo.sub : passo === P_SENHA ? SETUP_ROTULOS.subSenha : SETUP_ROTULOS.subPerfil,
    balance: naConta ? saldoCentavos : 0,
    isBalanceHidden: passo === P_SENHA,
    contarAoRevelar: true,
    recontar: passo === P_PRONTO ? 1 : 0,
    variant: naConta ? tipo.variante : "abyssal",
    tipoIcon: naConta ? "shield-check" : "wallet",
    holder: apelido || SETUP_ROTULOS.titularVazio,
    triggerShimmer: brilhos,
    triggerPulse: passo === P_SENHA ? 1 : 0,
    protecao: passo === P_SENHA ? forca : 0,
    selo: passo === P_PRONTO ? (temConta ? PRONTO.selo : PRONTO.seloSemConta) : null,
    ...(naConta ? { badgeIcon: tipo.icone }
      : passo === P_SENHA ? { badgeIcon: "lock" as const }
      : iniciais(p.nomeCompleto) ? { badgeText: iniciais(p.nomeCompleto) } : { badgeIcon: "user" as const }),
  };

  // Os 3 cartões do baralho, na ordem do seletor. Nome e saldo digitados aparecem em todos, cada um com a sua identidade.
  const cartoes: Omit<WalletCardProps, "width">[] = CONTA_INICIAL.tipos.map((t) => ({
    title: contaNome.trim() || t.exemplo.replace("Ex.: ", ""),
    subtitle: t.sub, balance: saldoCentavos, variant: t.variante, badgeIcon: t.icone, tipoIcon: "shield-check" as const,
    holder: apelido || SETUP_ROTULOS.titularVazio,
  }));

  const etapa = passo <= P_SENHA ? ETAPAS[passo]! : passo === P_CONTA
    ? { titulo: CONTA_INICIAL.titulo, desc: CONTA_INICIAL.texto } : { titulo: PRONTO.titulo, desc: PRONTO.texto };

  return (
    <SafeScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <BrilhoAmbiente />
        <View style={s.topoBar}>
          <View style={{ width: 36 }}>{podeVoltar && <BotaoTopo voltar onPress={voltar} />}</View>
          <SegmentedProgressBar total={TOTAL_SETUP} atual={passo} />
          <Text style={{ color: c.textoSuave, fontSize: 12, fontWeight: "600", width: 36, textAlign: "right", fontVariant: ["tabular-nums"] }}>
            {passo + 1}/{TOTAL_SETUP}
          </Text>
        </View>

        <SetupStage compacto={passo >= 1 && passo <= 4} frente={frente} cartoes={cartoes} ativo={tipoIdx}
          fase={naConta ? "conta" : "perfil"} deckAberto={naConta} />

        <ScrollView ref={scroll} contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
          <View key={passo}>
            <Cascata>
              <Text style={[s.titulo, { color: c.texto }]} accessibilityRole="header">
                {passo === P_PRONTO && apelido ? `Tudo pronto, ${apelido}!` : etapa.titulo}
              </Text>
              <Text style={[s.desc, { color: c.textoSuave, marginTop: 8 }]}>{etapa.desc}</Text>

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

              {passo === P_SENHA && (
                <View style={{ marginTop: 20 }}>
                  <ConfigurarAcesso aoAbrir={aoAbrir} aoMudarForca={setForca}
                    pessoais={[...p.nomeCompleto.split(/\s+/), p.apelido, p.nascimento.slice(0, 4)]} />
                </View>
              )}

              {passo === P_CONTA && (
                <>
                  <SeletorTipo indice={tipoIdx} aoEscolher={setTipoIdx} />
                  <View style={s.grupo}>
                    <CampoAgrupado rotulo="Nome" valor={contaNome} aoMudar={setContaNome} dica={tipo.exemplo} />
                    <View style={s.divisor} />
                    <CampoAgrupado rotulo="Saldo hoje (R$)" valor={contaSaldo} aoMudar={setContaSaldo} dica="0,00" teclado="decimal-pad" />
                  </View>
                  <Text style={{ color: c.textoSuave, fontSize: 12, marginTop: 10 }}>{CONTA_INICIAL.nota}</Text>
                </>
              )}
            </Cascata>

            {passo === P_PRONTO && pronto && (
              <View style={{ marginTop: 12 }}>
                <ResumoCard indice={0} icone="user" cor="#3E5269" rotulo="Perfil configurado" valor={pronto.perfil.nomeCompleto.trim()}
                  detalhe={`Perfil de investidor: ${NOME_PERFIL[pronto.perfil.perfilInvestidor ?? "conservador"]}. Não é recomendação de investimento.`} />
                <ResumoCard indice={1} icone="lock" cor="#2F5A45" rotulo="Segurança ativa" valor="Senha forte criada"
                  detalhe="Seus dados ficam cifrados só neste celular." />
                <ResumoCard indice={2} icone={temConta ? tipo.icone : "wallet"} cor="#7A3C29"
                  rotulo={temConta ? "Primeira conta criada" : "Primeira conta"}
                  valor={temConta ? `${contaNome.trim()} · ${formatarDinheiro(saldoCentavos)}` : "Você cria pela tela inicial"} />
              </View>
            )}
          </View>
        </ScrollView>

        {passo <= 4 && (
          <View style={s.rodape}><BotaoCTA texto="Continuar" onPress={continuar} desativado={!valido} /></View>
        )}
        {passo === P_CONTA && (
          <View style={s.rodape}>
            <BotaoCTA texto={CONTA_INICIAL.cta} onPress={concluirConta} desativado={!contaNome.trim()} carregando={salvandoConta} />
            <Pressable onPress={() => setPasso(P_PRONTO)} style={{ padding: 12, alignItems: "center" }} accessibilityRole="button">
              <Text style={{ color: c.textoSuave, fontWeight: "600" }}>{CONTA_INICIAL.pular}</Text>
            </Pressable>
          </View>
        )}
        {passo === P_PRONTO && pronto && (
          <View style={s.rodape}><BotaoCTA texto={PRONTO.cta} onPress={() => aoConcluir(pronto.banco)} /></View>
        )}
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

/** Seletor em pílula com indicador que desliza (mola do tour). */
function SeletorTipo({ indice, aoEscolher }: { indice: number; aoEscolher: (i: number) => void }) {
  const c = useTema().cores;
  const [largura, setLargura] = useState(0);
  const n = CONTA_INICIAL.tipos.length;
  const pos = useSharedValue(indice);
  useEffect(() => { pos.value = withSpring(indice, MOLA); }, [indice]);
  const ind = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * (largura / n) }] }));
  return (
    <View style={[s.segmento, { backgroundColor: c.superficie }]} onLayout={(e) => setLargura(e.nativeEvent.layout.width - 8)} accessibilityRole="radiogroup">
      {largura > 0 && <Reanimated.View style={[s.segIndicador, { width: largura / n, backgroundColor: c.primario }, ind]} />}
      {CONTA_INICIAL.tipos.map((t, i) => (
        <Pressable key={t.v} style={s.segItem} onPress={() => aoEscolher(i)} accessibilityRole="radio" accessibilityState={{ selected: i === indice }}>
          <Icone nome={t.icone} tamanho={13} cor={i === indice ? c.sobrePrimario : c.textoSuave} />
          <Text style={{ color: i === indice ? c.sobrePrimario : c.textoSuave, fontWeight: "700", fontSize: 13 }}>{t.t}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function CampoAgrupado({ rotulo, valor, aoMudar, dica, teclado }: {
  rotulo: string; valor: string; aoMudar: (v: string) => void; dica: string; teclado?: "decimal-pad";
}) {
  const c = useTema().cores;
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
      <Text style={{ color: foco ? c.primario : c.textoSuave, fontSize: 12, fontWeight: "600" }}>{rotulo}</Text>
      <TextInput value={valor} onChangeText={aoMudar} placeholder={dica} placeholderTextColor={c.textoSuave}
        keyboardType={teclado ?? "default"} autoCapitalize={teclado ? "none" : "words"} onFocus={() => setFoco(true)} onBlur={() => setFoco(false)}
        style={{ color: c.texto, fontSize: 17, paddingVertical: 6, fontVariant: ["tabular-nums"] }} accessibilityLabel={rotulo} />
    </View>
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
            <Text style={{ color: ativo ? c.sobrePrimario : c.texto, fontWeight: "600", fontSize: 14 }}>{o.t}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  topoBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 12 },
  grupo: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#2C3B4D", marginTop: 14 },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.08)", marginLeft: 16 },
  segmento: { flexDirection: "row", borderRadius: 50, padding: 4, marginTop: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  segIndicador: { position: "absolute", top: 4, bottom: 4, left: 4, borderRadius: 50 },
  segItem: { flex: 1, minHeight: 40, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  voltar: { width: 32, height: 44, justifyContent: "center" },
  barraFundo: { height: 3, borderRadius: 2, overflow: "hidden" },
  barra: { height: 3, borderRadius: 2 },
  cabecalhoConteudo: { alignItems: "flex-start", marginBottom: 8, gap: 8 },
  iconeEtapa: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  conteudo: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  titulo: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6, lineHeight: 34 },
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

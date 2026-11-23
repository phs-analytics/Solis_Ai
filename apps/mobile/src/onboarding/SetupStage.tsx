import React, { useEffect } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Icone, type NomeIcone } from "../components/Icone";
import { BORDA_FINA, MOLA, c } from "./componentes";
import { PROPORCAO, type WalletCardProps } from "./WalletCard";
import { WalletCardDeck, larguraDeck } from "./WalletCardDeck";

const ESCALA_COMPACTA = 0.5;

/**
 * Palco do setup: o mesmo cartão do Perfil até o "Tudo pronto". Nunca desmonta;
 * só muda de tamanho (compacto nas perguntas longas) e de conteúdo.
 */
export function SetupStage({ compacto, frente, cartoes, ativo, fase, deckAberto }: {
  compacto: boolean; frente: Omit<WalletCardProps, "width">; cartoes: Omit<WalletCardProps, "width">[];
  ativo: number; fase: string; deckAberto: boolean;
}) {
  const { width } = useWindowDimensions();
  const w = larguraDeck(width);
  const alturaCheia = w / PROPORCAO + 40;
  const alturaCompacta = (w / PROPORCAO) * ESCALA_COMPACTA + 12;

  const k = useSharedValue(compacto ? 1 : 0);
  useEffect(() => { k.value = withSpring(compacto ? 1 : 0, MOLA); }, [compacto]);
  const caixa = useAnimatedStyle(() => ({ height: alturaCheia + (alturaCompacta - alturaCheia) * k.value }));
  const cartao = useAnimatedStyle(() => ({ transform: [{ scale: 1 - (1 - ESCALA_COMPACTA) * k.value }] }));

  return (
    <Animated.View style={[{ alignItems: "center", overflow: "visible" }, caixa]}>
      <Animated.View style={[{ transformOrigin: "top center", paddingTop: 10 }, cartao]}>
        <WalletCardDeck width={w} frente={frente} cartoes={cartoes} ativo={ativo} fase={fase} aberto={deckAberto} />
      </Animated.View>
    </Animated.View>
  );
}

/** Cada filho entra com fade + subida, um depois do outro (60 ms), com a mola do tour. */
export function Cascata({ children, passo = 60, atraso = 0 }: { children: React.ReactNode; passo?: number; atraso?: number }) {
  const itens = achatar(children);
  return (
    <>
      {itens.map((filho, i) => (
        <Animated.View key={React.isValidElement(filho) ? filho.key ?? i : i}
          entering={FadeInDown.delay(atraso + i * passo).springify().stiffness(MOLA.stiffness).damping(MOLA.damping)}>
          {filho}
        </Animated.View>
      ))}
    </>
  );
}

// Abre fragmentos para que cada pergunta/campo entre separado. A chave leva o prefixo do pai para não repetir
// e para um aviso que aparece no meio não reanimar os itens de baixo.
function achatar(children: React.ReactNode, prefixo = ""): React.ReactNode[] {
  return React.Children.toArray(children).flatMap((f) => {
    if (!React.isValidElement(f)) return [f];
    const chave = prefixo + String(f.key);
    return f.type === React.Fragment
      ? achatar((f.props as { children?: React.ReactNode }).children, chave + "/")
      : [React.cloneElement(f, { key: chave })];
  });
}

export function ResumoCard({ icone, cor, rotulo, valor, detalhe, indice }: {
  icone: NomeIcone; cor: string; rotulo: string; valor: string; detalhe?: string; indice: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(300 + indice * 80).springify().stiffness(MOLA.stiffness).damping(MOLA.damping)}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.superficie, borderRadius: 16, borderWidth: 1, borderColor: BORDA_FINA, padding: 12, marginTop: 8 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: cor, alignItems: "center", justifyContent: "center" }}>
        <Icone nome={icone} tamanho={16} cor="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.textoSuave, fontSize: 12, fontWeight: "600" }}>{rotulo}</Text>
        <Text style={{ color: c.texto, fontSize: 15, fontWeight: "700", marginTop: 1, fontVariant: ["tabular-nums"] }} numberOfLines={1}>{valor}</Text>
        {!!detalhe && <Text style={{ color: c.textoSuave, fontSize: 11, marginTop: 2 }}>{detalhe}</Text>}
      </View>
      <Icone nome="check" tamanho={14} cor="#7BC79A" />
    </Animated.View>
  );
}

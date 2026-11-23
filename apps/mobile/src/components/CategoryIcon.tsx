import React from "react";
import { View } from "react-native";
import { Icone, type NomeIcone } from "./Icone";

// Ícone vetorial por categoria (as categorias padrão guardam emoji no banco; aqui o ícone vem do id).
// Ícone branco sobre cores médias: contraste acima de 3:1 nos dois temas.
const POR_ID: Record<string, { icone: NomeIcone; cor: string }> = {
  cat_alimentacao: { icone: "utensils", cor: "#C0702A" },
  cat_transporte: { icone: "bus", cor: "#2F5DA8" },
  cat_moradia: { icone: "home", cor: "#5B6B7E" },
  cat_saude: { icone: "capsules", cor: "#A33A4A" },
  cat_educacao: { icone: "book", cor: "#6A5AA6" },
  cat_lazer: { icone: "gamepad", cor: "#8A4FA0" },
  cat_vestuario: { icone: "tshirt", cor: "#2E7D6B" },
  cat_outros_desp: { icone: "box", cor: "#55606B" },
  cat_salario: { icone: "sack-dollar", cor: "#2E7D52" },
  cat_freelance: { icone: "laptop", cor: "#2F5DA8" },
  cat_outros_rec: { icone: "arrow-down-left", cor: "#2E7D52" },
  cat_transferencia: { icone: "exchange", cor: "#5B6B7E" },
};
const POR_TIPO: Record<string, { icone: NomeIcone; cor: string }> = {
  receita: { icone: "arrow-down-left", cor: "#2E7D52" },
  despesa: { icone: "box", cor: "#55606B" },
  transferencia: { icone: "exchange", cor: "#5B6B7E" },
};

export function CategoryIcon({ categoriaId, tipo, tamanho = 42, recorrente }: {
  categoriaId: string | null | undefined; tipo?: string; tamanho?: number; recorrente?: boolean;
}) {
  const it = (categoriaId && POR_ID[categoriaId]) || POR_TIPO[tipo ?? "despesa"] || POR_TIPO.despesa!;
  return (
    <View accessible={false} style={{ width: tamanho, height: tamanho, borderRadius: tamanho * 0.31, backgroundColor: it.cor, alignItems: "center", justifyContent: "center" }}>
      <Icone nome={it.icone} tamanho={tamanho * 0.42} cor="#FFFFFF" />
      {recorrente && (
        <View style={{ position: "absolute", right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: "#1B2632", borderWidth: 2, borderColor: "#FFB162", alignItems: "center", justifyContent: "center" }}>
          <Icone nome="clock" tamanho={8} cor="#FFB162" />
        </View>
      )}
    </View>
  );
}

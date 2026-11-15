/**
 * Contexto global do banco aberto.
 * Fornece o banco para todas as telas sem prop-drilling.
 */
import React, { createContext, useContext } from "react";
import type { Banco } from "@solis/dados";

const BancoCtx = createContext<Banco | null>(null);

export const BancoProvider = BancoCtx.Provider;

export function useBanco(): Banco {
  const banco = useContext(BancoCtx);
  if (!banco) throw new Error("useBanco: banco não está aberto");
  return banco;
}

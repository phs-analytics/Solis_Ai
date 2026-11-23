import { useEffect, useRef, useState } from "react";

/** Número que rola do valor anterior (ou de `inicial`) até o novo. Sem movimento, vai direto. */
export function useNumeroRolando(alvo: number, { inicial, duracao = 800, reduzir = false }: { inicial?: number; duracao?: number; reduzir?: boolean } = {}): number {
  const [mostrado, setMostrado] = useState(inicial ?? alvo);
  const anterior = useRef(inicial ?? alvo);
  useEffect(() => {
    const de = anterior.current, t0 = Date.now();
    anterior.current = alvo;
    if (reduzir || de === alvo) { setMostrado(alvo); return; }
    let id = 0;
    const passo = () => {
      const k = Math.min(1, (Date.now() - t0) / duracao);
      setMostrado(Math.round(de + (alvo - de) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [alvo, reduzir]);
  return mostrado;
}

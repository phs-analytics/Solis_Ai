/**
 * Autoteste do cofre: verifica que o banco abre com a senha certa
 * e rejeita a senha errada.
 *
 * Roda no CI com emulador Android (expo-sqlite precisa do ambiente nativo).
 * Em ambiente Node puro os mocks abaixo evitam erro de importação.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks das dependências nativas ──────────────────────────────────────────
vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: vi.fn(),
}));
vi.mock("expo-file-system", () => ({
  documentDirectory: "/data/",
  cacheDirectory: "/cache/",
  deleteAsync: vi.fn(),
  copyAsync: vi.fn(),
}));
vi.mock("expo-secure-store", () => ({
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));

import * as SQLite from "expo-sqlite";
import { abrirBanco, fecharBanco } from "../src/vault.js";

describe("vault", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("abre o banco com senha correta", async () => {
    const execAsync = vi.fn().mockResolvedValue(undefined);
    const closeAsync = vi.fn().mockResolvedValue(undefined);
    const getAllAsync = vi.fn().mockResolvedValue({ rows: [] });

    vi.mocked(SQLite.openDatabaseAsync).mockResolvedValue({
      execAsync,
      closeAsync,
      getAllAsync,
    } as unknown as SQLite.SQLiteDatabase);

    const banco = await abrirBanco("senha_certa_12345");
    expect(banco).toBeDefined();
    // Deve ter aplicado o PRAGMA key
    expect(execAsync).toHaveBeenCalledWith(expect.stringContaining("PRAGMA key"));
    await fecharBanco();
  });

  it("lança erro quando SELECT falha (senha errada simulada)", async () => {
    const execAsync = vi
      .fn()
      .mockResolvedValueOnce(undefined) // PRAGMA key ok
      .mockRejectedValueOnce(new Error("file is not a database")); // banco rejeita

    vi.mocked(SQLite.openDatabaseAsync).mockResolvedValue({
      execAsync,
      closeAsync: vi.fn(),
      getAllAsync: vi.fn(),
    } as unknown as SQLite.SQLiteDatabase);

    await expect(abrirBanco("senha_errada")).rejects.toThrow("file is not a database");
    await fecharBanco();
  });
});

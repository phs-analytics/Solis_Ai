import { defineConfig } from "vitest/config";
import { resolve } from "path";

const mocksDir = resolve(__dirname, "test/__mocks__");

// Redireciona módulos nativos do React Native/Expo para stubs vazios.
// O Vitest não consegue parsear Flow types do react-native real.
const nativeAlias = (name: string) => ({ [name]: resolve(mocksDir, "native-stub.ts") });

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    alias: {
      // Módulos nativos/Expo não são parseáveis em Node — alias para stubs vazios.
      // A lógica de derivação de chave (expo-crypto) é testada no emulador (CI).
      ...nativeAlias("react-native"),
      "expo-modules-core": resolve(mocksDir, "expo-modules-core.ts"),
      ...nativeAlias("expo-crypto"),
      ...nativeAlias("expo"),
    },
  },
});

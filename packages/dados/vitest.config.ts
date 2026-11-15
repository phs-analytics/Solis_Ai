import { defineConfig } from "vitest/config";
import { resolve } from "path";

const mocksDir = resolve(__dirname, "test/__mocks__");

// Redireciona módulos nativos do React Native/Expo para stubs vazios.
// O Vitest não consegue parsear Flow types do react-native real.
const nativeAlias = (name: string) => ({ [name]: resolve(mocksDir, "native-stub.ts") });

export default defineConfig({
  test: {
    alias: {
      // Apenas react-native e expo-modules-core precisam de alias — têm Flow types
      // que o Vitest não consegue parsear. Os outros são controlados via vi.mock() no teste.
      ...nativeAlias("react-native"),
      "expo-modules-core": resolve(mocksDir, "expo-modules-core.ts"),
    },
  },
});

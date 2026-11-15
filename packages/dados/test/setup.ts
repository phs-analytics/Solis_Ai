// Globals do React Native/Expo que não existem em Node
(globalThis as Record<string, unknown>).__DEV__ = false;

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Os pacotes do monorepo importam "./x.js" (estilo NodeNext) apontando para x.ts; o Metro não faz esse mapeamento.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    } catch {}
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

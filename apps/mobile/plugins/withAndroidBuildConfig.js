/**
 * Config plugin: desativa a minificação R8 no release build.
 * A minificação R8 quebrava o SQLCipher e o llama.rn ao remover classes nativas.
 */
const { withGradleProperties } = require("@expo/config-plugins");

/** @type {import('@expo/config-plugins').ConfigPlugin} */
const withAndroidBuildConfig = (config) =>
  withGradleProperties(config, (mod) => {
    const props = mod.modResults;
    const idx = props.findIndex(
      (p) => p.type === "property" && p.key === "android.enableMinifyInReleaseBuilds"
    );
    if (idx >= 0) {
      props[idx].value = "false";
    } else {
      props.push({ type: "property", key: "android.enableMinifyInReleaseBuilds", value: "false" });
    }
    return mod;
  });

module.exports = withAndroidBuildConfig;

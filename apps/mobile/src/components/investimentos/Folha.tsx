import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTema } from "../../theme";

const ALTURA_TELA = Dimensions.get("window").height;

/**
 * Folha de baixo que fecha arrastando para baixo: pela alça/cabeçalho a qualquer momento,
 * ou pelo conteúdo quando ele já está no topo.
 */
export function Folha({ aberta, aoFechar, cabecalho, children }: { aberta: boolean; aoFechar: () => void; cabecalho?: React.ReactNode; children: React.ReactNode }) {
  const c = useTema().cores;
  const ins = useSafeAreaInsets();
  const y = useRef(new Animated.Value(ALTURA_TELA)).current;
  const noTopo = useRef(true);

  useEffect(() => {
    if (aberta) { y.setValue(ALTURA_TELA); Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start(); }
  }, [aberta, y]);

  const fechar = () => Animated.timing(y, { toValue: ALTURA_TELA, duration: 220, useNativeDriver: true }).start(() => aoFechar());

  const arrasto = (soNoTopo: boolean) => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx) && (!soNoTopo || noTopo.current),
    onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 100 || (g.vy > 0.8 && g.dy > 30)) fechar();
      else Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 20 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(y, { toValue: 0, useNativeDriver: true }).start(),
  });
  const peloCabecalho = useRef(arrasto(false)).current;
  const peloConteudo = useRef(arrasto(true)).current;
  const fundo = y.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <Modal visible={aberta} transparent animationType="none" onRequestClose={fechar} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", opacity: fundo }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={fechar} accessibilityLabel="Fechar" />
      </Animated.View>
      <Animated.View style={[s.folha, { backgroundColor: c.superficie, paddingBottom: ins.bottom + 16, transform: [{ translateY: y }] }]} accessibilityViewIsModal>
        <View {...peloCabecalho.panHandlers}>
          <View style={s.alcaArea}><View style={[s.alca, { backgroundColor: c.borda }]} /></View>
          {cabecalho}
        </View>
        <ScrollView {...peloConteudo.panHandlers} showsVerticalScrollIndicator={false} scrollEventThrottle={16}
          onScroll={(e) => { noTopo.current = e.nativeEvent.contentOffset.y <= 0; }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  folha: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%", borderTopLeftRadius: 28, borderTopRightRadius: 28, elevation: 16 },
  alcaArea: { alignItems: "center", paddingTop: 10, paddingBottom: 12 },
  alca: { width: 40, height: 4, borderRadius: 2 },
});

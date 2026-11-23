import React from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const MOLA = { stiffness: 280, damping: 26 };

/** Pressable que encolhe para 0,97 ao toque e volta com mola. Área mínima de 48 dp via hitSlop. */
export function Tocavel({ style, children, hitSlop = 6, ...props }: Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>; children: React.ReactNode;
}) {
  const s = useSharedValue(1);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable {...props} hitSlop={hitSlop}
      onPressIn={(e) => { s.value = withSpring(0.97, MOLA); props.onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, MOLA); props.onPressOut?.(e); }}>
      <Animated.View style={[style, estilo]}>{children}</Animated.View>
    </Pressable>
  );
}

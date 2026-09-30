import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

export function sx(
  ...styles: Array<StyleProp<ViewStyle> | StyleProp<TextStyle> | false | null | undefined>
) {
  return StyleSheet.flatten(styles.filter(Boolean) as StyleProp<ViewStyle>[]);
}

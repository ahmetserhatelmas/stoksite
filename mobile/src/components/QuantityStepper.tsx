import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../lib/theme";

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  onInputFocus?: () => void;
};

export function QuantityStepper({ value, onChange, min = 0, max, onInputFocus }: Props) {
  function set(next: number) {
    const clamped = Math.max(min, max == null ? next : Math.min(max, next));
    onChange(clamped);
  }

  return (
    <View style={styles.row}>
      <Pressable style={styles.btn} onPress={() => set(value - 1)} hitSlop={8}>
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <TextInput
        value={String(value)}
        keyboardType="number-pad"
        returnKeyType="done"
        blurOnSubmit
        onFocus={onInputFocus}
        onChangeText={(text) => {
          const n = parseInt(text.replace(/\D/g, ""), 10);
          set(Number.isFinite(n) ? n : min);
        }}
        style={styles.input}
      />
      <Pressable style={styles.btn} onPress={() => set(value + 1)} hitSlop={8}>
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  input: {
    minWidth: 52,
    height: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    textAlign: "center",
    fontWeight: "600",
    color: colors.text,
    backgroundColor: "#fff",
  },
});

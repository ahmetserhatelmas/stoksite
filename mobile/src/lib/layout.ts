import { useWindowDimensions } from "react-native";

export const SIDEBAR_WIDTH = 220;
/** Side-by-side chrome only when the window is at least iPad landscape width. */
export const WIDE_LAYOUT = 1024;

export function useWideLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= WIDE_LAYOUT;
  return {
    width,
    height,
    wide,
    contentWidth: width - (wide ? SIDEBAR_WIDTH : 0),
  };
}

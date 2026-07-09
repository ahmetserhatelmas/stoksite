import path from "path";
import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerPdfFonts() {
  if (registered) return;

  const fontsDir = path.join(process.cwd(), "public/fonts");

  Font.register({
    family: "Roboto",
    fonts: [
      {
        src: path.join(fontsDir, "Roboto-Regular.ttf"),
        fontWeight: "normal",
      },
      {
        src: path.join(fontsDir, "Roboto-Bold.ttf"),
        fontWeight: "bold",
      },
    ],
  });

  registered = true;
}

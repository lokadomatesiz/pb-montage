import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

// Токены канала «Pueblos Borrados» (VISUAL-CH2.md §2–3). Имена те же, что в правилах.
export const T = {
  carbon: "#0D0B0C",
  lava: "#E8590C",
  brasa: "#8A2E0A",
  hueso: "#EEE6D8",
  cenizaClara: "#B8B2AA",
  ceniza: "#8D8A87",
  papel: "#D9CBB0",
  acero: "#5E6B73",
};

export const FONT = { cinzel: "Cinzel", oswald: "Oswald", courier: "Courier Prime" };

// Шрифты лежат в public/_brand/fonts, рендер от интернета не зависит.
const load = (family: string, file: string, weight: string) => {
  if (typeof FontFace === "undefined") return;
  const h = delayRender(`font ${family} ${weight}`);
  new FontFace(family, `url('${staticFile(file)}') format('truetype')`, { weight })
    .load()
    .then((f) => {
      document.fonts.add(f);
      continueRender(h);
    })
    .catch((e) => cancelRender(e));
};
load(FONT.cinzel, "_brand/fonts/Cinzel-VariableFont_wght.ttf", "400 900");
load(FONT.oswald, "_brand/fonts/Oswald-VariableFont_wght.ttf", "200 700");
load(FONT.courier, "_brand/fonts/CourierPrime-400.ttf", "400");
load(FONT.courier, "_brand/fonts/CourierPrime-700.ttf", "700");

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// Контрольные кадры: один бандл, много still-ов. Использование:
//   node scripts/stills.mjs <CompositionId> <каталог> <масштаб> <сек1,сек2,...> [путь к браузеру]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [id, outDir, scaleArg, secsArg, browser] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const opts = { serveUrl, browserExecutable: browser || null, chromiumOptions: { gl: "angle" } };
const comp = await selectComposition({ ...opts, id });
for (const sec of secsArg.split(",").map(Number)) {
  const frame = Math.min(comp.durationInFrames - 1, Math.round(sec * comp.fps));
  const output = path.join(outDir, `s_${String(sec).replace(".", "_")}.jpg`);
  await renderStill({ ...opts, composition: comp, frame, output, scale: Number(scaleArg), imageFormat: "jpeg", jpegQuality: 90 });
  console.log("still", sec, "→", output);
}
console.log("длина композиции", (comp.durationInFrames / comp.fps).toFixed(1), "с");

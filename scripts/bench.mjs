// Замер скорости рендера по участкам: node scripts/bench.mjs <Composition> <масштаб> <кадр:кадров,...> [путь к браузеру]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [id, scaleArg, spec, browser] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const base = { serveUrl, browserExecutable: browser || null, chromiumOptions: { gl: "angle" } };
const comp = await selectComposition({ ...base, id });
for (const part of spec.split(",")) {
  const [from, n] = part.split(":").map(Number);
  const t0 = Date.now();
  await renderMedia({ ...base, composition: comp, codec: "h264", outputLocation: `${process.env.BENCH_OUT ?? "."}/bench_${from}.mp4`, frameRange: [from, from + n - 1], scale: Number(scaleArg), muted: true, concurrency: 4, crf: 24, imageFormat: "jpeg", jpegQuality: 80 });
  const s = (Date.now() - t0) / 1000;
  console.log(`кадры ${from}+${n}: ${s.toFixed(1)} с = ${(n / s).toFixed(1)} кадр/с`);
}

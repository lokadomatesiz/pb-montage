// Рендер длинного частями: видео (без звука) по диапазонам кадров + звук отдельно, затем склейка. Готовые части пропускаются.
// Использование: node scripts/long-render.mjs <каталог> <масштаб 0.5|1> <частей> [final]
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const [dir, scaleArg, partsArg, mode] = process.argv.slice(2);
const scale = +scaleArg;
const parts = +partsArg;
const total = 555 * 30;
const per = Math.ceil(total / parts);
fs.mkdirSync(dir, { recursive: true });
const run = (args) => {
  const r = spawnSync("npx", ["remotion", ...args], { stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error("render failed: " + args.join(" "));
};
const q = mode === "final" ? ["--image-format=jpeg", "--jpeg-quality=100", "--crf=16"] : ["--crf=24"];
const list = [];
for (let i = 0; i < parts; i++) {
  const a = i * per;
  const b = Math.min(total - 1, (i + 1) * per - 1);
  const out = `${dir}/part${i}.mp4`;
  list.push(out);
  if (fs.existsSync(out) && fs.statSync(out).size > 1e5) {
    console.log("часть", i, "готова, пропуск");
    continue;
  }
  run(["render", "src/index.ts", "CH2-01", out, `--frames=${a}-${b}`, `--scale=${scale}`, "--muted", "--concurrency=4", ...q]);
}
if (!fs.existsSync(`${dir}/audio.aac`)) run(["render", "src/index.ts", "CH2-01", `${dir}/audio.aac`, "--codec=aac", "--audio-bitrate=256k"]);
fs.writeFileSync(`${dir}/list.txt`, list.map((f) => `file '${f.split("/").pop()}'`).join("\n"));
let r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", `${dir}/list.txt`, "-i", `${dir}/audio.aac`, "-c:v", "copy", "-c:a", "copy", "-shortest", `${dir}/CH2-01-raw.mp4`], { encoding: "utf8" });
if (r.status !== 0) throw new Error(r.stderr);
console.log("склейка готова:", `${dir}/CH2-01-raw.mp4`);

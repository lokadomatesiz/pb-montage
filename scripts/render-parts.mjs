// Рендер длинного частями: видео (без звука) по диапазонам кадров + звук отдельно, затем склейка. Готовые части (≥ 100 КБ) пропускаются — можно докончить вторым запуском.
// Использование: node scripts/render-parts.mjs <Composition> <public-папка ролика> <каталог> <масштаб 0.5|1> <частей> [final] [--only=i,j] [--browser=путь]
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const argv = process.argv.slice(2);
const flag = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const [comp, folder, dir, scaleArg, partsArg, mode] = argv.filter((a) => !a.startsWith("--"));
const only = flag("only")?.split(",").map(Number);
const browser = flag("browser");
const scale = +scaleArg;
const parts = +partsArg;
const props = JSON.parse(fs.readFileSync(`public/${folder}/${/-FINAL$/.test(comp) ? "props-final" : "props"}.json`, "utf8"));
const total = Math.ceil(props.totalSec * 30);
const per = Math.ceil(total / parts);
fs.mkdirSync(dir, { recursive: true });
const run = (args) => {
  const q1 = (x) => (/\s/.test(x) ? `"${x}"` : x);
  const r = spawnSync("npx", ["remotion", ...args].map(q1), { stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error("render failed: " + args.join(" "));
};
const q = mode === "final" ? ["--image-format=jpeg", "--jpeg-quality=100", "--crf=16"] : ["--image-format=jpeg", "--jpeg-quality=80", "--crf=24"];
const common = browser ? [`--browser-executable=${browser}`] : [];
const list = [];
for (let i = 0; i < parts; i++) {
  const a = i * per;
  const b = Math.min(total - 1, (i + 1) * per - 1);
  const out = `${dir}/part${i}.mp4`;
  list.push(out);
  if (only && !only.includes(i)) continue;
  if (fs.existsSync(out) && fs.statSync(out).size > 1e5) {
    console.log("часть", i, "готова, пропуск");
    continue;
  }
  const t0 = Date.now();
  run(["render", "src/index.ts", comp, out, `--frames=${a}-${b}`, `--scale=${scale}`, "--muted", `--concurrency=${flag("conc") ?? 4}`, ...q, ...common]);
  const s = (Date.now() - t0) / 1000;
  console.log(`ЧАСТЬ ${i}: кадры ${a}-${b} (${b - a + 1}) за ${s.toFixed(0)} с = ${((b - a + 1) / s).toFixed(1)} кадр/с`);
}
if (only) process.exit(0);
if (!fs.existsSync(`${dir}/audio.aac`)) run(["render", "src/index.ts", comp, `${dir}/audio.aac`, "--codec=aac", "--audio-bitrate=256k", ...common]);
fs.writeFileSync(`${dir}/list.txt`, list.map((f) => `file '${f.split("/").pop()}'`).join("\n"));
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", `${dir}/list.txt`, "-i", `${dir}/audio.aac`, "-c:v", "copy", "-c:a", "copy", "-shortest", `${dir}/${comp}-draft.mp4`], { encoding: "utf8" });
if (r.status !== 0) throw new Error(r.stderr);
console.log("склейка готова:", `${dir}/${comp}-draft.mp4`);

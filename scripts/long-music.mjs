// Длинное ch2-01: музыкальная подложка из трёх треков автора (M2, M3, Silent Partner) по главам → public/ch2-01/music-bed.mp3.
// Уровни выровнены между треками (громкость трека → −22 LUFS + поправка главы); окончательная громкость под голосом — в композиции.
// Распределение (по характеру огибающей; на слух не слушал): хук+гл.1 — M3 (тихий разреженный), гл.2–3 — M2 (тихо до 110 с, дальше нарастает: ночь и пик),
// гл.4 — M3 (другая часть), гл.5 — Silent Partner (ровный, светлее), гл.6 — M3 с 10-й секунды, как в хуке (возврат хук-дрона; первые 10 с трека почти тишина, по Cowork п. 14), в конце затухание.
// Использование: node scripts/long-music.mjs
import { spawnSync } from "node:child_process";

const M = "../material for chanel 2";
const TR = { M2: [`${M}/M2.mp3`, -11.5], M3: [`${M}/M3.mp3`, -15.5], SP: ["../sounds/Court and Page - Silent Partner.mp3", -8.9] };
const END = 555;
// [трек, начало в ролике, сек. от трека, длительность, поправка дБ, fade-in, fade-out]
const SEG = [
  ["M3", 0, 10, 86.5, 0, 1.0, 3],
  ["M2", 83.5, 15, 187.4, 0, 3, 3],
  ["M3", 267.9 - 3, 85, 87.6, 0, 3, 3],
  ["SP", 349.5 - 3, 20, 101.3, 1, 3, 3],
  ["M3", 447.8 - 3, 10, END - 447.8 + 3, 0, 3, 5],
];
const fl = [];
SEG.forEach(([t, at, off, d, g, fi, fo], i) => {
  const [, lufs] = TR[t];
  const gain = -22 - lufs + g;
  fl.push(`[${i}:a]atrim=${off}:${off + d},asetpts=N/SR/TB,volume=${gain.toFixed(2)}dB,afade=t=in:d=${fi},afade=t=out:st=${(d - fo).toFixed(2)}:d=${fo},aresample=44100,aformat=channel_layouts=stereo,adelay=${Math.round(at * 1000)}:all=1[a${i}]`);
});
const fc = `${fl.join(";")};${SEG.map((_, i) => `[a${i}]`).join("")}amix=inputs=${SEG.length}:normalize=0,alimiter=limit=0.9[o]`;
const args = ["-v", "error", "-y"];
SEG.forEach(([t]) => args.push("-i", TR[t][0]));
args.push("-filter_complex", fc, "-map", "[o]", "-t", String(END), "-b:a", "192k", "public/ch2-01/music-bed.mp3");
const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
if (r.status !== 0) throw new Error(r.stderr);
const e = spawnSync("ffmpeg", ["-hide_banner", "-i", "public/ch2-01/music-bed.mp3", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
console.log("bed:", /I:\s+(-?[\d.]+) LUFS/g.exec(e.slice(e.lastIndexOf("Integrated"))) ?? e.slice(-300));

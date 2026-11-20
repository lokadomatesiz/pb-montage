// SH2: vo.mp3 = vo_sh2_001 + 0,22 с + вопрос; words.json — границы фраз по silencedetect (−38 дБ), внутри фразы слова пропорционально буквам.
// Использование: node scripts/sh2-voice.mjs
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const M = "../material for chanel 2/vertical/sh2";
const OUT = "public/ch2-01-sh2";
const GAP = 0.22;
const sh = (args) => spawnSync("ffmpeg", args, { encoding: "utf8" });

const r = sh(["-v", "error", "-y", "-i", `${M}/vo_sh2_001.mp3`, "-i", `${M}/vo_question_sh2_001.mp3`, "-filter_complex", `[0:a]apad=pad_dur=${GAP}[a];[a][1:a]concat=n=2:v=0:a=1[o]`, "-map", "[o]", "-ar", "44100", "-b:a", "192k", `${OUT}/vo.mp3`]);
if (r.status !== 0) throw new Error(r.stderr);

const dur = (f) => +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout;
const d1 = dur(`${M}/vo_sh2_001.mp3`);
const qStart = d1 + GAP;
const sd = sh(["-hide_banner", "-i", `${M}/vo_question_sh2_001.mp3`, "-af", "silencedetect=noise=-38dB:d=0.1", "-f", "null", "-"]).stderr;
const qs = [...sd.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
const qe = [...sd.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
const qDur = dur(`${M}/vo_question_sh2_001.mp3`);
const qFrom = qe[0] !== undefined && qs[0] < 0.05 ? qe[0] : 0;
const qTo = qs.find((s) => s > qFrom + 0.3) ?? qDur;

// фразы: [текст, начало, конец]; границы — из silencedetect озвучки (сек)
const P = [
  ["A este cura le tocó averiguar qué era un volcán…", 0.0, 2.971],
  ["con un libro de la biblioteca de su iglesia.", 3.373, 5.764],
  ["Michoacán,", 6.288, 7.053],
  ["mil novecientos cuarenta y tres.", 7.297, 9.157],
  ["Unos hombres vuelven del campo con una noticia:", 9.651, 12.379],
  ["hay piedras al rojo vivo.", 12.813, 14.805],
  ["Y un agujero que crece.", 15.19, 16.852],
  ["No hay nadie a quién preguntar.", 17.241, 18.928],
  ["El cura busca en la biblioteca.", 19.281, 21.002],
  ["Encuentra un libro sobre el Vesubio.", 21.301, 23.24],
  ["Lo lee.", 23.59, 24.116],
  ["Y lo entiende:", 24.498, 25.502],
  ["es un volcán.", 25.901, 27.174],
  ["Esa misma noche,", 27.563, 28.673],
  ["el agujero ya escupía fuego.", 28.836, 30.878],
  ["Seis días después medía ciento sesenta y siete metros.", 31.3, 35.04, [[31.3, 31.55], [31.56, 31.94], [32.06, 32.4], [32.5, 32.88], [33.06, 33.28], [33.32, 33.78], [33.84, 33.9], [33.9, 34.28], [34.36, 35.04]]], // по огибающей RMS (шаг 10 мс)
  ["¿Tú lo habrías adivinado?", qStart + qFrom, qStart + qTo],
];
const words = [];
for (const [text, s, e, exact] of P) {
  const ws = text.split(" ");
  if (exact) {
    ws.forEach((x, i) => words.push({ text: x, startMs: Math.round(exact[i][0] * 1000), endMs: Math.round(exact[i][1] * 1000), timestampMs: Math.round(((exact[i][0] + exact[i][1]) / 2) * 1000), confidence: null }));
    continue;
  }
  const w = ws.map((x) => x.replace(/[^\p{L}\p{N}]/gu, "").length + 1);
  const tot = w.reduce((a, b) => a + b, 0);
  let t = s;
  ws.forEach((x, i) => {
    const d = ((e - s) * w[i]) / tot;
    words.push({ text: x, startMs: Math.round(t * 1000), endMs: Math.round((t + d) * 1000), timestampMs: Math.round((t + d / 2) * 1000), confidence: null });
    t += d;
  });
}
fs.writeFileSync(`${OUT}/words.json`, JSON.stringify(words, null, 1));
console.log("слов", words.length, "голос до", ((words.at(-1).endMs) / 1000).toFixed(2), "с; файл", dur(`${OUT}/vo.mp3`).toFixed(2), "с; вопрос", qStart.toFixed(2), qFrom, qTo);

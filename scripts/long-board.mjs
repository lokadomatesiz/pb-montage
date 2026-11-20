// Раскадровка длинного → листы кадров по главам (work/long/board-*.jpg) + STORYBOARD.md. Графика (@…) — серая плашка с названием.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const board = JSON.parse(fs.readFileSync("scripts/long-board.json", "utf8"));
const MAT = "../material for chanel 2";
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const esc = (s) => s.replace(/★/g, "*").replace(/→/g, "-").replace(/≈/g, "~").replace(/≤/g, "<").replace(/≥/g, ">").replace(/×/g, "x").replace(/[\\':%,;\[\]]/g, " ");
const ff = (a) => {
  const r = spawnSync("ffmpeg", a, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr.slice(-400));
};
fs.mkdirSync("work/long/tiles", { recursive: true });
const md = ["# Раскадровка ch2-01 «Paricutín» (длинное) — Claude Code, 30.10.2026", "", "Тайминги — по ускоренной озвучке (+6 %, 539,4 с) и карте фраз `montage/public/ch2-01/voice-map.json`. ★ — ключевые, @ — графика шаблона (рисуется в Remotion). После озвучки 15–20 с чистого кадра под конечную заставку.", "Версия 2 (30.10): применены правки Cowork из блока «Правки для Claude Code» — п. 1–14. Листы кадров: `_review/storyboard/board-0…6.jpg` (подпись: «мин.сек», длина плана, файл; 5.49 = 5:49). Планы длиннее ≈ 6 с поделены на два кропа одного кадра (кроссфейд 0,3 с), хук ≤ 2,5 с на план.", ""];
let n = 0;
board.chapters.forEach((ch, ci) => {
  md.push(`## ${ch.name}`, "", "| с | кадр | что на экране / текст |", "|---|---|---|");
  const tiles = [];
  ch.shots.forEach(([t, src, note], si) => {
    const end = ch.shots[si + 1]?.[0] ?? (ci === board.chapters.length - 1 ? 539.4 : board.chapters[ci + 1].shots[0][0]);
    const out = `work/long/tiles/t${String(n++).padStart(3, "0")}.png`;
    const label = `${mmss(t).replace(":", ".")}  ${(end - t).toFixed(1)}s  ${esc(src.replace("@", "G-"))}`;
    const dt = `drawbox=x=0:y=0:w=iw:h=34:color=black@0.7:t=fill,drawtext=fontfile=work/long/osw.ttf:text='${label}':x=8:y=6:fontsize=22:fontcolor=white`;
    const sc = "scale=384:216:force_original_aspect_ratio=increase,crop=384:216";
    if (src.startsWith("@")) ff(["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x3a3a3c:s=384x216", "-vf", `${dt},drawtext=fontfile=work/long/osw.ttf:text='${esc(note.slice(0, 30))}':x=(w-text_w)/2:y=100:fontsize=22:fontcolor=0xE8590C`, "-frames:v", "1", out]);
    else if (/\.mp4$/.test(src)) ff(["-v", "error", "-y", "-ss", "2", "-i", `${MAT}/${src}`, "-vf", `${sc},${dt}`, "-frames:v", "1", out]);
    else ff(["-v", "error", "-y", "-i", `${MAT}/${src}`, "-vf", `${sc},${dt}`, "-frames:v", "1", out]);
    tiles.push(out);
    md.push(`| ${mmss(t)} (${(end - t).toFixed(1)} с) | ${src.startsWith("@") ? "графика " + src : src} | ${note} |`);
  });
  md.push("");
  const cols = 4;
  const args = ["-v", "error", "-y"];
  tiles.forEach((f) => args.push("-i", f));
  const parts = tiles.map((_, i) => `[${i}:v]`).join("");
  const layout = tiles.map((_, i) => `${(i % cols) * 384}_${Math.floor(i / cols) * 216}`).join("|");
  args.push("-filter_complex", tiles.length > 1 ? `${parts}xstack=inputs=${tiles.length}:layout=${layout}:fill=black` : "[0:v]copy", "-frames:v", "1", `work/long/board-${ci}.jpg`);
  ff(args);
});
fs.writeFileSync("../production/ch2-01-paricutin/STORYBOARD.md", md.join("\n"));
console.log("ok", n, "кадров");

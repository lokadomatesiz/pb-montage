// Длинное ch2-01: субтитры ES отдельным файлом из words.json (не вшитые). Страницы ≤ 2 строк по ≤ 42 знака, ≤ 6 с, не рвутся через . ? ! … : — как правила страниц шортсов.
// Использование: node scripts/long-srt.mjs → public/ch2-01/ch2-01.es.srt
import fs from "node:fs";
const words = JSON.parse(fs.readFileSync("public/ch2-01/words.json", "utf8"));
const SERVICE = new Set("a al de del en el la los las un una y e o u que por con se le les lo su sus para sin cada sobre entre desde hasta tú".split(" "));
const clean = (s) => s.trim().toLowerCase().replace(/[.,;:¿?¡!…«»]/g, "");
const ends = (w) => /[.?!…:]["»]?$/.test(w.text.trim());
const tc = (ms) => {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), x = Math.round(ms % 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(x).padStart(3, "0")}`;
};
const cues = [];
let cur = [];
const flush = () => {
  if (!cur.length) return;
  const txt = cur.map((w) => w.text.trim()).join(" ");
  // две строки: делим по ближайшему к середине пробелу
  let out = txt;
  if (txt.length > 42) {
    const mid = txt.length / 2;
    let best = -1;
    for (let i = 0; i < txt.length; i++) if (txt[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    out = txt.slice(0, best) + "\n" + txt.slice(best + 1);
  }
  cues.push({ a: cur[0].startMs, b: cur[cur.length - 1].endMs, t: out });
  cur = [];
};
for (let i = 0; i < words.length; i++) {
  const w = words[i];
  cur.push(w);
  const len = cur.map((x) => x.text.trim()).join(" ").length;
  const dur = w.endMs - cur[0].startMs;
  const next = words[i + 1];
  const tooLong = next && (len + next.text.trim().length + 1 > 80 || dur > 5500);
  if (ends(w) || tooLong || (next && next.ch !== w.ch)) {
    // служебное слово не остаётся в конце страницы
    while (cur.length > 2 && !ends(w) && SERVICE.has(clean(cur[cur.length - 1].text))) {
      i--;
      cur.pop();
    }
    flush();
  }
}
flush();
// минимальная длительность 0,6 с: растягиваем до следующей реплики, но не за её начало
cues.forEach((c, i) => {
  const lim = cues[i + 1] ? cues[i + 1].a - 40 : c.b + 1000;
  if (c.b - c.a < 600) c.b = Math.min(lim, c.a + 600);
});
fs.writeFileSync("public/ch2-01/ch2-01.es.srt", cues.map((c, i) => `${i + 1}\n${tc(c.a)} --> ${tc(c.b)}\n${c.t}\n`).join("\n"));
console.log("реплик", cues.length);

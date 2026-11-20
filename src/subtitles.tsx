import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, T } from "./tokens";

// Субтитры шортса (VISUAL-CH2 §9): Oswald 600 капс, кость, текущее слово лава, обводка carbon 7 px,
// строка по центру на 71 % высоты, 84 px (до 66 px при нехватке места).
export type Word = { text: string; startMs: number; endMs: number };
type Page = { words: Word[]; startMs: number; endMs: number; fixed?: boolean };

const SERVICE = new Set("a al de del en el la los las un una y e o u que por con se le les lo su sus para sin cada sobre entre desde hasta tú".split(" "));
const clean = (s: string) => s.trim().toLowerCase().replace(/[.,;:¿?¡!…]/g, "");
const NUM = new Set("uno una dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince veinte treinta cuarenta cincuenta sesenta setenta ochenta noventa cien ciento doscientos trescientos mil novecientos millón millones".split(" "));
const UNIT = new Set("metros metro días día años año km m segundos horas".split(" "));
const isNum = (w: Word) => NUM.has(clean(w.text));
// между словами числа и между числом и единицей страницу не рвём
const glued = (a: Word, b: Word) => (isNum(a) && isNum(b)) || (isNum(a) && UNIT.has(clean(b.text))) || (clean(a.text) === "y" && isNum(b)) || (isNum(a) && clean(b.text) === "y");
const MAX_W = 1080 * 0.84;

let ctx: CanvasRenderingContext2D | null = null;
const widthAt = (text: string, size: number) => {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = `600 ${size}px ${FONT.oswald}`;
  return ctx.measureText(text.toUpperCase()).width + size * 0.01 * text.length;
};
const fits = (ws: Word[]) => widthAt(ws.map((w) => w.text.trim()).join(" "), 66) <= MAX_W;
const endsSentence = (w: Word) => /[.?…!]$/.test(w.text.trim()) || /:$/.test(w.text.trim());

export const buildPages = (words: Word[], manual: Record<string, string[]> = {}): Page[] => {
  const sentences: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (endsSentence(w)) {
      sentences.push(cur);
      cur = [];
    }
  }
  if (cur.length) sentences.push(cur);

  const pages: Page[] = [];
  const norm = (t: string) => t.toLowerCase().replace(/[.,;:¿?¡!…]/g, "").replace(/\s+/g, " ").trim();
  for (const s of sentences) {
    // ручные страницы: фраза целиком совпала с ключом и число слов сходится
    const spec = manual[norm(s.map((w) => w.text).join(" "))];
    if (spec && spec.reduce((n, p) => n + p.trim().split(/\s+/).length, 0) === s.length) {
      let k = 0;
      for (const pg of spec) {
        const n = pg.trim().split(/\s+/).length;
        pages.push({ words: s.slice(k, k + n), startMs: s[k].startMs, endMs: s[k + n - 1].endMs, fixed: true });
        k += n;
      }
      continue;
    }
    let i = 0;
    while (i < s.length) {
      let j = i + 1;
      while (j < s.length && j - i < 4 && fits(s.slice(i, j + 1))) j++;
      // служебные слова не остаются в конце страницы — уходят на следующую (все подряд)
      while (j - i > 1 && j < s.length && (SERVICE.has(clean(s[j - 1].text)) || glued(s[j - 1], s[j]))) j--;
      // хвост из одного слова приклеиваем, если вместе умещается
      if (s.length - j === 1 && fits(s.slice(i, j + 1))) j++;
      pages.push({ words: s.slice(i, j), startMs: s[i].startMs, endMs: s[j - 1].endMs });
      i = j;
    }
  }
  // страницы короче 0,4 с склеиваем с предыдущей, если умещаются
  const out: Page[] = [];
  for (const p of pages) {
    const prev = out[out.length - 1];
    if (prev && !prev.fixed && !p.fixed && p.endMs - p.startMs < 400 && !endsSentence(prev.words[prev.words.length - 1]) && fits([...prev.words, ...p.words])) {
      prev.words = [...prev.words, ...p.words];
      prev.endMs = p.endMs;
    } else out.push({ ...p });
  }
  return out;
};

export const Subtitles: React.FC<{ words: Word[]; untilMs: number; noLava?: { from: number; to: number }[]; manual?: Record<string, string[]> }> = ({ words, untilMs, noLava = [], manual }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = useMemo(() => buildPages(words, manual), [words, manual]);
  const nowMs = (frame / fps) * 1000;
  if (nowMs >= untilMs) return null;
  const idx = pages.findIndex((p, i) => nowMs >= p.startMs && nowMs < Math.min(pages[i + 1]?.startMs ?? Infinity, p.endMs + 600));
  if (idx < 0) return null;
  const page = pages[idx];
  const text = page.words.map((w) => w.text.trim()).join(" ");
  let size = 84;
  const w84 = widthAt(text, 84);
  if (w84 > MAX_W) size = Math.max(62, Math.floor((84 * MAX_W) / w84));
  const sec = nowMs / 1000;
  const dark = noLava.some((r) => sec >= r.from && sec < r.to); // кадр с лавой: акцент — кость, остальные слова — пепел
  const activeIdx = page.words.reduce((a, w, i) => (nowMs >= w.startMs ? i : a), 0);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1363, transform: "translateY(-50%)", textAlign: "center", whiteSpace: "nowrap" }}>
      <span style={{ fontFamily: FONT.oswald, fontWeight: 600, fontSize: size, lineHeight: 1.1, textTransform: "uppercase", letterSpacing: size * 0.01, WebkitTextStroke: `7px ${T.carbon}`, paintOrder: "stroke fill", textShadow: `0 4px 18px ${T.carbon}99` }}>
        {page.words.map((w, i) => (
          <span key={i} style={{ color: i === activeIdx ? (dark ? T.hueso : T.lava) : dark ? T.cenizaClara : T.hueso }}>
            {i ? " " : ""}
            {w.text.trim()}
          </span>
        ))}
      </span>
    </div>
  );
};

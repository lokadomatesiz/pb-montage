import type { ShortProps } from "./Short";

// CH2-01-SH2 · «EL CURA Y EL LIBRO». Пакет: production\ch2-01-sh2-cura\PACKAGE.md. Стиль: VISUAL-CH2.md. Черновик 3.
// Тайминги ниже — по исходной озвучке vo.mp3 = vo_sh2_001 (35,24 с) + 0,22 с + вопрос (обрыв на «adivinado»); внизу — карта в ускоренную озвучку (+6 %, решение автора 30.10). Слова: границы фраз по silencedetect, внутри — по буквам.
// v30c: знак «Veo» справа внизу и икона слева у края прячутся кропом ×1,14 от центра; берём окно клипа с 2,0 с (конец — пустая светящаяся страница — не показываем).
// ИИ-кадры метки не получают; FOTO REAL — только на A1 (год в источнике неизвестен → без года).
const sh2Old: ShortProps = {
  folder: "ch2-01-sh2",
  voice: "vo.mp3",
  captions: "words.json",
  tailSec: 0.15,
  subtitlePages: {
    "seis días después medía ciento sesenta y siete metros": ["Seis días después medía", "Ciento sesenta y siete metros."],
    "michoacán mil novecientos cuarenta y tres": ["Michoacán,", "Mil novecientos", "Cuarenta y tres."],
  },
  clips: [
    // кадр 0 в движении: священник листает книгу при свече (v30c, окно 2,0–5,5 с)
    { src: "v30c.mp4", at: 0, grade: "recreacion", startFromSec: 2.0, motion: { scale: [1.14, 1.2], origin: "50% 45%" } },
    // «…con un libro de la biblioteca de su iglesia»
    { src: "v30.jpg", at: 3.37, grade: "recreacion", crossfadeSec: 0.3, motion: { scale: [1.0, 1.1], origin: "30% 70%" } },
    // «Michoacán, mil novecientos cuarenta y tres» → площадь у церкви, дым на горизонте
    { src: "v14b.jpg", at: 6.29, grade: "recreacion", crossfadeSec: 0.3, motion: { scale: [1.0, 1.1], origin: "50% 70%" } },
    // «Unos hombres vuelven del campo con una noticia» → другой дубль, наезд к дыму
    { src: "v14b.1.jpg", at: 9.65, grade: "recreacion", crossfadeSec: 0.25, motion: { scale: [1.0, 1.1], origin: "40% 30%" } },
    // «…piedras al rojo vivo. Y un agujero que crece» → V13v (из SH1), ✦ справа внизу прячем кропом
    { src: "v13v.mp4", at: 12.81, grade: "recreacion", crossfadeSec: 0.3, motion: { scale: [1.18, 1.24], origin: "0% 100%" } },
    // «No hay nadie a quién preguntar. El cura busca en la biblioteca»
    { src: "v30.1.jpg", at: 17.24, grade: "recreacion", crossfadeSec: 0.3, motion: { scale: [1.0, 1.12], origin: "50% 40%" } },
    // «Encuentra un libro sobre el Vesubio. Lo lee» → книга с гравюрой
    { src: "v14c.1.jpg", at: 21.3, grade: "recreacion", crossfadeSec: 0.3, caption: { text: "VESUBIO", x: 600, y: 1655, rotate: -8, size: 64, from: 22.81, to: 24.45 }, motion: { scale: [1.0, 1.1], origin: "60% 50%" } },
    // «Y lo entiende: es un volcán» → гравюра целиком, вспышка на входе
    { src: "v14c.jpg", at: 24.5, grade: "recreacion", crossfadeSec: 0.2, motion: { scale: [1.04, 1.16], origin: "50% 40%" } },
    // «Esa misma noche, el agujero ya escupía fuego» → V15v (из SH1), окно до ≈ 2,2 с, замедление 0,62
    { src: "v15v.mp4", at: 27.56, grade: "recreacion", crossfadeSec: 0.3, nightLava: true, rate: 0.62, bottomShade: 0.85, motion: { scale: [1.18, 1.24], origin: "0% 100%" } },
    // «Seis días después… 167 metros» → A1 (настоящее фото), держится до вопроса
    { src: "A1.jpg", at: 31.13, grade: "archivo", crossfadeSec: 0.3, focus: "50% 40%", motion: { scale: [1.07, 1.13], origin: "50% 40%" } },
  ],
  overlays: [
    // хук (кадр 0, верхняя треть)
    { at: 0, until: 2.0, el: { k: "hook", text: "¿QUÉ ES UN VOLCÁN?", fast: true } },
    // книга → вспышка
    { at: 24.4, until: 24.75, el: { k: "flash" } },
    // A1: метка + 167 M (счёт 0 → 167 за 0,8 с, доходит до 167 на слове «siete» ≈ 33,95 с)
    { at: 33.1, until: 37.4, el: { k: "big", text: "167 M", sub: "EN 6 DÍAS", top: 310, countTo: 167, unit: "M", countFrom: 33.15, countSec: 0.8 } },
    { at: 31.3, until: 37.4, el: { k: "label", text: "FOTO REAL", source: "Smithsonian Institution Archives" } },
  ],
  sfx: [
    { src: "sfx/candle-room.mp3", at: 0.1, volumeDb: -22, durSec: 6.0, fadeSec: 0.8 },
    { src: "sfx/church-bell-distant.mp3", at: 3.6, volumeDb: -24, durSec: 3.2, fadeSec: 0.8 },
    { src: "sfx/crowd-murmur.mp3", at: 6.3, volumeDb: -26, durSec: 3.4, fadeSec: 0.6 },
    { src: "sfx/ground-rumble.mp3", at: 12.9, volumeDb: -20, durSec: 4.0, fadeSec: 0.8 },
    // суб-удар на «volcán»: атака на 0,1 с раньше слова
    { src: "sfx/sub-boom.wav", at: 26.35, volumeDb: -9 },
    { src: "sfx/eruption-night.mp3", at: 27.6, volumeDb: -16, durSec: 3.5, fadeSec: 0.5 },
    // суб-удар на «ciento sesenta y siete»
    { src: "sfx/sub-boom.wav", at: 33.85, volumeDb: -9 },
  ],
  music: {
    src: "music.mp3",
    volumeDb: -22,
    fadeInSec: 1,
    duck: [
      { from: 26.15, to: 27.0, floor: 0.15, fadeSec: 0.15 },
      { from: 33.65, to: 34.5, floor: 0.15, fadeSec: 0.15 },
    ],
  },
};

// ── ускорение озвучки (решение автора 30.10): паузы > 0,3 с → 0,28 с, rubberband +6 % ──
// Карта старое → новое: public/ch2-01-sh2/vo-fast-map.json (паузы — оттуда же).
const PAUSES: [number, number][] = [[2.971, 3.373], [5.764, 6.288], [9.157, 9.651], [12.379, 12.813], [14.798, 15.19], [16.852, 17.241], [18.928, 19.281], [20.997, 21.301], [23.24, 23.595], [24.116, 24.498], [25.502, 25.901], [27.162, 27.563], [35.078, 35.611]];
const KEEP = 0.28;
const TEMPO = 1.06;
const T = (t: number) => {
  let cut = 0;
  for (const [s, e] of PAUSES) {
    if (t >= e) cut += e - s - KEEP;
    else if (t > s + KEEP) {
      cut += t - (s + KEEP);
      break;
    }
  }
  return +((t - cut) / TEMPO).toFixed(3);
};

// счётчик: конец счёта — на слове «siete», длительность счёта остаётся 0,8 с (по правке Cowork), а не сжимается на 6 %
const mapEl = (el: ShortProps["overlays"][number]["el"]): ShortProps["overlays"][number]["el"] => {
  if (el.k === "big" && el.countFrom !== undefined) {
    const sec = el.countSec ?? 1.4;
    return { ...el, countFrom: T(el.countFrom + sec) - sec, countSec: sec };
  }
  return el;
};

export const sh2: ShortProps = {
  ...sh2Old,
  voice: "vo-fast.mp3",
  captions: "words-fast.json",
  clips: sh2Old.clips.map((c) => ({ ...c, at: T(c.at), caption: c.caption && { ...c.caption, from: T(c.caption.from), to: T(c.caption.to) } })),
  overlays: sh2Old.overlays.map((o) => ({ at: T(o.at), until: T(o.until), el: mapEl(o.el) })),
  sfx: sh2Old.sfx.map((x) => ({ ...x, at: T(x.at) })),
  music: sh2Old.music && { ...sh2Old.music, duck: sh2Old.music.duck?.map((d) => ({ ...d, from: T(d.from), to: T(d.to) })) },
};

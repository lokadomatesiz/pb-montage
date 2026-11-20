import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Easing, Img, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { ElView, El } from "./elements";
import { Film, Scratches } from "./film";
import { Subtitles, Word } from "./subtitles";
import { FONT, FPS, T } from "./tokens";

// Шаблон шортса канала 2 «Pueblos Borrados» (1080×1920, 30 fps). Правила: RULES-CH2.md + VISUAL-CH2.md.

export type Grade = "archivo" | "recreacion" | "hoy" | "none";

export type Clip = {
  /** файл в public/<folder>/; для fit: "ash" не нужен */
  src?: string;
  /** начало плана, сек от старта озвучки */
  at: number;
  grade: Grade;
  /** cover — на весь кадр; sheet — по ширине кадра (верх на `top` px) поверх размытой копии; ash — фон carbon с пеплом (B11) */
  fit?: "cover" | "sheet" | "ash";
  top?: number;
  focus?: string;
  /** панорама: object-position по X от первого значения ко второму за план, % */
  pan?: [number, number];
  motion?: { scale: [number, number]; origin?: string };
  /** кроссфейд входа, сек (кадр проявляется до своего `at`) */
  crossfadeSec?: number;
  startFromSec?: number;
  /** скорость видео (0,62 — замедление) */
  rate?: number;
  /** затемнение низа кадра: непрозрачность carbon к самому низу (прячет мелкие артефакты клипа) */
  bottomShade?: number;
  /** пока на плане лава, текст без лавы */
  nightLava?: boolean;
  /** «напечатанная» надпись на кадре (едет и масштабируется вместе с кадром): x, y — центр в координатах 1080×1920 до масштаба; from/to — сек от старта озвучки */
  caption?: { text: string; x: number; y: number; rotate?: number; size?: number; from: number; to: number };
};

export type Overlay = { at: number; until: number; el: El };
export type Sfx = { src: string; at: number; volumeDb: number; durSec?: number; fadeSec?: number };

export type ShortProps = {
  folder: string;
  voice: string;
  captions: string;
  music?: { src: string; volumeDb: number; fadeInSec?: number; duck?: { from: number; to: number; floor: number; fadeSec: number }[] };
  sfx: Sfx[];
  clips: Clip[];
  overlays: Overlay[];
  /** хвост после последнего слова, сек */
  tailSec: number;
  /** ручные страницы субтитров: фраза (без знаков, нижний регистр) → страницы */
  subtitlePages?: Record<string, string[]>;
  voiceSec?: number;
  words?: Word[];
};

export const calculateShortMetadata: CalculateMetadataFunction<ShortProps> = async ({ props }) => {
  const voiceSec = await getAudioDurationInSeconds(staticFile(`${props.folder}/${props.voice}`));
  const words: Word[] = await fetch(staticFile(`${props.folder}/${props.captions}`)).then((r) => r.json());
  return { durationInFrames: Math.ceil((voiceSec + props.tailSec) * FPS), props: { ...props, voiceSec, words } };
};

const db = (x: number) => Math.pow(10, x / 20);
const isVideo = (s: string) => /\.(mp4|mov|webm)$/i.test(s);
const hex2 = (a: number) => Math.round(a * 255).toString(16).padStart(2, "0");

const FILTER: Record<Grade, string> = {
  // архив: дуотон carbon-коричневый → hueso (SVG-фильтр ниже), контраст 1,06
  archivo: "url(#duo-archivo) contrast(1.06)",
  // recreación: насыщенность 0,78, контраст 1,06, тёплый сдвиг
  recreacion: "saturate(0.78) contrast(1.06) sepia(0.1)",
  hoy: "saturate(0.7) contrast(1.04)",
  none: "none",
};

const Defs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      <filter id="duo-archivo" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.094 0.933" />
          <feFuncG type="table" tableValues="0.067 0.902" />
          <feFuncB type="table" tableValues="0.055 0.847" />
        </feComponentTransfer>
      </filter>
    </defs>
  </svg>
);

/** B11 · фон carbon с пеплом: плывёт по диагонали, ≤ 15–20 % площади; тёплое свечение у основания. */
const Ash: React.FC = () => {
  const f = useCurrentFrame();
  const flakes = Array.from({ length: 70 }, (_, i) => {
    const sp = 40 + random(`as${i}`) * 60; // px/с
    const x0 = random(`ax${i}`) * 1500 - 200;
    const y0 = random(`ay${i}`) * 2200 - 150;
    const x = ((((x0 + sp * 0.55 * (f / FPS)) % 1500) + 1500) % 1500) - 200;
    const y = ((((y0 + sp * (f / FPS)) % 2200) + 2200) % 2200) - 150;
    return { x, y, r: 1.5 + random(`ar${i}`) * 4.5, o: 0.14 + random(`ao${i}`) * 0.34 };
  });
  return (
    <AbsoluteFill style={{ backgroundColor: T.carbon }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 66% 62%, ${T.brasa}59 0%, ${T.carbon}00 58%)` }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {flakes.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={T.cenizaClara} opacity={p.o} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/** Надпись «чернилами» на бумаге кадра: проявляется за 0,25 с, уходит за 0,1 с до `to`. */
const PrintedCaption: React.FC<{ c: NonNullable<Clip["caption"]>; sec: number }> = ({ c, sec }) => {
  const a = Math.min(interpolate(sec, [c.from, c.from + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), interpolate(sec, [c.to - 0.1, c.to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{ position: "absolute", left: c.x - 500, width: 1000, top: c.y - 50, height: 100, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${c.rotate ?? 0}deg)`, opacity: 0.82 * a, mixBlendMode: "multiply", fontFamily: FONT.cinzel, fontWeight: 700, fontSize: c.size ?? 64, letterSpacing: 10, color: "#3d2a1a", whiteSpace: "nowrap" }}>
      {c.text}
    </div>
  );
};

const ClipView: React.FC<{ clip: Clip; dur: number; fade: number; folder: string; startF: number }> = ({ clip, dur, fade, folder, startF }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  const m = clip.motion ?? { scale: [1.0, 1.08] };
  const scale = m.scale[0] + (m.scale[1] - m.scale[0]) * t;
  const opacity = fade ? interpolate(f, [0, fade], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  if (clip.fit === "ash") {
    return (
      <AbsoluteFill style={{ opacity }}>
        <Ash />
      </AbsoluteFill>
    );
  }

  // дрожание кадра ≤ 1 px только у архива
  const jx = clip.grade === "archivo" ? (random(`jx${f}`) - 0.5) * 2 : 0;
  const jy = clip.grade === "archivo" ? (random(`jy${f}`) - 0.5) * 2 : 0;
  const src = staticFile(`${folder}/${clip.src}`);
  const media = (style: React.CSSProperties) =>
    isVideo(clip.src!) ? (
      <OffthreadVideo src={src} muted startFrom={Math.round((clip.startFromSec ?? 0) * FPS)} playbackRate={clip.rate ?? 1} style={style} />
    ) : (
      <Img src={src} style={style} />
    );
  const px = clip.pan ? clip.pan[0] + (clip.pan[1] - clip.pan[0]) * t : undefined;
  const pos = px !== undefined ? `${px}% 50%` : clip.focus ?? "50% 50%";
  const shade = clip.bottomShade ? (
    <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${T.carbon}00 64%, ${T.carbon}${hex2(clip.bottomShade)} 80%, ${T.carbon}${hex2(clip.bottomShade)} 100%)` }} />
  ) : null;

  if (clip.fit === "sheet") {
    // лист по ширине поверх размытой копии (VISUAL §10): архивное фото без пустых полей
    return (
      <AbsoluteFill style={{ opacity, backgroundColor: T.carbon, overflow: "hidden" }}>
        {media({ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: `blur(30px) brightness(0.5) ${FILTER[clip.grade]}`, transform: "scale(1.3)" })}
        <div style={{ position: "absolute", left: 0, top: clip.top ?? 557, width: 1080, transform: `scale(${scale})`, transformOrigin: m.origin ?? "50% 50%" }}>
          {media({ width: 1080, display: "block", filter: FILTER[clip.grade], transform: `translate(${jx}px, ${jy}px)` })}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: T.carbon, overflow: "hidden" }}>
      {clip.caption ? (
        <AbsoluteFill style={{ transform: `translate(${jx}px, ${jy}px) scale(${scale})`, transformOrigin: m.origin ?? "50% 50%" }}>
          {media({ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, filter: FILTER[clip.grade] })}
          <PrintedCaption c={clip.caption} sec={(startF + f) / FPS} />
        </AbsoluteFill>
      ) : (
        media({ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, filter: FILTER[clip.grade], transform: `translate(${jx}px, ${jy}px) scale(${scale})`, transformOrigin: m.origin ?? "50% 50%" })
      )}
      {shade}
    </AbsoluteFill>
  );
};

const fadeVol = (f: number, total: number, fadeIn: number, fadeOut: number) => Math.min(1, fadeIn ? f / fadeIn : 1, fadeOut ? (total - f) / fadeOut : 1);

export const ShortTemplate: React.FC<ShortProps> = (p) => {
  const words = p.words ?? [];
  const voiceSec = p.voiceSec ?? 0;
  const noLava = p.clips.map((c, i) => (c.nightLava ? { from: c.at, to: p.clips[i + 1]?.at ?? voiceSec } : null)).filter(Boolean) as { from: number; to: number }[];

  return (
    <AbsoluteFill style={{ backgroundColor: T.carbon }}>
      <Defs />
      {p.clips.map((c, i) => {
        const startF = i === 0 ? 0 : Math.round(c.at * FPS);
        const fade = i === 0 ? 0 : Math.round((c.crossfadeSec ?? 0) * FPS);
        const endF = p.clips[i + 1] ? Math.round(p.clips[i + 1].at * FPS) : Math.ceil((voiceSec + p.tailSec) * FPS);
        const from = startF - fade;
        const dur = endF - from;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <ClipView clip={c} dur={dur} fade={fade} folder={p.folder} startF={from} />
          </Sequence>
        );
      })}

      {p.clips.map((c, i) =>
        c.grade === "archivo" ? (
          <Sequence key={`sc${i}`} from={Math.round(c.at * FPS)} durationInFrames={Math.round(((p.clips[i + 1]?.at ?? voiceSec + p.tailSec) - c.at) * FPS)}>
            <Scratches />
          </Sequence>
        ) : null,
      )}

      <Film />

      {p.overlays.map((o, i) => {
        const from = Math.round(o.at * FPS);
        const dur = Math.max(12, Math.round((o.until - o.at) * FPS));
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <ElView el={o.el} atSec={o.at} dur={dur} />
          </Sequence>
        );
      })}

      <Subtitles words={words} untilMs={voiceSec * 1000} noLava={noLava} manual={p.subtitlePages} />

      <Audio src={staticFile(`${p.folder}/${p.voice}`)} />
      {p.music ? (
        <Audio
          src={staticFile(`${p.folder}/${p.music.src}`)}
          volume={(f) => {
            const sec = f / FPS;
            const duck = (p.music!.duck ?? []).reduce((v, d) => {
              const k = interpolate(sec, [d.from - d.fadeSec, d.from, d.to, d.to + d.fadeSec], [1, d.floor, d.floor, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return Math.min(v, k);
            }, 1);
            const end = interpolate(sec, [voiceSec + p.tailSec - 0.12, voiceSec + p.tailSec], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return db(p.music!.volumeDb) * fadeVol(f, 1e9, Math.round((p.music!.fadeInSec ?? 1) * FPS), 0) * duck * end;
          }}
        />
      ) : null}
      {p.sfx.map((s, i) => {
        const dur = s.durSec ? Math.ceil(s.durSec * FPS) : undefined;
        const fd = Math.round((s.fadeSec ?? 0.6) * FPS);
        return (
          <Sequence key={`sfx${i}`} from={Math.round(s.at * FPS)} durationInFrames={dur ?? 90} layout="none">
            <Audio src={staticFile(`${p.folder}/${s.src}`)} volume={(f) => (dur ? db(s.volumeDb) * fadeVol(f, dur, fd, fd) : db(s.volumeDb))} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

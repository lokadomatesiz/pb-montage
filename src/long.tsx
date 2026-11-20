import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Easing, Freeze, Img, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig, Audio } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { Film, Scratches, Vignette } from "./film";
import { GfxView, Gfx } from "./long-gfx";
import { FONT, T } from "./tokens";

// Шаблон длинного канала 2 «Pueblos Borrados» (1920×1080, 30 fps). Правила: RULES-CH2.md + VISUAL-CH2.md §4, §7, §8. Субтитров в кадре нет (.srt отдельным файлом).
export const LW = 1920;
export const LH = 1080;
export type LGrade = "archivo" | "recreacion" | "hoy" | "none";

export type LClip = {
  at: number;
  src?: string;
  gfx?: Gfx;
  black?: boolean;
  grade?: LGrade;
  /** sheet — по высоте кадра поверх размытой копии (портретные архивные фото) */
  fit?: "cover" | "sheet";
  pos?: [string, string]; // object-position начало → конец (панорама / наклон)
  motion?: { scale: [number, number]; origin?: string };
  crossfadeSec?: number;
  startFromSec?: number;
  rate?: number;
  videoSec?: number; // длина клипа: дальше — стоп-кадр
  bright?: number; // осветление (S2)
  shake?: number; // тряска кадра, px
};

export type LEl =
  | { k: "hook"; text: string; sub?: string }
  | { k: "clock"; date: string; place?: string; typeAtSec?: number }
  | { k: "label"; text: string; source?: string }
  | { k: "big"; text: string; sub?: string; src?: string; countTo?: number; unit?: string; countFrom?: number; countSec?: number; x?: number; top?: number; strikeAtSec?: number; strikeW?: number }
  | { k: "src"; text: string }
  | { k: "counter"; keys: [number, number][]; total: number; meters: number; dayLabel: string; sub?: string; subSec?: number }
  | { k: "circle"; cx: number; cy: number; rx: number; ry: number; text?: string; tx?: number; ty?: number }
  | { k: "plate"; text: string; hi?: string; x?: number; y?: number }
  | { k: "quote"; text: string; author: string }
  | { k: "bracket"; x: number; y0: number; y1: number; text: string }
  | { k: "final"; l1: string; l2: string };

export type LOverlay = { at: number; until: number; el: LEl };
export type LSfx = { src: string; at: number; volumeDb: number; durSec?: number; fadeSec?: number };
export type LongProps = {
  folder: string;
  voice: string;
  music?: { src: string; volumeDb: number; duck: { from: number; to: number; floor: number; fadeSec: number }[] };
  clips: LClip[];
  overlays: LOverlay[];
  sfx: LSfx[];
  totalSec: number;
  /** черновик: без зерна-наложения (быстрее рендер); финал — всегда с зерном */
  draft?: boolean;
};

export const calculateLongMetadata: CalculateMetadataFunction<LongProps> = async ({ props }) => {
  await getAudioDurationInSeconds(staticFile(`${props.folder}/${props.voice}`));
  return { durationInFrames: Math.ceil(props.totalSec * 30) };
};

/** Метаданные из public/<папка>/props.json (раскладка ролика лежит вне репозитория): длина и все props берутся из файла. */
export const calculateLongFromFile = (file: string): CalculateMetadataFunction<LongProps> => async () => {
  const p: LongProps = await fetch(staticFile(file)).then((r) => r.json());
  return { durationInFrames: Math.ceil(p.totalSec * 30), props: p };
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const db =(x: number) => Math.pow(10, x / 20);
const isVideo = (s: string) => /\.(mp4|mov|webm)$/i.test(s);
const shadow = `0 4px 14px ${T.carbon}b3`;

const FILTER: Record<LGrade, string> = {
  archivo: "url(#duo-archivo) contrast(1.06)",
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

const LClipView: React.FC<{ clip: LClip; dur: number; fade: number; folder: string }> = ({ clip, dur, fade, folder }) => {
  const f = useCurrentFrame();
  const opacity = fade ? interpolate(f, [0, fade], [0, 1], clamp) : 1;
  if (clip.black) return <AbsoluteFill style={{ backgroundColor: T.carbon, opacity }} />;
  if (clip.gfx) {
    return (
      <AbsoluteFill style={{ opacity }}>
        <GfxView spec={clip.gfx} dur={dur} folder={folder} />
      </AbsoluteFill>
    );
  }
  const t = interpolate(f, [0, dur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const m = clip.motion ?? { scale: [1.0, 1.08] };
  const scale = m.scale[0] + (m.scale[1] - m.scale[0]) * t;
  const archive = clip.grade === "archivo";
  const jx = archive ? (random(`jx${f}`) - 0.5) * 2 : clip.shake ? (random(`sx${f}`) - 0.5) * 2 * clip.shake : 0;
  const jy = archive ? (random(`jy${f}`) - 0.5) * 2 : clip.shake ? (random(`sy${f}`) - 0.5) * 2 * clip.shake : 0;
  const src = staticFile(`${folder}/${clip.src}`);
  const filter = `${FILTER[clip.grade ?? "recreacion"]}${clip.bright ? ` brightness(${clip.bright})` : ""}`;
  const vidFrames = clip.videoSec ? Math.floor((clip.videoSec / (clip.rate ?? 1) - (clip.startFromSec ?? 0)) * 30) - 2 : undefined;
  const media = (style: React.CSSProperties) => {
    if (!isVideo(clip.src!)) return <Img src={src} style={style} />;
    const v = <OffthreadVideo src={src} muted startFrom={Math.round((clip.startFromSec ?? 0) * 30)} playbackRate={clip.rate ?? 1} style={style} />;
    return vidFrames !== undefined && f >= vidFrames ? <Freeze frame={vidFrames}>{v}</Freeze> : v;
  };
  const p0 = clip.pos?.[0] ?? "50% 50%";
  const p1 = clip.pos?.[1] ?? p0;
  const [ax, ay] = p0.split(" ").map((v) => parseFloat(v));
  const [bx, by] = p1.split(" ").map((v) => parseFloat(v));
  const pos = `${ax + (bx - ax) * t}% ${ay + (by - ay) * t}%`;

  if (clip.fit === "sheet") {
    return (
      <AbsoluteFill style={{ opacity, backgroundColor: T.carbon, overflow: "hidden" }}>
        {media({ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: `blur(34px) brightness(0.5) ${FILTER[clip.grade ?? "archivo"]}`, transform: "scale(1.3)" })}
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", transform: `scale(${scale})`, transformOrigin: m.origin ?? "50% 50%" }}>
          {media({ height: "100%", display: "block", filter, transform: `translate(${jx}px, ${jy}px)` })}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: T.carbon, overflow: "hidden" }}>
      {media({ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, filter, transform: `translate(${jx}px, ${jy}px) scale(${scale})`, transformOrigin: m.origin ?? "50% 50%" })}
    </AbsoluteFill>
  );
};

// ── элементы ──
const useInOut = (dur: number, inF = 8) => {
  const f = useCurrentFrame();
  const a = Math.min(interpolate(f, [0, inF], [0, 1], clamp), interpolate(f, [dur - 6, dur], [1, 0], clamp));
  const rise = interpolate(f, [0, inF], [12, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  return { a, rise, f };
};

const ElView: React.FC<{ el: LEl; atSec: number; dur: number }> = ({ el, atSec, dur }) => {
  const { fps } = useVideoConfig();
  const { a, rise, f } = useInOut(dur, el.k === "hook" ? 4 : 8);
  const sec = atSec + f / fps;
  switch (el.k) {
    case "hook":
      return (
        <div style={{ position: "absolute", left: 96, top: 100, opacity: a, transform: `translateY(${rise}px)` }}>
          <div style={{ fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 190, lineHeight: 1, color: T.hueso, textShadow: shadow, letterSpacing: 4 }}>{el.text}</div>
          {el.sub ? <div style={{ marginTop: 8, fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 90, color: T.lava, textShadow: shadow }}>{el.sub}</div> : null}
        </div>
      );
    case "clock": {
      // B1 · часы-дата: слева сверху (x 96, y 64)
      const typeAt = el.typeAtSec ?? atSec;
      const chars = Math.max(0, Math.floor(((sec - typeAt) * fps) / 2));
      return (
        <div style={{ position: "absolute", left: 96, top: 64, opacity: a, transform: `translateY(${rise}px)` }}>
          <div style={{ fontFamily: FONT.courier, fontWeight: 700, fontSize: 54, color: T.hueso, textShadow: shadow, letterSpacing: 3, minHeight: 64 }}>{el.date.slice(0, chars)}</div>
          <div style={{ marginTop: 8, width: 150, height: 4, background: T.lava }} />
          {el.place ? <div style={{ marginTop: 10, fontFamily: FONT.oswald, fontWeight: 500, fontSize: 34, color: T.cenizaClara, letterSpacing: 4, textShadow: shadow }}>{el.place}</div> : null}
        </div>
      );
    }
    case "label": // B3 + B5: справа сверху, правый край 96 px
      return (
        <div style={{ position: "absolute", right: 96, top: 64, opacity: a, transform: `translateY(${rise}px)`, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: `${T.carbon}b8`, borderRadius: 8, padding: "8px 22px 10px 18px", fontFamily: FONT.oswald, fontWeight: 600, fontSize: 34, color: T.hueso, letterSpacing: 1 }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: T.lava }} />
            {el.text}
          </div>
          {el.source ? <div style={{ fontFamily: FONT.oswald, fontWeight: 400, fontSize: 32, color: T.hueso, background: `${T.carbon}8c`, borderRadius: 6, padding: "3px 14px 5px", textShadow: `0 2px 8px ${T.carbon}` }}>{el.source}</div> : null}
        </div>
      );
    case "big": {
      // B7 · главная цифра
      let text = el.text;
      let blur = 0;
      if (el.countTo !== undefined) {
        const from = el.countFrom ?? atSec;
        const k = interpolate(sec, [from, from + (el.countSec ?? 1.4)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        text = `${Math.round(el.countTo * k)}${el.unit ? " " + el.unit : ""}`;
        blur = k < 0.4 ? 6 : 0;
      }
      const strike = el.strikeAtSec !== undefined ? interpolate(sec, [el.strikeAtSec, el.strikeAtSec + 0.25], [0, 1], clamp) : 0;
      return (
        <div style={{ position: "absolute", left: el.x ?? 96, top: el.top ?? 230, opacity: a, transform: `translateY(${rise}px)` }}>
          <div style={{ position: "relative", fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 230, lineHeight: 1, color: T.lava, textShadow: shadow, filter: blur ? `blur(${blur}px)` : undefined, whiteSpace: "nowrap" }}>
            {text}
            {strike > 0 ? <div style={{ position: "absolute", left: -14, top: 128, height: 9, width: (el.strikeW ?? 340) * strike, background: T.hueso, transform: "rotate(-8deg)", transformOrigin: "left center", boxShadow: shadow }} /> : null}
          </div>
          {el.sub ? <div style={{ marginTop: 6, fontFamily: FONT.oswald, fontWeight: 600, fontSize: 64, color: T.hueso, textShadow: shadow, letterSpacing: 3 }}>{el.sub}</div> : null}
          {el.src ? <div style={{ marginTop: 6, fontFamily: FONT.oswald, fontWeight: 400, fontSize: 34, color: T.cenizaClara, textShadow: shadow }}>{el.src}</div> : null}
        </div>
      );
    }
    case "src": // B5 отдельной строкой: справа сверху, правый край 96 px
      return (
        <div style={{ position: "absolute", right: 96, top: 64, opacity: a, transform: `translateY(${rise}px)`, fontFamily: FONT.oswald, fontWeight: 400, fontSize: 34, color: T.hueso, background: `${T.carbon}8c`, borderRadius: 6, padding: "4px 16px 6px", textShadow: `0 2px 8px ${T.carbon}` }}>
          {el.text}
        </div>
      );
    case "counter": {
      // G5 · сквозной счётчик: день и уровень озера; справа под зоной метки (y 230), правый край 96 px
      const ks = el.keys;
      const day = ks.length ? interpolate(sec, ks.map((k) => k[0]), ks.map((k) => k[1]), clamp) : 0;
      const d = Math.round(day);
      const m = ((day * el.meters) / el.total).toFixed(1).replace(".", ",");
      const subA = el.sub ? interpolate(f, [0, 8, ((el.subSec ?? 3) - 0.3) * fps, (el.subSec ?? 3) * fps], [0, 1, 1, 0], clamp) : 0;
      return (
        <div style={{ position: "absolute", right: 96, top: 230, opacity: a, transform: `translateY(${rise}px)`, textAlign: "right" }}>
          <div style={{ display: "inline-block", background: `${T.carbon}9e`, borderRadius: 8, padding: "10px 24px 14px" }}>
            <div style={{ fontFamily: FONT.oswald, fontWeight: 600, fontSize: 50, color: T.hueso, letterSpacing: 3 }}>{`${el.dayLabel} ${d}`}</div>
            <div style={{ fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 76, lineHeight: 1.05, color: T.lava, textShadow: shadow }}>{`+${m} M`}</div>
          </div>
          {el.sub ? <div style={{ marginTop: 6, opacity: subA, fontFamily: FONT.oswald, fontWeight: 500, fontSize: 36, color: T.hueso, textShadow: shadow, letterSpacing: 2 }}>{el.sub}</div> : null}
        </div>
      );
    }
    case "circle": {
      // B4 · пометка от руки: рисуется за 9 кадров, конец не сходится на ≈ 12°
      const k = interpolate(f, [4, 13], [0, 1], clamp);
      const pts: string[] = [];
      for (let i = 0; i <= 60; i++) {
        const ang = (i / 60) * (Math.PI * 2 - 0.21) - Math.PI / 2;
        const wob = 1 + Math.sin(i * 0.5) * 0.02 + (i / 60) * 0.05;
        pts.push(`${el.cx + Math.cos(ang) * el.rx * wob},${el.cy + Math.sin(ang) * el.ry * wob}`);
      }
      const len = 6000;
      return (
        <AbsoluteFill style={{ opacity: Math.min(1, a * 2) }}>
          <svg width={LW} height={LH} style={{ position: "absolute", inset: 0 }}>
            <polyline points={pts.join(" ")} fill="none" stroke={T.lava} strokeWidth={5} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} />
            {el.text ? (
              <g opacity={k}>
                <line x1={el.cx + el.rx * 0.7} y1={el.cy - el.ry * 0.7} x2={el.tx ?? el.cx + el.rx + 60} y2={(el.ty ?? el.cy - el.ry - 40) + 10} stroke={T.lava} strokeWidth={3} />
                <text x={el.tx ?? el.cx + el.rx + 70} y={(el.ty ?? el.cy - el.ry - 40) + 12} fontFamily={FONT.oswald} fontWeight={600} fontSize={42} fill={T.hueso} stroke={T.carbon} strokeWidth={6} paintOrder="stroke" letterSpacing={2}>
                  {el.text}
                </text>
              </g>
            ) : null}
          </svg>
        </AbsoluteFill>
      );
    }
    case "plate":
      return (
        <div style={{ position: "absolute", left: el.x ?? 96, top: el.y ?? 380, opacity: a, transform: `translateY(${rise}px)`, fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 120, lineHeight: 1.05, color: T.hueso, textShadow: shadow, letterSpacing: 2, maxWidth: 1700 }}>
          {el.text}
          {el.hi ? <span style={{ color: T.lava }}>{el.hi}</span> : null}
        </div>
      );
    case "quote": {
      // B6 · цитата: фон затемнён на 45 %
      return (
        <AbsoluteFill style={{ opacity: a }}>
          <AbsoluteFill style={{ background: `${T.carbon}73` }} />
          <div style={{ position: "absolute", left: 160, right: 160, top: 300, textAlign: "center", transform: `translateY(${rise}px)` }}>
            <div style={{ fontFamily: FONT.cinzel, fontWeight: 700, fontSize: 76, lineHeight: 1.18, color: T.hueso, textShadow: shadow }}>{`«${el.text}»`}</div>
            <div style={{ margin: "30px auto 20px", width: 160, height: 4, background: T.lava }} />
            <div style={{ fontFamily: FONT.oswald, fontWeight: 500, fontSize: 38, color: T.cenizaClara, letterSpacing: 3 }}>{el.author}</div>
          </div>
        </AbsoluteFill>
      );
    }
    case "bracket": {
      const k = interpolate(f, [4, 16], [0, 1], clamp);
      return (
        <AbsoluteFill style={{ opacity: a }}>
          <svg width={LW} height={LH} style={{ position: "absolute", inset: 0 }}>
            <line x1={el.x} y1={el.y1} x2={el.x} y2={el.y1 + (el.y0 - el.y1) * k} stroke={T.hueso} strokeWidth={5} />
            <line x1={el.x - 24} y1={el.y0} x2={el.x + 24} y2={el.y0} stroke={T.hueso} strokeWidth={5} opacity={k} />
            <line x1={el.x - 24} y1={el.y1} x2={el.x + 24} y2={el.y1} stroke={T.hueso} strokeWidth={5} />
            <line x1={el.x} y1={el.y0} x2={el.x + 520} y2={el.y0} stroke={T.hueso} strokeWidth={2} strokeDasharray="14 12" opacity={0.7 * k} />
          </svg>
          <div style={{ position: "absolute", left: el.x + 40, top: (el.y0 + el.y1) / 2 - 70, fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 130, color: T.lava, textShadow: shadow, opacity: k }}>{el.text}</div>
        </AbsoluteFill>
      );
    }
    case "final":
      // B12 · финал: вопрос слева, правая половина свободна под конечную заставку
      return (
        <>
          <AbsoluteFill style={{ opacity: a, background: `linear-gradient(to right, ${T.carbon}e0 0%, ${T.carbon}b8 18%, ${T.carbon}78 34%, ${T.carbon}38 48%, ${T.carbon}14 60%, ${T.carbon}00 72%)` }} />
        <div style={{ position: "absolute", left: 96, top: 380, width: 820, opacity: a, transform: `translateY(${rise}px)` }}>
          <div style={{ fontFamily: FONT.cinzel, fontWeight: 700, fontSize: 84, lineHeight: 1.12, color: T.hueso, textShadow: shadow }}>{el.l1}</div>
          <div style={{ fontFamily: FONT.cinzel, fontWeight: 700, fontSize: 84, lineHeight: 1.12, color: T.hueso, textShadow: shadow }}>{el.l2.split(" ").slice(0, -1).join(" ")} <span style={{ color: T.lava }}>{el.l2.split(" ").slice(-1)[0]}</span></div>
        </div>
        </>
      );
  }
};

export const LongTemplate: React.FC<LongProps> = (p) => {
  const total = Math.ceil(p.totalSec * 30);
  return (
    <AbsoluteFill style={{ backgroundColor: T.carbon }}>
      <Defs />
      {p.clips.map((c, i) => {
        const startF = i === 0 ? 0 : Math.round(c.at * 30);
        const fade = i === 0 ? 0 : Math.round((c.crossfadeSec ?? 0) * 30);
        const endF = p.clips[i + 1] ? Math.round(p.clips[i + 1].at * 30) : total;
        const from = startF - fade;
        return (
          <Sequence key={i} from={from} durationInFrames={endF - from}>
            <LClipView clip={c} dur={endF - from} fade={fade} folder={p.folder} />
          </Sequence>
        );
      })}
      {p.clips.map((c, i) =>
        c.grade === "archivo" && c.src ? (
          <Sequence key={`sc${i}`} from={Math.round(c.at * 30)} durationInFrames={Math.round(((p.clips[i + 1]?.at ?? p.totalSec) - c.at) * 30)}>
            <Scratches />
          </Sequence>
        ) : null,
      )}
      {p.draft ? <Vignette /> : <Film />}
      {p.overlays.map((o, i) => {
        const from = Math.round(o.at * 30);
        const dur = Math.max(12, Math.round((o.until - o.at) * 30));
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <ElView el={o.el} atSec={o.at} dur={dur} />
          </Sequence>
        );
      })}
      <Audio src={staticFile(`${p.folder}/${p.voice}`)} />
      {p.music ? (
        <Audio
          src={staticFile(`${p.folder}/${p.music.src}`)}
          volume={(f) => {
            const sec = f / 30;
            const mu = p.music!;
            const duck = mu.duck.reduce((v, d) => Math.min(v, interpolate(sec, [d.from - d.fadeSec, d.from, d.to, d.to + d.fadeSec], [1, d.floor, d.floor, 1], clamp)), 1);
            return db(mu.volumeDb) * duck;
          }}
        />
      ) : null}
      {p.sfx.map((s, i) => {
        const dur = s.durSec ? Math.ceil(s.durSec * 30) : undefined;
        const fd = Math.round((s.fadeSec ?? 0.5) * 30);
        return (
          <Sequence key={`sfx${i}`} from={Math.round(s.at * 30)} durationInFrames={dur ?? 150} layout="none">
            <Audio src={staticFile(`${p.folder}/sfx/${s.src}`)} volume={(f) => (dur ? db(s.volumeDb) * Math.min(1, f / Math.max(1, fd), (dur - f) / Math.max(1, fd)) : db(s.volumeDb))} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

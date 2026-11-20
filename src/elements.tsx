import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, T } from "./tokens";

// Элементы шаблона канала 2 (VISUAL-CH2 §7). Время — секунды от старта озвучки; atSec — начало плашки.
export type El =
  | { k: "label"; text: string; source?: string }
  | { k: "hook"; text: string; fast?: boolean }
  | { k: "reloj"; date: string; place?: string; typeAtSec?: number; top?: number }
  | { k: "big"; text: string; sub?: string; top?: number; x?: number; size?: number; subSize?: number; countFrom?: number; countTo?: number; unit?: string; countSec?: number }
  | { k: "flash" }
  | { k: "g1"; growFrom: number; growTo: number; towerAt: number; cone: number; tower: number };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const softShadow = `0 4px 14px ${T.carbon}99`;

/** Вход: проявление + подъём 16 px за 8 кадров; выход — растворение за 6 кадров. */
const useInOut = (dur: number, inFrames = 8) => {
  const f = useCurrentFrame();
  const a = Math.min(interpolate(f, [0, inFrames], [0, 1], clamp), interpolate(f, [dur - 6, dur], [1, 0], clamp));
  const rise = interpolate(f, [0, 8], [16, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  return { a, rise, f };
};

const Shade: React.FC<{ a: number }> = ({ a }) => (
  <AbsoluteFill style={{ opacity: a, background: `linear-gradient(to bottom, ${T.carbon}a6 0%, ${T.carbon}73 22%, ${T.carbon}00 44%)` }} />
);

export const ElView: React.FC<{ el: El; atSec: number; dur: number }> = (props) => {
  const { el, dur } = props;
  const { a } = useInOut(dur, el.k === "hook" ? 4 : 8);
  return (
    <>
      {el.k === "hook" || el.k === "big" || el.k === "reloj" ? <Shade a={a} /> : null}
      <ElInner {...props} />
    </>
  );
};

const ElInner: React.FC<{ el: El; atSec: number; dur: number }> = ({ el, atSec, dur }) => {
  const { fps } = useVideoConfig();
  const { a, rise, f } = useInOut(dur, el.k === "hook" && el.fast ? 3 : 8);
  const sec = atSec + f / fps;

  switch (el.k) {
    case "label": // B3 · метка доверия, слева, зона 145–220 px; B5 · источник — строкой под меткой
      return (
        <>
        <div style={{ position: "absolute", left: 48, top: 148, opacity: a, transform: `translateY(${rise}px)`, display: "flex", alignItems: "center", gap: 14, background: `${T.carbon}b8`, borderRadius: 8, padding: "9px 22px 11px 18px", fontFamily: FONT.oswald, fontWeight: 600, fontSize: 34, color: T.hueso, letterSpacing: 1 }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: T.lava }} />
          {el.text}
        </div>
        {el.source ? <div style={{ position: "absolute", left: 52, top: 218, opacity: a, transform: `translateY(${rise}px)`, fontFamily: FONT.oswald, fontWeight: 400, fontSize: 36, color: T.cenizaClara, letterSpacing: 1, textShadow: `0 2px 8px ${T.carbon}, 0 0 16px ${T.carbon}cc` }}>{el.source}</div> : null}
        </>
      );
    case "hook":
      return (
        <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center", opacity: a, transform: `translateY(${rise}px)`, fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 124, lineHeight: 1.05, color: T.hueso, textShadow: softShadow, letterSpacing: 4 }}>
          {el.text}
        </div>
      );
    case "reloj": {
      // B1 · часы-дата: Courier Prime Bold, линия лава, место
      const typeAt = el.typeAtSec ?? atSec;
      const chars = Math.max(0, Math.floor(((sec - typeAt) * fps) / 2));
      const shown = el.date.slice(0, chars);
      return (
        <div style={{ position: "absolute", left: 0, right: 0, top: el.top ?? 410, textAlign: "center", opacity: a, transform: `translateY(${rise}px)` }}>
          <div style={{ fontFamily: FONT.courier, fontWeight: 700, fontSize: 56, color: T.hueso, textShadow: softShadow, letterSpacing: 2, minHeight: 66 }}>{shown}</div>
          <div style={{ margin: "10px auto 0", width: 150, height: 4, background: T.lava }} />
          {el.place ? <div style={{ marginTop: 14, fontFamily: FONT.oswald, fontWeight: 500, fontSize: 38, color: T.cenizaClara, letterSpacing: 4, textShadow: softShadow }}>{el.place}</div> : null}
        </div>
      );
    }
    case "big": {
      // B7 · главная цифра: Cinzel 900 лава, подпись кость; счётчик с размытием на промежуточных значениях
      const size = el.size ?? 200;
      let text = el.text;
      let blur = 0;
      if (el.countTo !== undefined) {
        const from = el.countFrom ?? atSec;
        const k = interpolate(sec, [from, from + (el.countSec ?? 1.4)], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
        text = `${Math.round(el.countTo * k)}${el.unit ? " " + el.unit : ""}`;
        blur = k < 0.98 ? 11 : 0; // прокрутка ≤ 0,5 с с размытием: промежуточные значения не читаются
      }
      const pop = el.countTo === undefined ? interpolate(f, [0, 6], [0.94, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
      return (
        <div style={{ position: "absolute", left: 0, right: 0, top: el.top ?? 250, textAlign: "center", opacity: a, transform: `translate(${(el.x ?? 540) - 540}px, ${rise}px) scale(${pop})` }}>
          <div style={{ fontFamily: FONT.cinzel, fontWeight: 900, fontSize: size, lineHeight: 1, color: T.lava, textShadow: softShadow, filter: blur ? `blur(${blur}px)` : undefined, whiteSpace: "nowrap" }}>{text}</div>
          {el.sub ? <div style={{ marginTop: 12, fontFamily: FONT.cinzel, fontWeight: 900, fontSize: el.subSize ?? 110, lineHeight: 1, color: T.hueso, textShadow: softShadow }}>{el.sub}</div> : null}
        </div>
      );
    }
    case "flash": // переход «книга → вспышка»: яркость вверх и обратно за ≈ 0,3 с
      return <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${T.hueso} 0%, ${T.lava}aa 60%, ${T.lava}00 100%)`, opacity: 0.6 * interpolate(f, [0, 3, dur], [0, 1, 0], clamp), mixBlendMode: "screen" }} />;
    case "g1": {
      // B8 · ростомер: силуэты ceniza 60 %, шкала hueso, конус растёт до 167 м, башня ≈ 180 м (появляется на слове «Torre»)
      const base = 1200;
      const pxPerM = 600 / 180;
      const grow = interpolate(sec, [el.growFrom, el.growTo], [0.02, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
      const coneH = el.cone * pxPerM * grow;
      const towerOp = interpolate(sec, [el.towerAt, el.towerAt + 0.35], [0, 1], clamp);
      const towerH = el.tower * pxPerM;
      const cx = 760;
      const tx = 400;
      const ticks = [0, 50, 100, 150];
      // Torre Latinoamericana: широкий цоколь, два уступа, суживающийся ствол, шпиль
      const tw = (frac: number, half: number) => ({ y: base - towerH * frac, half });
      const pts = [tw(0, 128), tw(0.2, 128), tw(0.2, 92), tw(0.42, 92), tw(0.42, 62), tw(0.72, 48), tw(0.78, 48), tw(0.78, 20), tw(0.82, 20), tw(0.82, 4), tw(1, 1.5)];
      const left = pts.map((p) => `${tx - p.half},${p.y}`);
      const right = [...pts].reverse().map((p) => `${tx + p.half},${p.y}`);
      return (
        <AbsoluteFill style={{ opacity: Math.min(1, a * 1.6) }}>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            <line x1={150} y1={base} x2={150} y2={base - towerH} stroke={T.hueso} strokeWidth={4} />
            {ticks.map((m) => (
              <g key={m}>
                <line x1={150} y1={base - m * pxPerM} x2={190} y2={base - m * pxPerM} stroke={T.hueso} strokeWidth={4} />
                <text x={128} y={base - m * pxPerM + 15} textAnchor="end" fontFamily={FONT.oswald} fontWeight={600} fontSize={46} fill={T.hueso}>
                  {m}
                </text>
              </g>
            ))}
            <line x1={120} y1={base} x2={990} y2={base} stroke={T.hueso} strokeWidth={3} opacity={0.7} />
            <polygon points={[...left, ...right].join(" ")} fill={T.ceniza} opacity={0.6 * towerOp} />
            <path d={`M ${cx - 250} ${base} Q ${cx - 70} ${base - coneH * 0.5} ${cx - 10} ${base - coneH} L ${cx + 10} ${base - coneH} Q ${cx + 70} ${base - coneH * 0.5} ${cx + 250} ${base} Z`} fill={T.ceniza} opacity={0.6} />
            <line x1={150} y1={base - towerH} x2={990} y2={base - towerH} stroke={T.hueso} strokeWidth={3} strokeDasharray="14 12" opacity={0.75 * towerOp} />
          </svg>
          <div style={{ position: "absolute", left: 210, top: base - towerH - 112, opacity: towerOp, fontFamily: FONT.oswald, fontWeight: 600, fontSize: 48, lineHeight: 1.12, color: T.hueso, letterSpacing: 2, textShadow: softShadow }}>
            TORRE LATINOAMERICANA<br />≈ 180 M
          </div>
          <div style={{ position: "absolute", left: cx - 250, width: 500, top: base + 26, textAlign: "center", fontFamily: FONT.oswald, fontWeight: 600, fontSize: 46, color: T.hueso, letterSpacing: 2 }}>PARICUTÍN · DÍA 6</div>
        </AbsoluteFill>
      );
    }
  }
};

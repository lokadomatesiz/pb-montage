import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, T } from "./tokens";
import { FLOWS } from "./long-flows";

// Карты длинного: «карта-документ» (тон papel, чернильные изолинии, рамка с метками), потоки лавы — трассировка A8.
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.sin);
export const INK = "#2b1d14";
export const PAPER = "#D9CBB0";
const DEAD = "#6b5d4d";

export const Topo: React.FC<{ seed?: number; strength?: number }> = ({ seed = 3, strength = 0.1 }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <filter id={`topo${seed}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.0055 0.0075" numOctaves="3" seed={seed} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.4 0 0 0 -0.2" result="a" />
        <feComponentTransfer in="a" result="b">
          <feFuncA type="discrete" tableValues="0 0.9 0 0.9 0 0.9 0 0.9 0 0.9 0 0.9 0 0.9 0 0.9" />
        </feComponentTransfer>
        <feFlood floodColor={INK} result="c" />
        <feComposite in="c" in2="b" operator="in" />
      </filter>
      <radialGradient id={`vig${seed}`} cx="50%" cy="50%" r="75%">
        <stop offset="50%" stopColor="#7a6548" stopOpacity={0} />
        <stop offset="100%" stopColor="#4a3a28" stopOpacity={0.55} />
      </radialGradient>
    </defs>
    <rect width={1920} height={1080} fill={PAPER} />
    <rect width={1920} height={1080} filter={`url(#topo${seed})`} opacity={strength} />
    <rect width={1920} height={1080} fill={`url(#vig${seed})`} />
  </svg>
);

export const Pulse: React.FC<{ cx: number; cy: number; f: number; r?: number }> = ({ cx, cy, f, r = 16 }) => {
  const k = (f % 45) / 45;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + k * 46} fill="none" stroke={T.lava} strokeWidth={4} opacity={1 - k} />
      <circle cx={cx} cy={cy} r={r} fill={T.lava} stroke={INK} strokeWidth={3} />
    </g>
  );
};

export const InkLabel: React.FC<{ x: number; y: number; text: string; size?: number; color?: string; anchor?: "start" | "middle" | "end"; weight?: number; font?: string; op?: number }> = ({ x, y, text, size = 40, color = INK, anchor = "start", weight = 600, font = FONT.oswald, op = 1 }) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={font} fontWeight={weight} fontSize={size} fill={color} opacity={op} letterSpacing={1} stroke={PAPER} strokeWidth={7} paintOrder="stroke" strokeLinejoin="round">
    {text}
  </text>
);

// рамка карты: метки координат Courier Prime, масштабная линейка, стрелка севера
const MapFrame: React.FC<{ scalePx: number; km: number }> = ({ scalePx, km }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
    <rect x={560} y={44} width={1000} height={992} fill="none" stroke={INK} strokeWidth={4} />
    <rect x={570} y={54} width={980} height={972} fill="none" stroke={INK} strokeWidth={1.5} opacity={0.6} />
    {[0, 1, 2, 3].map((i) => (
      <g key={i}>
        <line x1={685 + i * 250} y1={44} x2={685 + i * 250} y2={64} stroke={INK} strokeWidth={3} />
        <text x={685 + i * 250} y={34} textAnchor="middle" fontFamily={FONT.courier} fontWeight={700} fontSize={22} fill={INK}>{`102°${17 - i}′ W`}</text>
      </g>
    ))}
    {[0, 1, 2, 3].map((i) => (
      <g key={i}>
        <line x1={1560} y1={170 + i * 250} x2={1540} y2={170 + i * 250} stroke={INK} strokeWidth={3} />
        <text x={1572} y={178 + i * 250} fontFamily={FONT.courier} fontWeight={700} fontSize={22} fill={INK}>{`19°${32 - i}′ N`}</text>
      </g>
    ))}
    <g transform="translate(618 130)">
      <path d="M 0 -44 L 18 10 L 0 0 L -18 10 Z" fill={INK} />
      <text x={0} y={-52} textAnchor="middle" fontFamily={FONT.cinzel} fontWeight={900} fontSize={30} fill={INK}>N</text>
    </g>
    <g transform="translate(610 996)">
      <rect x={0} y={-10} width={scalePx} height={10} fill={INK} />
      <rect x={scalePx / 2} y={-10} width={scalePx / 2} height={10} fill={PAPER} stroke={INK} strokeWidth={2} />
      <text x={0} y={-20} fontFamily={FONT.courier} fontWeight={700} fontSize={24} fill={INK}>0</text>
      <text x={scalePx} y={-20} textAnchor="end" fontFamily={FONT.courier} fontWeight={700} fontSize={24} fill={INK}>{`${km} km`}</text>
    </g>
  </svg>
);

// A8 (Smithsonian / USGS 965-D): координаты рисунка 850×1019; центр вида (375, 340); 2 км = 150 px рисунка
const A8 = { cone: [315, 470], boca: [318, 436], pari: [240, 290], sj: [360, 128] } as const;
const K0 = 1.75;
const CX = 1065;
const CY = 540;
// язык 1943 к Парикутину (схема: потоки 1943 на A8 перекрыты более поздними)
const TONGUE = "M 306 470 C 288 428 262 380 250 330 L 238 296 C 266 304 290 334 304 376 C 316 408 330 438 332 468 Z";
const AGE_FILL = ["#8A2E0A", "#7a2a0c", "#963210", "#a73a12"];

export type G2Mode = "region" | "pari" | "two" | "vent" | "final";

export const G2: React.FC<{ mode: G2Mode; dur: number }> = ({ mode, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = f / fps;
  const t = interpolate(f, [0, dur], [0, 1], clamp);
  const a = interpolate(f, [0, 10], [0, 1], clamp);
  if (mode === "region") {
    // общий план: сетка координат, зум в Мичоакан, точка Парикутина
    const zoom = 1 + 0.22 * ease(t);
    return (
      <AbsoluteFill style={{ backgroundColor: PAPER }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "62% 58%", opacity: a }}>
          <Topo seed={5} />
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={160 + i * 220} y1={0} x2={160 + i * 220} y2={1080} stroke={INK} strokeWidth={1.5} opacity={0.22} />
            ))}
            {Array.from({ length: 6 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={120 + i * 190} x2={1920} y2={120 + i * 190} stroke={INK} strokeWidth={1.5} opacity={0.22} />
            ))}
            <Pulse cx={1180} cy={640} f={f} r={20} />
            <InkLabel x={1226} y={632} text="PARICUTÍN" size={74} font={FONT.cinzel} weight={900} />
            <InkLabel x={1226} y={690} text="MICHOACÁN, MÉXICO" size={44} weight={500} color="#5a4a38" />
            <InkLabel x={96} y={1010} text="ESQUEMA" size={32} color="#5a4a38" font={FONT.courier} weight={700} />
          </svg>
        </div>
      </AbsoluteFill>
    );
  }
  const z = mode === "final" ? 1 + 0.08 * ease(t) : 1 + 0.15 * ease(t);
  const K = K0 * z;
  const P = (p: readonly [number, number]) => [CX + (p[0] - 375) * K, CY + (p[1] - 340) * K] as const;
  const cone = P(A8.cone);
  const pari = P(A8.pari);
  const sj = P(A8.sj);
  const boca = P(A8.boca);

  type L = { path: string; fill: string; op: number; clip?: boolean; glow?: boolean };
  const layers: L[] = [];
  let title = "";
  let sub = "";
  let active = -1;
  let status: { pari: "on" | "dead"; sj: "off" | "on" | "dead" } = { pari: "on", sj: "off" };
  const seg = dur / fps / 4.4;
  if (mode === "pari") {
    title = "12 · VI · 1943";
    sub = "LA LAVA AVANZA HACIA EL PUEBLO";
    layers.push({ path: TONGUE, fill: T.lava, op: 0.95, clip: true, glow: true });
    status = { pari: sec > 3.6 ? "dead" : "on", sj: "off" };
  } else if (mode === "two") {
    title = "1943";
    sub = "MÁS ALLÁ ESTÁ SAN JUAN";
    layers.push({ path: TONGUE, fill: AGE_FILL[0], op: 0.9 });
    status = { pari: "dead", sj: "on" };
  } else if (mode === "vent") {
    title = "OCTUBRE 1943";
    sub = "NUEVA BOCA · LA LAVA CAMBIA DE RUMBO";
    layers.push({ path: TONGUE, fill: AGE_FILL[0], op: 0.9 });
    layers.push({ path: FLOWS[0], fill: T.lava, op: 0.95, clip: true, glow: true });
    status = { pari: "dead", sj: sec > 5 ? "dead" : "on" };
  } else {
    active = Math.min(3, Math.floor(sec / seg));
    title = ["1943", "1944", "1945 – 1948", "1949 – 1952"][active];
    sub = active === 3 && sec > seg * 3.6 ? "≈ 25 KM² DE LAVA" : "";
    status = { pari: "dead", sj: active >= 1 ? "dead" : "on" };
    layers.push({ path: TONGUE, fill: AGE_FILL[0], op: 0.9 });
    // вложенные накопительные контуры: большие рисуем первыми, малые — поверх
    for (let k = active; k >= 0; k--) layers.push({ path: FLOWS[k], fill: k === active && active > 0 ? T.lava : AGE_FILL[k], op: 0.94, clip: k === active && active > 0, glow: k === active && active > 0 });
  }
  const rvCenter = mode === "vent" ? A8.boca : A8.cone;
  const rvStart = mode === "pari" ? 0.2 : mode === "vent" ? 0.9 : Math.max(0, active) * seg;
  const rvLen = mode === "pari" ? 3.3 : mode === "vent" ? 4.6 : 2.6;
  const rvMax = mode === "pari" ? 190 : 560;
  const rvR = interpolate(sec, [rvStart, rvStart + rvLen], [0, rvMax], { ...clamp, easing: Easing.out(Easing.quad) });
  const pulseOn = mode === "vent" && sec > 0.3 && sec < 5;
  const dot = (p: readonly [number, number], st: string) => <circle cx={p[0]} cy={p[1]} r={14} fill={st === "dead" ? DEAD : INK} stroke={st === "on" ? T.lava : INK} strokeWidth={5} opacity={st === "off" ? 0 : 1} />;
  const ageLabel = (dead: boolean, active_: boolean) => (dead ? DEAD : active_ ? T.lava : INK);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <div style={{ position: "absolute", inset: 0, opacity: a }}>
        <Topo seed={9} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <clipPath id="rv">
              <circle cx={rvCenter[0]} cy={rvCenter[1]} r={rvR} />
            </clipPath>
            <filter id="lavaglow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={9} />
            </filter>
            <clipPath id="vp">
              <rect x={572} y={56} width={976} height={968} />
            </clipPath>
          </defs>
          <g clipPath="url(#vp)">
            <rect x={572} y={56} width={976} height={968} fill="#cbbb9c" opacity={0.55} />
            <g transform={`translate(${CX} ${CY}) scale(${K}) translate(-375 -340)`}>
              {layers.map((l, i) => (
                <g key={i} clipPath={l.clip ? "url(#rv)" : undefined}>
                  {l.glow ? <path d={l.path} fill={T.lava} opacity={0.55} filter="url(#lavaglow)" /> : null}
                  <path d={l.path} fill={l.fill} opacity={l.op} stroke={INK} strokeWidth={1.1 / K0} strokeLinejoin="round" />
                </g>
              ))}
              <circle cx={A8.cone[0]} cy={A8.cone[1]} r={22} fill="#1d1612" stroke={INK} strokeWidth={2} />
            </g>
          </g>
          {dot(pari, status.pari)}
          {dot(sj, status.sj)}
          {pulseOn ? <Pulse cx={boca[0]} cy={boca[1]} f={f} r={10} /> : <polygon points={`${cone[0]},${cone[1] - 16} ${cone[0] + 16},${cone[1] + 12} ${cone[0] - 16},${cone[1] + 12}`} fill={T.lava} stroke={INK} strokeWidth={3} />}
          <InkLabel x={pari[0] - 28} y={pari[1] + 4} text="PARICUTÍN" size={60} anchor="end" font={FONT.cinzel} weight={900} color={ageLabel(status.pari === "dead", mode === "pari")} />
          <InkLabel x={pari[0] - 28} y={pari[1] + 52} text="733 hab." size={42} anchor="end" weight={600} color={status.pari === "dead" ? DEAD : INK} />
          {status.sj !== "off" ? (
            <g>
              <InkLabel x={sj[0] + 30} y={sj[1] - 8} text="SAN JUAN" size={60} font={FONT.cinzel} weight={900} color={ageLabel(status.sj === "dead", mode === "two")} />
              <InkLabel x={sj[0] + 30} y={sj[1] + 36} text="PARANGARICUTIRO" size={32} weight={500} />
              <InkLabel x={sj[0] + 30} y={sj[1] + 80} text="1 895 hab." size={42} weight={600} color={status.sj === "dead" ? DEAD : INK} />
            </g>
          ) : null}
          <InkLabel x={cone[0] + 30} y={cone[1] + 54} text="VOLCÁN" size={40} color={T.lava} />
          <InkLabel x={96} y={200} text={title} size={title.length > 9 ? 50 : 86} font={FONT.cinzel} weight={900} />
          <rect x={100} y={228} width={380} height={6} fill={T.lava} />
          {sub ? <InkLabel x={96} y={300} text={sub} size={34} weight={600} color="#4a3a2a" /> : null}
          {mode === "final" ? (
            <g>
              {["1943", "1944", "1945–48", "1949–52"].map((y, i) => (
                <g key={y} opacity={i <= active ? 1 : 0.25}>
                  <rect x={100} y={760 + i * 50} width={34} height={28} fill={i === active && active > 0 ? T.lava : AGE_FILL[i]} stroke={INK} strokeWidth={2} />
                  <InkLabel x={150} y={784 + i * 50} text={y} size={34} weight={500} />
                </g>
              ))}
            </g>
          ) : null}
          <InkLabel x={96} y={1010} text="ESQUEMA · trazado sobre el mapa de USGS Bulletin 965-D / Smithsonian" size={22} color="#5a4a38" font={FONT.courier} weight={700} />
        </svg>
        <MapFrame scalePx={150 * K} km={2} />
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, T } from "./tokens";

// Графика ролика с картами и схемами (VISUAL-CH2 §7: B6, B8, B9, ESQUEMA) — 1920×1080.
// Компоненты общие: ВСЕ тексты приходят данными (data), в коде их нет — раскладка и подписи ролика лежат в public/<ролик>/board.mjs, не в репозитории.
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.sin);
const shadow = `0 4px 14px ${T.carbon}b3`;
const LAND = "#2A2522"; // B9: суша — тёплый уголь
const AGUA = "#7C98A8"; // светлый «acero» для воды и уровня озера (в палитре канала воды-синего нет)
const AGUA_D = "#3E5361";

const Tx: React.FC<{ x: number; y: number; t: string; size?: number; color?: string; anchor?: "start" | "middle" | "end"; weight?: number; font?: string; op?: number; ls?: number }> = ({ x, y, t, size = 40, color = T.hueso, anchor = "start", weight = 500, font = FONT.oswald, op = 1, ls = 1 }) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={font} fontWeight={weight} fontSize={size} fill={color} opacity={op} stroke={T.carbon} strokeWidth={7} paintOrder="stroke" strokeLinejoin="round" letterSpacing={ls}>
    {t}
  </text>
);
const Tag: React.FC<{ t?: string }> = ({ t }) => (t ? <Tx x={96} y={1000} t={t} size={30} color={T.ceniza} weight={600} /> : null);
const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ backgroundColor: T.carbon }}>{children}</AbsoluteFill>;
const pop = (f: number, at: number, len = 10) => interpolate(f, [at, at + len], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const Pulse: React.FC<{ cx: number; cy: number; f: number; r?: number; color?: string }> = ({ cx, cy, f, r = 14, color = T.lava }) => {
  const k = (f % 45) / 45;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + k * 48} fill="none" stroke={color} strokeWidth={4} opacity={1 - k} />
      <circle cx={cx} cy={cy} r={r} fill={color} stroke={T.carbon} strokeWidth={3} />
    </g>
  );
};

// ── общая подложка B9: тёмная суша, контуры, океан слева, кордильера справа ──
const MapBase: React.FC<{ seaLabel?: string }> = ({ seaLabel }) => (
  <>
    <defs>
      <pattern id="hatch" width="26" height="22" patternUnits="userSpaceOnUse">
        <path d="M0 18 L13 4 L26 18" fill="none" stroke={T.ceniza} strokeWidth={2} opacity={0.35} />
      </pattern>
    </defs>
    <path d="M230 0 C 300 120, 170 220, 250 330 C 330 450, 200 560, 270 690 C 330 800, 240 900, 300 1080 L1920 1080 L1920 0 Z" fill={LAND} />
    <path d="M230 0 C 300 120, 170 220, 250 330 C 330 450, 200 560, 270 690 C 330 800, 240 900, 300 1080" fill="none" stroke={T.ceniza} strokeWidth={3} opacity={0.7} />
    <rect x={1560} y={0} width={360} height={1080} fill="url(#hatch)" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <path key={i} d={`M300 ${180 + i * 150} C 700 ${140 + i * 150}, 1100 ${230 + i * 150}, 1900 ${170 + i * 150}`} fill="none" stroke={T.ceniza} strokeWidth={1.5} opacity={0.18} />
    ))}
    {seaLabel ? <Tx x={110} y={520} t={seaLabel} size={34} color={T.cenizaClara} weight={500} ls={4} /> : null}
  </>
);

// река: точки с запада на восток; полилиния рисуется по pathLength
const RIVER: [number, number][] = [
  [1370, 440],
  [1290, 462],
  [1210, 470],
  [1120, 452],
  [1040, 478],
  [930, 510],
  [840, 548],
  [740, 578],
  [640, 622],
  [520, 650],
  [420, 700],
  [330, 735],
];
const riverPts = RIVER.map((p) => p.join(",")).join(" ");
const LAKES: [number, number, number, number][] = [
  [1830, 230, 62, 30],
  [1760, 330, 50, 26],
  [1690, 280, 44, 22],
  [1640, 380, 52, 26],
  [1575, 330, 40, 20],
  [1530, 410, 46, 22],
];

// ── G1 · карта бассейна (режимы «1960» / «1575») ──
export type BasinData = {
  mode: "1960" | "1575";
  lakes?: string; // «7 LAGOS»
  lake: string; // «RIÑIHUE»
  river?: string;
  tacos?: string;
  towns: { loslagos: string; antilhue: string; valdivia: string; corral: string };
  sea?: string;
  scale?: string;
  tag?: string;
  y1?: string;
  y2?: string;
  old?: string; // «LAGUNA DE ANIGUA»
  focus?: "taco"; // наезд на район тако
};
const Basin: React.FC<{ d: BasinData; dur: number }> = ({ d, dur }) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [8, Math.max(40, dur * 0.7)], [0, 1], { ...clamp, easing: ease });
  const z = d.focus === "taco" ? interpolate(f, [0, dur], [1, 1.45], { ...clamp, easing: ease }) : interpolate(f, [0, dur], [1, 1.06], clamp);
  const town = (x: number, y: number, name: string, at: number, big = false, dx = 0, dy = -22) => (
    <g opacity={pop(f, at)}>
      <circle cx={x} cy={y} r={big ? 13 : 9} fill={T.hueso} stroke={T.carbon} strokeWidth={3} />
      <Tx x={x + dx} y={y + dy} t={name} size={big ? 44 : 36} anchor="middle" weight={600} />
    </g>
  );
  const tacoXY: [number, number][] = [
    [1255, 464],
    [1165, 468],
    [1070, 468],
  ];
  return (
    <Frame>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: d.focus === "taco" ? "1210px 470px" : "960px 540px" }}>
        <MapBase seaLabel={d.sea} />
        {LAKES.map(([cx, cy, rx, ry], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={AGUA_D} stroke={T.ceniza} strokeWidth={2} opacity={pop(f, i * 3)} />
        ))}
        {d.lakes ? <Tx x={1730} y={170} t={d.lakes} size={40} anchor="middle" weight={600} op={pop(f, 14)} /> : null}
        <ellipse cx={1420} cy={440} rx={96} ry={46} fill={d.mode === "1575" ? AGUA_D : AGUA} stroke={T.hueso} strokeWidth={3} opacity={pop(f, 10)} />
        <Tx x={1420} y={540} t={d.lake} size={46} anchor="middle" weight={600} op={pop(f, 14)} />
        <polyline points={riverPts} pathLength={1} fill="none" stroke={AGUA} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1} strokeDashoffset={1 - k} />
        {d.river ? <Tx x={1120} y={548} t={d.river} size={34} color={T.cenizaClara} anchor="middle" weight={400} op={pop(f, 40)} /> : null}
        {d.mode === "1960"
          ? tacoXY.map(([x, y], i) => (
              <g key={i} opacity={pop(f, 24 + i * 5)}>
                <path d={`M${x - 14} ${y + 14} L${x} ${y - 20} L${x + 14} ${y + 14} Z`} fill={T.lava} stroke={T.carbon} strokeWidth={3} />
              </g>
            ))
          : null}
        {d.mode === "1960" && d.tacos ? <Tx x={1160} y={400} t={d.tacos} size={36} color={T.lava} anchor="middle" weight={600} op={pop(f, 36)} /> : null}
        {town(930, 510, d.towns.loslagos, Math.round(dur * 0.35), false, 0, -24)}
        {town(740, 578, d.towns.antilhue, Math.round(dur * 0.45), false, -10, -26)}
        {town(470, 672, d.towns.valdivia, Math.round(dur * 0.58), true, 0, -34)}
        {town(330, 735, d.towns.corral, Math.round(dur * 0.7), false, 10, 46)}
        {d.mode === "1960" ? <Pulse cx={470} cy={672} f={f} r={12} /> : null}
        {d.mode === "1575" ? (
          <g opacity={pop(f, 30)}>
            <Pulse cx={1420} cy={440} f={f} r={12} />
            <circle cx={1420} cy={440} r={120} fill="none" stroke={T.lava} strokeWidth={4} strokeDasharray="10 12" />
            {d.y1 ? <Tx x={1300} y={330} t={d.y1} size={90} color={T.lava} anchor="middle" weight={900} font={FONT.cinzel} /> : null}
            {d.y2 ? <Tx x={1300} y={650} t={d.y2} size={90} color={T.hueso} anchor="middle" weight={900} font={FONT.cinzel} op={pop(f, Math.round(dur * 0.5))} /> : null}
            {d.old ? <Tx x={1300} y={600} t={d.old} size={34} color={T.cenizaClara} anchor="middle" weight={400} /> : null}
          </g>
        ) : null}
        {d.scale ? (
          <g opacity={0.9}>
            <line x1={420} y1={955} x2={820} y2={955} stroke={T.hueso} strokeWidth={4} />
            <line x1={420} y1={940} x2={420} y2={970} stroke={T.hueso} strokeWidth={4} />
            <line x1={820} y1={940} x2={820} y2={970} stroke={T.hueso} strokeWidth={4} />
            <Tx x={620} y={1010} t={d.scale} size={34} anchor="middle" weight={500} />
          </g>
        ) : null}
      </svg>
      <Tag t={d.tag} />
    </Frame>
  );
};

// ── G10 · карта затопления ──
export type FloodData = { title: string; towns: string[]; river?: string; tag?: string; sea?: string };
const Flood: React.FC<{ d: FloodData; dur: number }> = ({ d, dur }) => {
  const f = useCurrentFrame();
  const pos: [number, number][] = [
    [930, 510],
    [740, 578],
    [590, 640],
    [470, 672],
  ];
  const flow = interpolate(f, [4, dur * 0.8], [0, 1], { ...clamp, easing: ease });
  return (
    <Frame>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <MapBase seaLabel={d.sea} />
        <ellipse cx={1420} cy={440} rx={96} ry={46} fill={AGUA} stroke={T.hueso} strokeWidth={3} />
        <polyline points={riverPts} fill="none" stroke={AGUA} strokeWidth={8} strokeLinecap="round" opacity={0.9} />
        <polyline points={riverPts} pathLength={1} fill="none" stroke={T.hueso} strokeWidth={4} strokeLinecap="round" strokeDasharray="0.03 0.05" strokeDashoffset={-flow * 0.9} opacity={0.7} />
        {pos.map(([x, y], i) => {
          const at = 14 + i * Math.round(dur * 0.17);
          const g = interpolate(f, [at, at + 30], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={30 + 70 * g} ry={18 + 42 * g} fill={AGUA} opacity={0.55 * g} />
              <ellipse cx={x} cy={y} rx={30 + 70 * g} ry={18 + 42 * g} fill="none" stroke={AGUA} strokeWidth={3} opacity={g} />
              <circle cx={x} cy={y} r={9} fill={T.hueso} stroke={T.carbon} strokeWidth={3} />
              <Tx x={x} y={y - 74 * g - 22} t={d.towns[i] ?? ""} size={38} anchor="middle" weight={600} op={pop(f, at)} />
            </g>
          );
        })}
        <Tx x={96} y={150} t={d.title} size={64} weight={900} font={FONT.cinzel} ls={3} />
        {d.river ? <Tx x={1240} y={552} t={d.river} size={34} color={T.cenizaClara} anchor="middle" weight={400} /> : null}
      </svg>
      <Tag t={d.tag} />
    </Frame>
  );
};

// ── G2 · схема: земля опустилась ──
export type SubsidData = { title: string; delta: string; before: string; after: string; tag?: string };
const Subsid: React.FC<{ d: SubsidData; dur: number }> = ({ d, dur }) => {
  const f = useCurrentFrame();
  const sink = interpolate(f, [Math.round(dur * 0.25), Math.round(dur * 0.65)], [0, 1], { ...clamp, easing: ease });
  const pxm = 90;
  const y0 = 560;
  const drop = 2 * pxm * sink;
  const house = (x: number, y: number) => (
    <g>
      <rect x={x} y={y - 70} width={90} height={70} fill={T.ceniza} opacity={0.75} />
      <path d={`M${x - 8} ${y - 70} L${x + 45} ${y - 112} L${x + 98} ${y - 70} Z`} fill={T.cenizaClara} opacity={0.75} />
    </g>
  );
  return (
    <Frame>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Tx x={960} y={150} t={d.title} size={64} anchor="middle" weight={600} ls={3} />
        <path d={`M0 ${y0} L900 ${y0} L1000 ${y0 + drop} L1920 ${y0 + drop} L1920 1080 L0 1080 Z`} fill={LAND} stroke={T.ceniza} strokeWidth={3} />
        {house(200, y0)}
        {house(420, y0)}
        {house(1200, y0 + drop)}
        {house(1460, y0 + drop)}
        <line x1={900} y1={y0} x2={1820} y2={y0} stroke={T.hueso} strokeWidth={3} strokeDasharray="14 12" opacity={0.8} />
        <g opacity={pop(f, Math.round(dur * 0.55))}>
          <line x1={1680} y1={y0} x2={1680} y2={y0 + 2 * pxm} stroke={T.hueso} strokeWidth={5} />
          <line x1={1655} y1={y0} x2={1705} y2={y0} stroke={T.hueso} strokeWidth={5} />
          <line x1={1655} y1={y0 + 2 * pxm} x2={1705} y2={y0 + 2 * pxm} stroke={T.hueso} strokeWidth={5} />
          <text x={1640} y={y0 - 36} textAnchor="end" fontFamily={FONT.cinzel} fontWeight={900} fontSize={120} fill={T.lava} stroke={T.carbon} strokeWidth={8} paintOrder="stroke">
            {d.delta}
          </text>
        </g>
        <Tx x={420} y={y0 + 90} t={d.before} size={40} anchor="middle" weight={600} />
        <Tx x={1400} y={y0 + drop + 90} t={d.after} size={40} anchor="middle" weight={600} op={pop(f, Math.round(dur * 0.5))} />
      </svg>
      <Tag t={d.tag} />
    </Frame>
  );
};

// ── G3 · столбик: +40 млн м³ в день ──
export type BarData = { big: string; unit: string; sub: string; tag?: string };
const Bar: React.FC<{ d: BarData; dur: number }> = ({ d, dur }) => {
  const f = useCurrentFrame();
  const h = interpolate(f, [6, Math.round(dur * 0.5)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <Frame>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 40% 80%, ${T.brasa}30 0%, ${T.carbon}00 65%)` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={300} y1={880} x2={1000} y2={880} stroke={T.hueso} strokeWidth={4} />
        <rect x={520} y={880 - 620 * h} width={260} height={620 * h} fill={AGUA} stroke={T.hueso} strokeWidth={3} opacity={0.9} />
        <text x={650} y={880 - 620 * h - 24} textAnchor="middle" fontFamily={FONT.cinzel} fontWeight={900} fontSize={0} fill={T.lava} />
        <g opacity={pop(f, Math.round(dur * 0.45), 12)}>
          <text x={1060} y={650} fontFamily={FONT.cinzel} fontWeight={900} fontSize={230} fill={T.lava} stroke={T.carbon} strokeWidth={10} paintOrder="stroke">
            {d.big}
          </text>
          <Tx x={1066} y={740} t={d.unit} size={90} weight={600} />
          <Tx x={1066} y={830} t={d.sub} size={70} color={T.cenizaClara} weight={600} ls={3} />
        </g>
      </svg>
      <Tag t={d.tag} />
    </Frame>
  );
};

// ── G4 · поправка: «20» зачёркнуто → «≈ 78» ──
export type CorrData = { old: string; neu: string; area: string; source: string; tag?: string };
const Corr: React.FC<{ d: CorrData; dur: number }> = ({ d, dur }) => {
  const f = useCurrentFrame();
  const s1 = Math.round(dur * 0.12);
  const s2 = Math.round(dur * 0.34);
  const s3 = Math.round(dur * 0.5);
  const s4 = Math.round(dur * 0.66);
  const strike = interpolate(f, [s2, s2 + 12], [0, 1], clamp);
  return (
    <Frame>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g opacity={pop(f, s1)}>
          <text x={800} y={330} textAnchor="middle" fontFamily={FONT.cinzel} fontWeight={900} fontSize={100} fill={T.cenizaClara} stroke={T.carbon} strokeWidth={8} paintOrder="stroke" opacity={interpolate(f, [s2, s2 + 14], [1, 0.55], clamp)}>
            {d.old}
          </text>
          <line x1={800 - 560 * strike} y1={300} x2={800 + 560 * strike} y2={300} stroke={T.lava} strokeWidth={9} strokeLinecap="round" />
        </g>
        <g opacity={pop(f, s3)}>
          <text x={800} y={610} textAnchor="middle" fontFamily={FONT.cinzel} fontWeight={900} fontSize={170} fill={T.lava} stroke={T.carbon} strokeWidth={10} paintOrder="stroke">
            {d.neu}
          </text>
        </g>
        <g opacity={pop(f, s4)}>
          <Tx x={800} y={720} t={d.area} size={80} anchor="middle" weight={600} ls={3} />
        </g>
        <g opacity={pop(f, s4 + 6)}>
          <Tx x={800} y={880} t={d.source} size={36} anchor="middle" color={T.cenizaClara} weight={400} />
        </g>
      </svg>
      <Tag t={d.tag} />
    </Frame>
  );
};

// ── G6 · силуэт 8-этажного дома и профиль завала, линия уровня озера ──
export type SilData = { floors: number; level: string; title: string; tag?: string };
const Sil: React.FC<{ d: SilData; dur: number }> = ({ d, dur }) => {
  const f = useCurrentFrame();
  const pxm = 27;
  const base = 900;
  const floorM = 3.1;
  const bh = d.floors * floorM * pxm;
  const lvl = interpolate(f, [Math.round(dur * 0.3), Math.round(dur * 0.85)], [0, 26], { ...clamp, easing: ease });
  const ly = base - lvl * pxm;
  return (
    <Frame>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Tx x={960} y={130} t={d.title} size={56} anchor="middle" weight={600} ls={3} />
        <line x1={250} y1={base} x2={250} y2={base - 30 * pxm} stroke={T.hueso} strokeWidth={4} />
        {[0, 10, 20, 30].map((m) => (
          <g key={m}>
            <line x1={250} y1={base - m * pxm} x2={290} y2={base - m * pxm} stroke={T.hueso} strokeWidth={4} />
            <Tx x={232} y={base - m * pxm + 12} t={`${m}`} size={36} anchor="end" weight={600} />
          </g>
        ))}
        <line x1={200} y1={base} x2={1760} y2={base} stroke={T.hueso} strokeWidth={3} opacity={0.7} />
        {/* дом: d.floors этажей */}
        <rect x={420} y={base - bh} width={250} height={bh} fill={T.ceniza} opacity={0.6} />
        {Array.from({ length: d.floors }, (_, i) =>
          [0, 1, 2].map((j) => <rect key={`${i}${j}`} x={446 + j * 72} y={base - bh + 14 + i * floorM * pxm} width={42} height={floorM * pxm - 30} fill={T.carbon} opacity={0.65} />),
        )}
        {/* завал: профиль выше дома; вода — слева за ним */}
        <rect x={720} y={ly} width={400} height={Math.max(0, base - ly)} fill={AGUA} opacity={0.55} />
        <path d={`M1000 ${base} L1240 ${base - 28.6 * pxm} Q1290 ${base - 29.6 * pxm} 1360 ${base - 28.2 * pxm} L1840 ${base} Z`} fill={T.ceniza} opacity={0.75} stroke={T.cenizaClara} strokeWidth={3} />
        <line x1={720} y1={ly} x2={1120} y2={ly} stroke={AGUA} strokeWidth={6} />
        <text x={760} y={ly - 22} fontFamily={FONT.cinzel} fontWeight={900} fontSize={110} fill={T.lava} stroke={T.carbon} strokeWidth={8} paintOrder="stroke" opacity={pop(f, Math.round(dur * 0.35))}>
          {d.level}
        </text>
      </svg>
      <Tag t={d.tag} />
    </Frame>
  );
};

// ── G8 · схема размыва: борозда → канава → каньон ──
export type ErosData = { steps: [string, string, string]; end: string; tag?: string };
const Eros: React.FC<{ d: ErosData; dur: number }> = ({ d, dur }) => {
  const f = useCurrentFrame();
  const st = (n: number) => Math.round(dur * (0.08 + n * 0.25));
  const base = 860;
  const depth = [0, 60, 150, 330].map((v, i) => v);
  const cur = f < st(1) ? 1 : f < st(2) ? 2 : 3;
  const dep = interpolate(f, [st(0), st(1), st(2), st(3)], [0, 60, 150, 330], { ...clamp, easing: ease });
  const gush = interpolate(f, [st(2), st(3)], [0, 1], clamp);
  void depth;
  return (
    <Frame>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform="translate(-192 -172) scale(1.2)">
        <rect x={160} y={base - 300} width={620} height={300} fill={AGUA} opacity={0.5} />
        <path d={`M780 ${base} L860 ${base - 330} L1140 ${base - 330} L1400 ${base} Z`} fill={LAND} stroke={T.cenizaClara} strokeWidth={4} />
        {/* промоина по гребню */}
        <path d={`M ${960} ${base - 330} L ${1000} ${base - 330 + dep} L ${1050} ${base - 330 + dep} L ${1090} ${base - 330} Z`} fill={T.carbon} />
        <path d={`M ${780} ${base - 300} Q ${960} ${base - 330 + dep * 0.4} ${1040} ${base - 330 + dep}`} fill="none" stroke={AGUA} strokeWidth={8} opacity={0.9} />
        <g opacity={gush}>
          <path d={`M ${1040} ${base - 30} Q ${1300} ${base + 40} ${1800} ${base + 30}`} fill="none" stroke={AGUA} strokeWidth={40} opacity={0.7} strokeLinecap="round" />
          <path d={`M ${1040} ${base - 30} Q ${1300} ${base + 40} ${1800} ${base + 30}`} fill="none" stroke={T.hueso} strokeWidth={6} strokeDasharray="30 40" opacity={0.6} />
        </g>
        </g>
        <Tx x={960} y={170} t={d.steps[cur - 1]} size={110} anchor="middle" weight={900} font={FONT.cinzel} color={T.lava} />
        <g opacity={pop(f, st(3) - 2)}>
          <Tx x={960} y={990} t={d.end} size={58} anchor="middle" weight={600} ls={2} />
        </g>
        {[1, 2, 3].map((n) => (
          <g key={n} opacity={cur >= n ? 1 : 0.35}>
            <circle cx={800 + n * 160} cy={260} r={14} fill={cur >= n ? T.lava : T.ceniza} stroke={T.carbon} strokeWidth={3} />
          </g>
        ))}
      </svg>
      <Tag t={d.tag} />
    </Frame>
  );
};

// ── G9 · карточка-цитата (B6 с именем человека); фон — кадр, размытый или затемнённый ──
export type QuoteData = { top?: number; bg: string; blur?: number; dark?: number; name: string; role?: string; quote?: string; source?: string; nameOnly?: boolean };
const Quote: React.FC<{ d: QuoteData; dur: number; folder: string }> = ({ d, dur, folder }) => {
  const f = useCurrentFrame();
  const a = Math.min(interpolate(f, [0, 10], [0, 1], clamp), interpolate(f, [dur - 8, dur], [1, 0], clamp));
  const rise = interpolate(f, [0, 10], [14, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const q = d.quote ?? "";
  const size = q.length > 70 ? 66 : 80;
  return (
    <Frame>
      <Img src={staticFile(`${folder}/${d.bg}`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: `blur(${d.blur ?? 0}px)`, transform: "scale(1.08)" }} />
      <AbsoluteFill style={{ background: `${T.carbon}${Math.round(255 * (d.dark ?? 0.55)).toString(16).padStart(2, "0")}` }} />
      <AbsoluteFill style={{ opacity: a }}>
        {d.nameOnly ? (
          <div style={{ position: "absolute", left: 160, right: 160, top: 380, textAlign: "center", transform: `translateY(${rise}px)` }}>
            <div style={{ fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 112, lineHeight: 1.08, color: T.hueso, textShadow: shadow, letterSpacing: 3 }}>{d.name}</div>
            <div style={{ margin: "26px auto 20px", width: 160, height: 4, background: T.lava }} />
            {d.role ? <div style={{ fontFamily: FONT.oswald, fontWeight: 500, fontSize: 52, color: T.cenizaClara, letterSpacing: 4 }}>{d.role}</div> : null}
          </div>
        ) : (
          <div style={{ position: "absolute", left: 180, right: 180, top: d.top ?? 270, textAlign: "center", transform: `translateY(${rise}px)` }}>
            <div style={{ fontFamily: FONT.cinzel, fontWeight: 700, fontSize: size, lineHeight: 1.18, color: T.hueso, textShadow: shadow }}>{`«${q}»`}</div>
            <div style={{ margin: "34px auto 22px", width: 160, height: 4, background: T.lava }} />
            <div style={{ fontFamily: FONT.oswald, fontWeight: 500, fontSize: 42, color: T.hueso, letterSpacing: 3 }}>{d.name}</div>
            {d.role ? <div style={{ marginTop: 6, fontFamily: FONT.oswald, fontWeight: 400, fontSize: 34, color: T.cenizaClara, letterSpacing: 3 }}>{d.role}</div> : null}
            {d.source ? <div style={{ marginTop: 14, fontFamily: FONT.oswald, fontWeight: 400, fontSize: 32, color: T.cenizaClara }}>{d.source}</div> : null}
          </div>
        )}
      </AbsoluteFill>
    </Frame>
  );
};

// ── G7 · лист хроники: описание, не цитата (строки — рукописные «каракули» без читаемого текста) ──
export type SheetData = { head: string; sub: string; year: string };
const Sheet: React.FC<{ d: SheetData; dur: number }> = ({ d, dur }) => {
  const f = useCurrentFrame();
  const inn = interpolate(f, [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const out = interpolate(f, [dur - 8, dur], [1, 0], clamp);
  return (
    <Frame>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${T.brasa}30 0%, ${T.carbon}00 70%)` }} />
      <div style={{ position: "absolute", left: 480, top: 120 + (1 - inn) * 40, width: 960, height: 840, background: T.papel, transform: "rotate(1.2deg)", opacity: inn * out, boxShadow: "0 20px 60px #000c", padding: "70px 90px" }}>
        <div style={{ fontFamily: FONT.courier, fontWeight: 700, fontSize: 40, color: "#4a3f33", letterSpacing: 3 }}>{d.year}</div>
        <div style={{ marginTop: 20, fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 64, lineHeight: 1.1, color: T.carbon }}>{d.head}</div>
        <div style={{ marginTop: 10, height: 5, width: 300, background: T.lava }} />
        <div style={{ marginTop: 14, fontFamily: FONT.courier, fontWeight: 400, fontSize: 34, color: "#4a3f33" }}>{d.sub}</div>
        <svg width={780} height={470} style={{ marginTop: 28 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const y = 30 + i * 44;
            const w = 560 + ((i * 97) % 200);
            let p = `M0 ${y}`;
            for (let x = 0; x < w; x += 28) p += ` q 7 ${(x / 28) % 2 ? -12 : 12} 14 0 t 14 0`;
            return <path key={i} d={p} fill="none" stroke="#3a2f26" strokeWidth={2.4} opacity={0.55} />;
          })}
        </svg>
      </div>
    </Frame>
  );
};

export type Ch203Spec =
  | { kind: "basin"; data: BasinData }
  | { kind: "flood"; data: FloodData }
  | { kind: "subsid"; data: SubsidData }
  | { kind: "bar"; data: BarData }
  | { kind: "corr"; data: CorrData }
  | { kind: "sil"; data: SilData }
  | { kind: "eros"; data: ErosData }
  | { kind: "quote"; data: QuoteData }
  | { kind: "sheet"; data: SheetData };

export const Ch203Gfx: React.FC<{ spec: Ch203Spec; dur: number; folder: string }> = ({ spec, dur, folder }) => {
  switch (spec.kind) {
    case "basin":
      return <Basin d={spec.data} dur={dur} />;
    case "flood":
      return <Flood d={spec.data} dur={dur} />;
    case "subsid":
      return <Subsid d={spec.data} dur={dur} />;
    case "bar":
      return <Bar d={spec.data} dur={dur} />;
    case "corr":
      return <Corr d={spec.data} dur={dur} />;
    case "sil":
      return <Sil d={spec.data} dur={dur} />;
    case "eros":
      return <Eros d={spec.data} dur={dur} />;
    case "quote":
      return <Quote d={spec.data} dur={dur} folder={folder} />;
    case "sheet":
      return <Sheet d={spec.data} dur={dur} />;
  }
};

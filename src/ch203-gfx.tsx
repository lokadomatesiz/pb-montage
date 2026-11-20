import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, T } from "./tokens";

// Графика ролика с картами и схемами (VISUAL-CH2 §7: B6, B8, B9, ESQUEMA) — 1920×1080.
// Компоненты общие и параметризованные: ВСЕ тексты и подложки приходят данными (data); в коде их нет.
// Раскладка и подписи ролика лежат в public/<ролик>/board.mjs, не в репозитории. Справка по свойствам — src/gfx-props.md.

// ── единая сетка и движение (одинаковы для всех схем) ──
export const GRID = {
  mx: 96, // поле слева и справа (5 %)
  top: 64, // верхнее поле: часы-дата слева, метка справа
  titleY: 196, // базовая линия заголовка схемы (по центру)
  bottom: 900, // ниже — пусто (субтитры YouTube, полоса прогресса; VISUAL §4: 918)
  /** зона плашки G5 (справа сверху): пока идёт счётчик, графика сюда не заходит */
  counter: { x: 1404, y: 214, w: 420, h: 240 },
};
export const IO = 9; // вход и выход любого текста/схемы, кадров
const SIZE = { title: 64, label: 46, small: 42 }; // главные подписи ≥ 56, остальные ≥ 42 (1080p)

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.sin);
const shadow = `0 4px 14px ${T.carbon}b3`;
const LAND = "#2A2522"; // B9: суша — тёплый уголь
const AGUA = "#7C98A8"; // светлый «acero» для воды и уровня озера (в палитре канала воды-синего нет)
const AGUA_D = "#3E5361";

const Tx: React.FC<{ x: number; y: number; t: string; size?: number; color?: string; anchor?: "start" | "middle" | "end"; weight?: number; font?: string; op?: number; ls?: number }> = ({ x, y, t, size = SIZE.label, color = T.hueso, anchor = "start", weight = 500, font = FONT.oswald, op = 1, ls = 1 }) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={font} fontWeight={weight} fontSize={size} fill={color} opacity={op} stroke={T.carbon} strokeWidth={7} paintOrder="stroke" strokeLinejoin="round" letterSpacing={ls}>
    {t}
  </text>
);
const Title: React.FC<{ t?: string; size?: number }> = ({ t, size = SIZE.title }) => (t ? <Tx x={960} y={GRID.titleY} t={t} size={size} anchor="middle" weight={600} ls={3} /> : null);
const pop = (f: number, at: number, len = IO) => interpolate(f, [at, at + len], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const Pulse: React.FC<{ cx: number; cy: number; f: number; r?: number; color?: string }> = ({ cx, cy, f, r = 14, color = T.lava }) => {
  const k = (f % 45) / 45;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + k * 48} fill="none" stroke={color} strokeWidth={4} opacity={1 - k} />
      <circle cx={cx} cy={cy} r={r} fill={color} stroke={T.carbon} strokeWidth={3} />
    </g>
  );
};

/** Общие поля любой схемы: подложка-кадр и метка ESQUEMA. */
export type StageData = {
  /** файл кадра-подложки в папке ролика (N02.webp …); без него — уголь */
  bg?: string;
  /** яркость подложки, 0–1 (по умолчанию 0,45) */
  bgBright?: number;
  /** размытие подложки, px на 1080p (по умолчанию 8; допустимо 6–10) */
  bgBlur?: number;
  /** метка доверия справа сверху: «ESQUEMA» / «ESQUEMA · ilustrativo» */
  tag?: string;
};

// ── сцена: подложка (размытый тёмный кадр + виньетка) → содержимое с входом/выходом IO кадров → метка ──
const Stage: React.FC<{ d: StageData; dur: number; folder: string; children: React.ReactNode }> = ({ d, dur, folder, children }) => {
  const f = useCurrentFrame();
  const a = Math.min(interpolate(f, [0, IO], [0, 1], clamp), interpolate(f, [dur - IO, dur], [1, 0], clamp));
  const rise = interpolate(f, [0, IO], [12, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const drift = interpolate(f, [0, dur], [1.06, 1.1], clamp); // медленный наезд подложки (без дрожания)
  return (
    <AbsoluteFill style={{ backgroundColor: T.carbon, overflow: "hidden" }}>
      {d.bg ? (
        <Img
          src={staticFile(`${folder}/${d.bg}`)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: `blur(${d.bgBlur ?? 8}px) brightness(${d.bgBright ?? 0.45}) saturate(0.7) sepia(0.12)`, transform: `scale(${drift})` }}
        />
      ) : null}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 50%, ${T.carbon}00 40%, ${T.carbon}b0 100%)` }} />
      <AbsoluteFill style={{ opacity: a, transform: `translateY(${rise}px)` }}>{children}</AbsoluteFill>
      {d.tag ? (
        <div style={{ position: "absolute", right: GRID.mx, top: GRID.top, opacity: a, background: `${T.carbon}b8`, borderRadius: 8, padding: "6px 20px 9px", fontFamily: FONT.oswald, fontWeight: 600, fontSize: SIZE.small, color: T.ceniza, letterSpacing: 1 }}>
          {d.tag}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ── общая основа карты B9: море (тёмная подложка), суша полупрозрачным углём, контуры, кордильера справа ──
// Геометрия: озёра и Риньиуэ — ниже зоны плашки G5; всё в полях 96 px и выше GRID.bottom.
const COAST = "M330 0 C 400 120, 290 220, 350 330 C 420 450, 320 560, 370 690 C 420 800, 340 900, 390 1080";
const MapBase: React.FC<{ sea?: string; id: string }> = ({ sea, id }) => (
  <>
    <defs>
      <pattern id={`hatch-${id}`} width="26" height="22" patternUnits="userSpaceOnUse">
        <path d="M0 18 L13 4 L26 18" fill="none" stroke={T.ceniza} strokeWidth={2} opacity={0.35} />
      </pattern>
    </defs>
    <rect x={0} y={0} width={1920} height={1080} fill={T.carbon} opacity={0.35} />
    <path d={`${COAST} L1920 1080 L1920 0 Z`} fill={LAND} opacity={0.45} />
    <path d={COAST} fill="none" stroke={T.ceniza} strokeWidth={3} opacity={0.8} />
    <rect x={1600} y={0} width={320} height={1080} fill={`url(#hatch-${id})`} />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <path key={i} d={`M400 ${200 + i * 140} C 760 ${160 + i * 140}, 1140 ${250 + i * 140}, 1900 ${190 + i * 140}`} fill="none" stroke={T.ceniza} strokeWidth={1.5} opacity={0.16} />
    ))}
    {sea
      ? sea.split(" ").map((w, i) => <Tx key={i} x={GRID.mx + 14} y={420 + i * 52} t={w} size={SIZE.small} color={T.cenizaClara} weight={500} ls={4} />)
      : null}
  </>
);

// река: точки с востока (сток Риньиуэ) на запад (Корраль); полилиния рисуется по pathLength
const RIVER: [number, number][] = [
  [1290, 575],
  [1210, 598],
  [1120, 590],
  [1040, 615],
  [930, 640],
  [840, 672],
  [740, 700],
  [650, 738],
  [560, 785],
  [480, 808],
  [420, 830],
];
const riverPts = RIVER.map((p) => p.join(",")).join(" ");
const LAKE = { cx: 1380, cy: 560, rx: 96, ry: 46 }; // Риньиуэ
const LAKES: [number, number, number, number][] = [
  [1760, 540, 58, 28],
  [1690, 630, 50, 26],
  [1620, 560, 42, 22],
  [1580, 668, 48, 24],
  [1525, 600, 38, 20],
  [1500, 712, 42, 21],
];
const TOWN = { loslagos: [930, 640], antilhue: [740, 700], pishuinco: [650, 738], valdivia: [560, 785], corral: [420, 830] } as const;

// ── G1 · карта бассейна (режимы «1960» / «1575») ──
export type BasinData = StageData & {
  mode: "1960" | "1575";
  lakes?: string; // «7 LAGOS»
  lake: string; // «RIÑIHUE»
  river?: string;
  tacos?: string;
  towns: { loslagos: string; antilhue: string; valdivia: string; corral: string };
  sea?: string;
  scale?: string;
  y1?: string;
  y2?: string;
  old?: string; // «LAGUNA DE ANIGUA»
  focus?: "taco"; // наезд на район тако
};
const Basin: React.FC<{ d: BasinData; dur: number; folder: string }> = ({ d, dur, folder }) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [8, Math.max(40, dur * 0.7)], [0, 1], { ...clamp, easing: ease });
  const z = d.focus === "taco" ? interpolate(f, [0, dur], [1, 1.25], { ...clamp, easing: ease }) : interpolate(f, [0, dur], [1, 1.05], clamp);
  const town = (p: readonly [number, number], name: string, at: number, big = false, dx = 0, dy = -26) => (
    <g opacity={pop(f, at)}>
      <circle cx={p[0]} cy={p[1]} r={big ? 13 : 10} fill={T.hueso} stroke={T.carbon} strokeWidth={3} />
      <Tx x={p[0] + dx} y={p[1] + dy} t={name} size={big ? 52 : SIZE.label} anchor="middle" weight={600} />
    </g>
  );
  const tacoXY: [number, number][] = [
    [1250, 587],
    [1165, 594],
    [1080, 602],
  ];
  return (
    <Stage d={d} dur={dur} folder={folder}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: d.focus === "taco" ? "1165px 700px" : "960px 600px" }}>
        {/* при наезде подпись моря уходит за левый край — не показываем её совсем */}
        <MapBase sea={d.focus === "taco" ? undefined : d.sea} id="basin" />
        {LAKES.map(([cx, cy, rx, ry], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={AGUA_D} stroke={T.ceniza} strokeWidth={2} opacity={pop(f, i * 3)} />
        ))}
        {d.lakes ? <Tx x={1630} y={810} t={d.lakes} size={SIZE.label} anchor="middle" weight={600} op={pop(f, 14)} /> : null}
        <ellipse cx={LAKE.cx} cy={LAKE.cy} rx={LAKE.rx} ry={LAKE.ry} fill={d.mode === "1575" ? AGUA_D : AGUA} stroke={T.hueso} strokeWidth={3} opacity={pop(f, 10)} />
        {d.mode === "1960" ? <Tx x={LAKE.cx - 20} y={LAKE.cy + 100} t={d.lake} size={52} anchor="middle" weight={600} op={pop(f, 14)} /> : null}
        <polyline points={riverPts} pathLength={1} fill="none" stroke={AGUA} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1} strokeDashoffset={1 - k} />
        {d.river ? <Tx x={1010} y={690} t={d.river} size={SIZE.small} color={T.cenizaClara} anchor="middle" weight={500} op={pop(f, 40)} /> : null}
        {d.mode === "1960"
          ? tacoXY.map(([x, y], i) => (
              <g key={i} opacity={pop(f, 24 + i * 5)}>
                <path d={`M${x - 15} ${y + 15} L${x} ${y - 22} L${x + 15} ${y + 15} Z`} fill={T.lava} stroke={T.carbon} strokeWidth={3} />
              </g>
            ))
          : null}
        {d.mode === "1960" && d.tacos ? <Tx x={1165} y={530} t={d.tacos} size={SIZE.label} color={T.lava} anchor="middle" weight={600} op={pop(f, 36)} /> : null}
        {town(TOWN.loslagos, d.towns.loslagos, Math.round(dur * 0.35), false, 0, -28)}
        {town(TOWN.antilhue, d.towns.antilhue, Math.round(dur * 0.45), false, -20, -28)}
        {town(TOWN.valdivia, d.towns.valdivia, Math.round(dur * 0.58), true, -20, -36)}
        {town(TOWN.corral, d.towns.corral, Math.round(dur * 0.7), false, 100, 30)}
        {d.mode === "1960" ? <Pulse cx={TOWN.valdivia[0]} cy={TOWN.valdivia[1]} f={f} r={12} /> : null}
        {d.mode === "1575" ? (
          <g opacity={pop(f, 30)}>
            <Pulse cx={LAKE.cx} cy={LAKE.cy} f={f} r={12} />
            <circle cx={LAKE.cx} cy={LAKE.cy} r={120} fill="none" stroke={T.lava} strokeWidth={4} strokeDasharray="10 12" />
            {d.y1 ? <Tx x={LAKE.cx} y={LAKE.cy - 148} t={d.y1} size={96} color={T.lava} anchor="middle" weight={900} font={FONT.cinzel} /> : null}
            {d.old ? <Tx x={LAKE.cx} y={LAKE.cy + 174} t={d.old} size={SIZE.small} color={T.cenizaClara} anchor="middle" weight={500} /> : null}
            {d.y2 ? <Tx x={LAKE.cx} y={LAKE.cy + 270} t={d.y2} size={96} color={T.hueso} anchor="middle" weight={900} font={FONT.cinzel} op={pop(f, Math.round(dur * 0.5))} /> : null}
            <Tx x={LAKE.cx - 140} y={LAKE.cy + 16} t={d.lake} size={SIZE.label} anchor="end" weight={600} />
          </g>
        ) : null}
        {d.scale ? (
          <g opacity={0.9}>
            <line x1={1000} y1={850} x2={1300} y2={850} stroke={T.hueso} strokeWidth={4} />
            <line x1={1000} y1={836} x2={1000} y2={864} stroke={T.hueso} strokeWidth={4} />
            <line x1={1300} y1={836} x2={1300} y2={864} stroke={T.hueso} strokeWidth={4} />
            <Tx x={1150} y={900} t={d.scale} size={SIZE.small} anchor="middle" weight={500} />
          </g>
        ) : null}
      </svg>
    </Stage>
  );
};

// ── G10 · карта затопления ──
export type FloodData = StageData & { title: string; towns: string[]; river?: string; sea?: string };
const Flood: React.FC<{ d: FloodData; dur: number; folder: string }> = ({ d, dur, folder }) => {
  const f = useCurrentFrame();
  const pos = [TOWN.loslagos, TOWN.antilhue, TOWN.pishuinco, TOWN.valdivia];
  // подписи разнесены, чтобы соседние пятна не закрывали их: [dx, dy] от точки
  const lab: [number, number][] = [
    [0, -78],
    [0, -78],
    [70, 104],
    [-60, -78],
  ];
  const flow = interpolate(f, [4, dur * 0.8], [0, 1], { ...clamp, easing: ease });
  return (
    <Stage d={d} dur={dur} folder={folder}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <MapBase sea={d.sea} id="flood" />
        <ellipse cx={LAKE.cx} cy={LAKE.cy} rx={LAKE.rx} ry={LAKE.ry} fill={AGUA} stroke={T.hueso} strokeWidth={3} />
        <polyline points={riverPts} fill="none" stroke={AGUA} strokeWidth={8} strokeLinecap="round" opacity={0.9} />
        <polyline points={riverPts} pathLength={1} fill="none" stroke={T.hueso} strokeWidth={4} strokeLinecap="round" strokeDasharray="0.03 0.05" strokeDashoffset={-flow * 0.9} opacity={0.7} />
        {pos.map(([x, y], i) => {
          const at = 14 + i * Math.round(dur * 0.17);
          const g = interpolate(f, [at, at + 30], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={28 + 46 * g} ry={16 + 26 * g} fill={AGUA} opacity={0.5 * g} />
              <ellipse cx={x} cy={y} rx={28 + 46 * g} ry={16 + 26 * g} fill="none" stroke={AGUA} strokeWidth={3} opacity={g} />
              <circle cx={x} cy={y} r={10} fill={T.hueso} stroke={T.carbon} strokeWidth={3} />
              <Tx x={x + lab[i][0]} y={y + lab[i][1]} t={d.towns[i] ?? ""} size={SIZE.label} anchor="middle" weight={600} op={pop(f, at)} />
            </g>
          );
        })}
        <Tx x={960} y={GRID.titleY} t={d.title} size={72} anchor="middle" weight={900} font={FONT.cinzel} ls={3} />
        {d.river ? <Tx x={1150} y={690} t={d.river} size={SIZE.small} color={T.cenizaClara} anchor="middle" weight={500} /> : null}
      </svg>
    </Stage>
  );
};

// ── G2 · схема: земля опустилась ──
export type SubsidData = StageData & { title: string; delta: string; before: string; after: string };
const Subsid: React.FC<{ d: SubsidData; dur: number; folder: string }> = ({ d, dur, folder }) => {
  const f = useCurrentFrame();
  const sink = interpolate(f, [Math.round(dur * 0.25), Math.round(dur * 0.65)], [0, 1], { ...clamp, easing: ease });
  const pxm = 90;
  const y0 = 560;
  const drop = 2 * pxm * sink;
  const house = (x: number, y: number) => (
    <g>
      <rect x={x} y={y - 70} width={90} height={70} fill={T.ceniza} opacity={0.85} />
      <path d={`M${x - 8} ${y - 70} L${x + 45} ${y - 112} L${x + 98} ${y - 70} Z`} fill={T.cenizaClara} opacity={0.85} />
    </g>
  );
  return (
    <Stage d={d} dur={dur} folder={folder}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Title t={d.title} />
        <path d={`M0 ${y0} L900 ${y0} L1000 ${y0 + drop} L1920 ${y0 + drop} L1920 1080 L0 1080 Z`} fill={LAND} opacity={0.9} stroke={T.ceniza} strokeWidth={3} />
        {house(220, y0)}
        {house(440, y0)}
        {house(1180, y0 + drop)}
        {house(1400, y0 + drop)}
        <line x1={900} y1={y0} x2={1760} y2={y0} stroke={T.hueso} strokeWidth={3} strokeDasharray="14 12" opacity={0.8} />
        <g opacity={pop(f, Math.round(dur * 0.55))}>
          <line x1={1660} y1={y0} x2={1660} y2={y0 + 2 * pxm} stroke={T.hueso} strokeWidth={5} />
          <line x1={1635} y1={y0} x2={1685} y2={y0} stroke={T.hueso} strokeWidth={5} />
          <line x1={1635} y1={y0 + 2 * pxm} x2={1685} y2={y0 + 2 * pxm} stroke={T.hueso} strokeWidth={5} />
          <text x={1620} y={y0 - 36} textAnchor="end" fontFamily={FONT.cinzel} fontWeight={900} fontSize={120} fill={T.lava} stroke={T.carbon} strokeWidth={8} paintOrder="stroke">
            {d.delta}
          </text>
        </g>
        <Tx x={485} y={y0 + 96} t={d.before} size={56} anchor="middle" weight={600} ls={3} />
        <Tx x={1270} y={y0 + drop + 96} t={d.after} size={56} anchor="middle" weight={600} ls={3} op={pop(f, Math.round(dur * 0.5))} />
      </svg>
    </Stage>
  );
};

// ── G3 · столбик: +40 млн м³ в день ──
export type BarData = StageData & { big: string; unit: string; sub: string };
const Bar: React.FC<{ d: BarData; dur: number; folder: string }> = ({ d, dur, folder }) => {
  const f = useCurrentFrame();
  const h = interpolate(f, [6, Math.round(dur * 0.5)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const base = 860;
  const H = 560;
  return (
    <Stage d={d} dur={dur} folder={folder}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={260} y1={base} x2={960} y2={base} stroke={T.hueso} strokeWidth={4} />
        <rect x={480} y={base - H * h} width={260} height={H * h} fill={AGUA} stroke={T.hueso} strokeWidth={3} opacity={0.9} />
        <g opacity={pop(f, Math.round(dur * 0.45))}>
          <text x={1010} y={640} fontFamily={FONT.cinzel} fontWeight={900} fontSize={250} fill={T.lava} stroke={T.carbon} strokeWidth={10} paintOrder="stroke">
            {d.big}
          </text>
          <Tx x={1018} y={740} t={d.unit} size={88} weight={600} />
          <Tx x={1018} y={830} t={d.sub} size={64} color={T.cenizaClara} weight={600} ls={3} />
        </g>
      </svg>
    </Stage>
  );
};

// ── G4 · поправка: «20» зачёркнуто → «≈ 78» ──
export type CorrData = StageData & { old: string; neu: string; area: string; source: string };
const Corr: React.FC<{ d: CorrData; dur: number; folder: string }> = ({ d, dur, folder }) => {
  const f = useCurrentFrame();
  const s1 = Math.round(dur * 0.12);
  const s2 = Math.round(dur * 0.34);
  const s3 = Math.round(dur * 0.5);
  const s4 = Math.round(dur * 0.66);
  const strike = interpolate(f, [s2, s2 + 12], [0, 1], clamp);
  const cx = 820; // левее центра: справа сверху — плашка G5
  return (
    <Stage d={d} dur={dur} folder={folder}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g opacity={pop(f, s1)}>
          <text x={cx} y={330} textAnchor="middle" fontFamily={FONT.cinzel} fontWeight={900} fontSize={100} fill={T.cenizaClara} stroke={T.carbon} strokeWidth={8} paintOrder="stroke" opacity={interpolate(f, [s2, s2 + 14], [1, 0.55], clamp)}>
            {d.old}
          </text>
          <line x1={cx - 540 * strike} y1={300} x2={cx + 540 * strike} y2={300} stroke={T.lava} strokeWidth={9} strokeLinecap="round" />
        </g>
        <g opacity={pop(f, s3)}>
          <text x={cx} y={600} textAnchor="middle" fontFamily={FONT.cinzel} fontWeight={900} fontSize={180} fill={T.lava} stroke={T.carbon} strokeWidth={10} paintOrder="stroke">
            {d.neu}
          </text>
        </g>
        <g opacity={pop(f, s4)}>
          <Tx x={cx} y={720} t={d.area} size={80} anchor="middle" weight={600} ls={3} />
        </g>
        <g opacity={pop(f, s4 + 6)}>
          <Tx x={cx} y={860} t={d.source} size={SIZE.small} anchor="middle" color={T.cenizaClara} weight={400} />
        </g>
      </svg>
    </Stage>
  );
};

// ── G6 · силуэт дома (d.floors этажей) и профиль завала, линия уровня озера ──
export type SilData = StageData & { floors: number; level: string; title: string };
const Sil: React.FC<{ d: SilData; dur: number; folder: string }> = ({ d, dur, folder }) => {
  const f = useCurrentFrame();
  const pxm = 20;
  const base = 860;
  const floorM = 3.1;
  const bh = d.floors * floorM * pxm;
  const lvl = interpolate(f, [Math.round(dur * 0.3), Math.round(dur * 0.85)], [0, 26], { ...clamp, easing: ease });
  const ly = base - lvl * pxm;
  return (
    <Stage d={d} dur={dur} folder={folder}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Title t={d.title} />
        <line x1={250} y1={base} x2={250} y2={base - 30 * pxm} stroke={T.hueso} strokeWidth={4} />
        {[0, 10, 20, 30].map((m) => (
          <g key={m}>
            <line x1={250} y1={base - m * pxm} x2={290} y2={base - m * pxm} stroke={T.hueso} strokeWidth={4} />
            <Tx x={232} y={base - m * pxm + 14} t={`${m} M`} size={SIZE.small} anchor="end" weight={600} />
          </g>
        ))}
        <line x1={200} y1={base} x2={1760} y2={base} stroke={T.hueso} strokeWidth={3} opacity={0.7} />
        {/* дом */}
        <rect x={400} y={base - bh} width={220} height={bh} fill={T.ceniza} opacity={0.75} />
        {Array.from({ length: d.floors }, (_, i) =>
          [0, 1, 2].map((j) => <rect key={`${i}${j}`} x={422 + j * 64} y={base - bh + 12 + i * floorM * pxm} width={36} height={floorM * pxm - 24} fill={T.carbon} opacity={0.7} />),
        )}
        {/* завал: профиль выше дома; вода — слева за ним */}
        <rect x={660} y={ly} width={420} height={Math.max(0, base - ly)} fill={AGUA} opacity={0.6} />
        <path d={`M1000 ${base} L1190 ${base - 28.6 * pxm} Q1235 ${base - 29.6 * pxm} 1290 ${base - 28.2 * pxm} L1700 ${base} Z`} fill={T.ceniza} opacity={0.85} stroke={T.cenizaClara} strokeWidth={3} />
        <line x1={660} y1={ly} x2={1080} y2={ly} stroke={AGUA} strokeWidth={6} />
        <text x={700} y={ly - 22} fontFamily={FONT.cinzel} fontWeight={900} fontSize={110} fill={T.lava} stroke={T.carbon} strokeWidth={8} paintOrder="stroke" opacity={pop(f, Math.round(dur * 0.35))}>
          {d.level}
        </text>
      </svg>
    </Stage>
  );
};

// ── G8 · схема размыва: борозда → канава → каньон ──
export type ErosData = StageData & { steps: [string, string, string]; end: string };
const Eros: React.FC<{ d: ErosData; dur: number; folder: string }> = ({ d, dur, folder }) => {
  const f = useCurrentFrame();
  const st = (n: number) => Math.round(dur * (0.08 + n * 0.25));
  const base = 860;
  const cur = f < st(1) ? 1 : f < st(2) ? 2 : 3;
  const dep = interpolate(f, [st(0), st(1), st(2), st(3)], [0, 60, 150, 330], { ...clamp, easing: ease });
  const gush = interpolate(f, [st(2), st(3)], [0, 1], clamp);
  // смена слова — растворение за IO кадров, без скачка
  const stepA = [st(1), st(2)].reduce((v, s) => Math.min(v, interpolate(f, [s - IO, s - 1, s, s + IO], [1, 0, 0, 1], clamp)), 1);
  return (
    <Stage d={d} dur={dur} folder={folder}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform="translate(-192 -172) scale(1.2)">
          <rect x={160} y={base - 300} width={620} height={300} fill={AGUA} opacity={0.55} />
          <path d={`M780 ${base} L860 ${base - 330} L1140 ${base - 330} L1400 ${base} Z`} fill={LAND} opacity={0.92} stroke={T.cenizaClara} strokeWidth={4} />
          <path d={`M ${960} ${base - 330} L ${1000} ${base - 330 + dep} L ${1050} ${base - 330 + dep} L ${1090} ${base - 330} Z`} fill={T.carbon} />
          <path d={`M ${780} ${base - 300} Q ${960} ${base - 330 + dep * 0.4} ${1040} ${base - 330 + dep}`} fill="none" stroke={AGUA} strokeWidth={8} opacity={0.9} />
          <g opacity={gush}>
            <path d={`M ${1040} ${base - 30} Q ${1300} ${base + 30} ${1660} ${base + 20}`} fill="none" stroke={AGUA} strokeWidth={40} opacity={0.7} strokeLinecap="round" />
            <path d={`M ${1040} ${base - 30} Q ${1300} ${base + 30} ${1660} ${base + 20}`} fill="none" stroke={T.hueso} strokeWidth={6} strokeDasharray="30 40" opacity={0.6} />
          </g>
        </g>
        <Tx x={960} y={GRID.titleY + 40} t={d.steps[cur - 1]} size={110} anchor="middle" weight={900} font={FONT.cinzel} color={T.lava} op={stepA} />
        {[1, 2, 3].map((n) => (
          <circle key={n} cx={800 + n * 80} cy={300} r={13} fill={cur >= n ? T.lava : T.ceniza} stroke={T.carbon} strokeWidth={3} opacity={cur >= n ? 1 : 0.5} />
        ))}
        <g opacity={pop(f, st(3) - 2)}>
          <Tx x={960} y={400} t={d.end} size={60} anchor="middle" weight={600} ls={2} />
        </g>
      </svg>
    </Stage>
  );
};

// ── G9 · карточка-цитата (B6 с именем человека); фон — кадр, размытый или затемнённый ──
const shadowQ = shadow;
export type QuoteData = { top?: number; bg: string; blur?: number; dark?: number; name: string; role?: string; quote?: string; source?: string; nameOnly?: boolean };
const Quote: React.FC<{ d: QuoteData; dur: number; folder: string }> = ({ d, dur, folder }) => {
  const f = useCurrentFrame();
  const a = Math.min(interpolate(f, [0, 10], [0, 1], clamp), interpolate(f, [dur - 8, dur], [1, 0], clamp));
  const rise = interpolate(f, [0, 10], [14, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const q = d.quote ?? "";
  const size = q.length > 70 ? 66 : 80;
  return (
    <AbsoluteFill style={{ backgroundColor: T.carbon }}>
      <Img src={staticFile(`${folder}/${d.bg}`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: `blur(${d.blur ?? 0}px)`, transform: "scale(1.08)" }} />
      <AbsoluteFill style={{ background: `${T.carbon}${Math.round(255 * (d.dark ?? 0.55)).toString(16).padStart(2, "0")}` }} />
      <AbsoluteFill style={{ opacity: a }}>
        {d.nameOnly ? (
          <div style={{ position: "absolute", left: 160, right: 160, top: 380, textAlign: "center", transform: `translateY(${rise}px)` }}>
            <div style={{ fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 112, lineHeight: 1.08, color: T.hueso, textShadow: shadowQ, letterSpacing: 3 }}>{d.name}</div>
            <div style={{ margin: "26px auto 20px", width: 160, height: 4, background: T.lava }} />
            {d.role ? <div style={{ fontFamily: FONT.oswald, fontWeight: 500, fontSize: 52, color: T.cenizaClara, letterSpacing: 4 }}>{d.role}</div> : null}
          </div>
        ) : (
          <div style={{ position: "absolute", left: 180, right: 180, top: d.top ?? 270, textAlign: "center", transform: `translateY(${rise}px)` }}>
            <div style={{ fontFamily: FONT.cinzel, fontWeight: 700, fontSize: size, lineHeight: 1.18, color: T.hueso, textShadow: shadowQ }}>{`«${q}»`}</div>
            <div style={{ margin: "34px auto 22px", width: 160, height: 4, background: T.lava }} />
            <div style={{ fontFamily: FONT.oswald, fontWeight: 500, fontSize: 42, color: T.hueso, letterSpacing: 3 }}>{d.name}</div>
            {d.role ? <div style={{ marginTop: 6, fontFamily: FONT.oswald, fontWeight: 400, fontSize: 34, color: T.cenizaClara, letterSpacing: 3 }}>{d.role}</div> : null}
            {d.source ? <div style={{ marginTop: 14, fontFamily: FONT.oswald, fontWeight: 400, fontSize: 32, color: T.cenizaClara }}>{d.source}</div> : null}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── G7 · лист хроники: описание, не цитата (строки — рукописные «каракули» без читаемого текста) ──
export type SheetData = { head: string; sub: string; year: string };
const Sheet: React.FC<{ d: SheetData; dur: number }> = ({ d, dur }) => {
  const f = useCurrentFrame();
  const inn = interpolate(f, [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const out = interpolate(f, [dur - 8, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: T.carbon }}>
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
    </AbsoluteFill>
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
      return <Basin d={spec.data} dur={dur} folder={folder} />;
    case "flood":
      return <Flood d={spec.data} dur={dur} folder={folder} />;
    case "subsid":
      return <Subsid d={spec.data} dur={dur} folder={folder} />;
    case "bar":
      return <Bar d={spec.data} dur={dur} folder={folder} />;
    case "corr":
      return <Corr d={spec.data} dur={dur} folder={folder} />;
    case "sil":
      return <Sil d={spec.data} dur={dur} folder={folder} />;
    case "eros":
      return <Eros d={spec.data} dur={dur} folder={folder} />;
    case "quote":
      return <Quote d={spec.data} dur={dur} folder={folder} />;
    case "sheet":
      return <Sheet d={spec.data} dur={dur} />;
  }
};

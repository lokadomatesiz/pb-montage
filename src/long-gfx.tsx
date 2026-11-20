import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, T } from "./tokens";
import { G2, Topo, Pulse, InkLabel, INK, PAPER } from "./long-maps";

// Графика длинного 1920×1080 (VISUAL-CH2 §7: B1, B2, B4, B6–B10). Время — локальный кадр Sequence; dur — длина в кадрах.
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const shadow = `0 4px 14px ${T.carbon}b3`;
const ease = Easing.inOut(Easing.sin);

export type Gfx =
  | { g: "g1"; towerAtSec: number; growSec: number }
  | { g: "g2"; mode: "region" | "pari" | "two" | "vent" | "final" }
  | { g: "g3" }
  | { g: "g6" }
  | { g: "r6"; step: 0 | 1 | 2 | 3 }
  | { g: "map" }
  | { g: "table"; photos: { src: string; at: number }[] }
  | { g: "life" }
  | { g: "card"; n: number; title: string; date: string; bg: string };

const Frame: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = T.carbon }) => <AbsoluteFill style={{ backgroundColor: bg }}>{children}</AbsoluteFill>;

const Label: React.FC<{ x: number; y: number; text: string; size?: number; color?: string; anchor?: "start" | "middle" | "end"; weight?: number }> = ({ x, y, text, size = 36, color = T.hueso, anchor = "start", weight = 500 }) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={FONT.oswald} fontWeight={weight} fontSize={size} fill={color} stroke={T.carbon} strokeWidth={6} paintOrder="stroke" letterSpacing={1}>
    {text}
  </text>
);

// ── G1 ростомер: конус растёт до 167 м, Torre Latinoamericana ≈ 180 м, человек 1,75 м ──
const G1: React.FC<{ towerAtSec: number; growSec: number; dur: number }> = ({ towerAtSec, growSec }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = f / fps;
  const base = 930;
  const pxPerM = 4.4;
  const grow = interpolate(sec, [0.3, growSec], [0.02, 1], { ...clamp, easing: ease });
  const coneM = 167 * grow;
  const towerOp = interpolate(sec, [towerAtSec, towerAtSec + 0.4], [0, 1], clamp);
  const cx = 1180;
  const tx = 560;
  const th = 180 * pxPerM;
  const tw = (frac: number, half: number) => ({ y: base - th * frac, half });
  const pts = [tw(0, 90), tw(0.2, 90), tw(0.2, 65), tw(0.42, 65), tw(0.42, 44), tw(0.72, 34), tw(0.78, 34), tw(0.78, 14), tw(0.82, 14), tw(0.82, 3), tw(1, 1.2)];
  const poly = [...pts.map((p) => `${tx - p.half},${p.y}`), ...[...pts].reverse().map((p) => `${tx + p.half},${p.y}`)].join(" ");
  const cH = coneM * pxPerM;
  return (
    <Frame>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <radialGradient id="g1warm" cx="62%" cy="86%" r="60%">
          <stop offset="0%" stopColor={T.brasa} stopOpacity={0.35} />
          <stop offset="100%" stopColor={T.carbon} stopOpacity={0} />
        </radialGradient>
        <rect width={1920} height={1080} fill="url(#g1warm)" />
        <line x1={250} y1={base} x2={250} y2={base - th - 20} stroke={T.hueso} strokeWidth={4} />
        {[0, 50, 100, 150].map((m) => (
          <g key={m}>
            <line x1={250} y1={base - m * pxPerM} x2={290} y2={base - m * pxPerM} stroke={T.hueso} strokeWidth={4} />
            <Label x={232} y={base - m * pxPerM + 12} text={`${m}`} size={38} anchor="end" weight={600} />
          </g>
        ))}
        <line x1={200} y1={base} x2={1720} y2={base} stroke={T.hueso} strokeWidth={3} opacity={0.7} />
        <polygon points={poly} fill={T.ceniza} opacity={0.6 * towerOp} />
        <line x1={250} y1={base - th} x2={1700} y2={base - th} stroke={T.hueso} strokeWidth={3} strokeDasharray="16 12" opacity={0.7 * towerOp} />
        <defs>
          <linearGradient id="coneg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.cenizaClara} stopOpacity={0.85} />
            <stop offset="100%" stopColor={T.ceniza} stopOpacity={0.45} />
          </linearGradient>
          <clipPath id="conec">
            <path d={`M ${cx - 430} ${base} Q ${cx - 120} ${base - cH * 0.5} ${cx - 14} ${base - cH} L ${cx + 14} ${base - cH} Q ${cx + 120} ${base - cH * 0.5} ${cx + 430} ${base} Z`} />
          </clipPath>
        </defs>
        <path d={`M ${cx - 430} ${base} Q ${cx - 120} ${base - cH * 0.5} ${cx - 14} ${base - cH} L ${cx + 14} ${base - cH} Q ${cx + 120} ${base - cH * 0.5} ${cx + 430} ${base} Z`} fill="url(#coneg)" stroke={T.hueso} strokeWidth={4} strokeLinejoin="round" />
        <g clipPath="url(#conec)" stroke={T.carbon} strokeWidth={2} opacity={0.35}>
          {Array.from({ length: 18 }, (_, i) => (
            <line key={i} x1={cx - 430 + i * 48} y1={base} x2={cx - 30 + i * 4} y2={base - cH} />
          ))}
        </g>
        {/* человек 1,75 м для масштаба */}
        <rect x={cx + 520} y={base - 1.75 * pxPerM} width={14} height={1.75 * pxPerM} fill={T.ceniza} opacity={0.8} />
        <circle cx={cx + 527} cy={base - 1.75 * pxPerM - 6} r={6} fill={T.ceniza} opacity={0.8} />
        <Label x={cx + 560} y={base - 4} text="1,75 M" size={34} color={T.cenizaClara} />
        <Label x={tx} y={base - th - 34} text="TORRE LATINOAMERICANA ≈ 180 M" size={44} anchor="middle" weight={600} />
        <Label x={cx} y={base + 58} text="PARICUTÍN · DÍA 6" size={44} anchor="middle" weight={600} />
        <text x={cx + 120} y={Math.min(base - 24, base - cH + 90)} textAnchor="start" fontFamily={FONT.cinzel} fontWeight={900} fontSize={120} fill={T.lava} stroke={T.carbon} strokeWidth={8} paintOrder="stroke">
          {Math.round(coneM)} M
        </text>
        <Label x={1840} y={1040} text="Fuente: USGS Bulletin 965-D" size={30} color={T.cenizaClara} anchor="end" weight={400} />
      </svg>
    </Frame>
  );
};

// ── G3 календарь: 15 дней толчков ──
const G3: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [4, dur - 20], [0, 1], clamp);
  const days = Array.from({ length: 16 }, (_, i) => i);
  return (
    <Frame>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 70%, ${T.brasa}40 0%, ${T.carbon}00 60%)` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Label x={960} y={150} text="QUINCE DÍAS DE TEMBLORES" size={80} anchor="middle" weight={600} />
        <line x1={110} y1={880} x2={1810} y2={880} stroke={T.hueso} strokeWidth={5} />
        {days.map((d) => {
          const x = 190 + d * 107;
          const ap = interpolate(t, [d / 16, d / 16 + 0.08], [0, 1], clamp);
          const h = (90 + d * 30 + (d === 15 ? 210 : 0)) * ap;
          const big = d === 15;
          return (
            <g key={d}>
              <rect x={x - 32} y={880 - h} width={64} height={h} fill={big ? T.lava : T.ceniza} opacity={big ? 1 : 0.8} />
              <Label x={x} y={930} text={`${5 + d}`} size={40} anchor="middle" color={T.hueso} />
            </g>
          );
        })}
        <Label x={150} y={1000} text="FEBRERO 1943" size={46} weight={600} />
        <text x={1500} y={270} textAnchor="middle" fontFamily={FONT.cinzel} fontWeight={900} fontSize={210} fill={T.lava} stroke={T.carbon} strokeWidth={10} paintOrder="stroke" opacity={interpolate(t, [0.7, 0.85], [0, 1], clamp)}>
          200+
        </text>
        <Label x={1500} y={340} text="EN UN DÍA" size={72} anchor="middle" weight={600} />
        <Label x={1500} y={400} text="según un testigo" size={46} anchor="middle" color={T.cenizaClara} weight={400} />
        <Label x={1000} y={1000} text="ESQUEMA · temblores por día (ilustrativo)" size={30} color={T.ceniza} weight={400} />
      </svg>
    </Frame>
  );
};

// ── G6 таймлайн 1943 → 1952 ──
const G6: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [6, dur - 30], [0, 1], clamp);
  // ось нелинейная: февраль 1943 и октябрь 1943 растянуты, чтобы подписи не слипались
  const XS: Record<string, number> = { "21 FEB": 260, "26 FEB": 560, "OCT 1943": 880, "1944": 1300, "1952": 1660 };
  const x = (key: number) => 200 + key;
  const marks: { y: number; label: string; sub: string; at: number }[] = [
    { y: XS["21 FEB"] - 200, label: "21 FEB", sub: "10 M", at: 0.02 },
    { y: XS["26 FEB"] - 200, label: "26 FEB", sub: "167 M", at: 0.1 },
    { y: XS["OCT 1943"] - 200, label: "OCT 1943", sub: "+ 360 M", at: 0.25 },
    { y: XS["1944"] - 200, label: "1944", sub: "SAN JUAN CUBIERTO", at: 0.45 },
    { y: XS["1952"] - 200, label: "1952", sub: "SE APAGA", at: 0.85 },
  ];
  return (
    <Frame>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Label x={960} y={190} text="NUEVE AÑOS DE ERUPCIÓN" size={64} anchor="middle" weight={600} />
        <line x1={200} y1={700} x2={1720} y2={700} stroke={T.hueso} strokeWidth={4} />
        <rect x={x(60)} y={690} width={(x(1460) - x(60)) * t} height={20} fill={T.lava} opacity={0.35} />
        <rect x={x(60)} y={690} width={(x(1300 - 200) - x(60)) * Math.min(1, t * 3)} height={20} fill={T.lava} />
        {marks.map((m) => {
          const ap = interpolate(t, [m.at, m.at + 0.06], [0, 1], clamp);
          return (
            <g key={m.label} opacity={ap}>
              <line x1={x(m.y)} y1={700} x2={x(m.y)} y2={560} stroke={T.hueso} strokeWidth={3} />
              <circle cx={x(m.y)} cy={700} r={13} fill={T.lava} stroke={T.hueso} strokeWidth={3} />
              <text x={x(m.y)} y={520} textAnchor="middle" fontFamily={FONT.cinzel} fontWeight={900} fontSize={66} fill={T.lava} stroke={T.carbon} strokeWidth={7} paintOrder="stroke">
                {m.sub.startsWith("SAN") || m.sub === "SE APAGA" ? "" : m.sub}
              </text>
              <Label x={x(m.y)} y={m.sub.startsWith("SAN") || m.sub === "SE APAGA" ? 520 : 770} text={m.sub.startsWith("SAN") || m.sub === "SE APAGA" ? m.sub : m.label} size={40} anchor="middle" weight={600} />
              {m.sub.startsWith("SAN") || m.sub === "SE APAGA" ? <Label x={x(m.y)} y={770} text={m.label} size={40} anchor="middle" color={T.cenizaClara} /> : null}
            </g>
          );
        })}
        <g opacity={interpolate(t, [0.4, 0.55], [0, 1], clamp)}>
          <path d={`M ${x(60)} 840 L ${x(980)} 840`} stroke={T.hueso} strokeWidth={4} fill="none" />
          <Label x={x(60)} y={900} text="EN UN AÑO: > 90 % DE TODO LO QUE EXPULSARÍA" size={44} weight={600} />
        </g>
        <Label x={1840} y={1040} text="Fuente: USGS Bulletin 965-D" size={30} color={T.cenizaClara} anchor="end" weight={400} />
      </svg>
    </Frame>
  );
};

// ── R6 сейсмограмма: 1943 → 2020 (B10) ──
const SWARMS = [1997, 1999, 2000, 2006, 2020, 2021];
const R6: React.FC<{ step: 0 | 1 | 2 | 3; dur: number }> = ({ step, dur }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, dur], [0, 1], clamp);
  const x0 = 140;
  const x1 = 1780;
  const yx = (yr: number) => x0 + ((yr - 1995) / 28) * (x1 - x0);
  const path = React.useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 820; i++) {
      const xx = x0 + (i / 820) * (x1 - x0);
      const yr = 1995 + (i / 820) * 28;
      let amp = 4 + random(`n${i}`) * 5;
      for (const s of SWARMS) {
        const d = Math.abs(yr - (s + 0.5));
        const w = s === 2020 ? 0.9 : 0.35;
        if (d < w) amp += (s === 2020 ? 120 : 60) * (1 - d / w) * (0.5 + random(`b${i}`));
      }
      pts.push(`${xx},${560 + (i % 2 ? -amp : amp)}`);
    }
    return pts.join(" ");
  }, []);
  const draw = step === 0 ? t : 1;
  const hoy = step >= 1 ? 1 : 0;
  const clipW = (x1 - x0) * (step === 0 ? interpolate(t, [0, 0.9], [0, 1], clamp) : 1);
  return (
    <Frame bg="#2b2622">
      <div style={{ position: "absolute", left: 100, top: 190, width: 1720, height: 640, background: hoy ? "#cfd2d0" : T.papel, boxShadow: "0 10px 40px #000a", transform: "rotate(-0.5deg)" }}>
        <svg width={1720} height={640} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 29 }, (_, i) => (
            <line key={i} x1={40 + i * 58.5} y1={20} x2={40 + i * 58.5} y2={620} stroke={T.carbon} strokeWidth={1} opacity={0.18} />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={20} y1={100 + i * 110} x2={1700} y2={100 + i * 110} stroke={T.carbon} strokeWidth={1} opacity={0.14} />
          ))}
        </svg>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, transform: "rotate(-0.5deg)", transformOrigin: "50% 50%" }}>
        <defs>
          <clipPath id="tape">
            <rect x={x0 - 20} y={200} width={clipW + 20} height={620} />
          </clipPath>
        </defs>
        <polyline points={path} fill="none" stroke={T.carbon} strokeWidth={2.4} clipPath="url(#tape)" />
        {[1995, 2000, 2005, 2010, 2015, 2020].map((yr) => (
          <Label key={yr} x={yx(yr)} y={800} text={`${yr}`} size={34} anchor="middle" color={T.carbon} weight={600} />
        ))}
        {step >= 1 ? <rect x={yx(2020)} y={215} width={52} height={590} fill={T.lava} opacity={0.14} /> : null}
        <text x={x0} y={170} fontFamily={FONT.cinzel} fontWeight={900} fontSize={80} fill={T.hueso} stroke={T.carbon} strokeWidth={8} paintOrder="stroke">
          {step === 0 ? "1997 → 2021" : "2020"}
        </text>
      </svg>
      {step === 3 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: `${T.carbon}f2` }}>
          <div style={{ fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 190, color: T.lava, textShadow: shadow, lineHeight: 1 }}>100 000</div>
          <div style={{ fontFamily: FONT.oswald, fontWeight: 600, fontSize: 64, color: T.hueso, textShadow: shadow, letterSpacing: 3 }}>MICROSISMOS · 8–15 KM DE PROFUNDIDAD</div>
          <div style={{ marginTop: 14, fontFamily: FONT.oswald, fontWeight: 400, fontSize: 36, color: T.cenizaClara }}>Fuente: UNAM · Bulletin of Volcanology 2023</div>
        </AbsoluteFill>
      ) : null}
      <div style={{ position: "absolute", left: 96, bottom: 60, fontFamily: FONT.oswald, fontSize: 30, color: T.ceniza, display: draw ? "block" : "none" }}>ESQUEMA · ilustrativo</div>
    </Frame>
  );
};

// ── 1 200 вулканов: точки вспыхивают, счётчик 0 → 1 200 синхронно со словами (≈ 2,9 с от начала) ──
const MapDots: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = f / fps;
  const prog = interpolate(sec, [0.5, 2.9], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const dots = React.useMemo(
    () =>
      Array.from({ length: 1200 }, (_, i) => {
        const a = random(`da${i}`) * Math.PI * 2;
        const r = Math.pow(random(`dr${i}`), 0.7) * 520;
        return { x: 960 + Math.cos(a) * r * 1.5, y: 560 + Math.sin(a) * r * 0.85, r: 2.5 + random(`ds${i}`) * 3.5, at: random(`dt${i}`), ph: random(`dp${i}`) * 6.28 };
      }),
    [],
  );
  const count = Math.round(1200 * prog);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Topo seed={12} strength={0.05} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* поле Мичоакан–Гуанахуато: еле заметный контур */}
        <ellipse cx={960} cy={560} rx={820} ry={470} fill="none" stroke={INK} strokeWidth={2.5} strokeDasharray="4 14" opacity={0.3} />
        <ellipse cx={960} cy={560} rx={760} ry={420} fill={T.lava} opacity={0.05} />
        {dots.map((d, i) => {
          const visible = interpolate(prog, [d.at * 0.95, d.at * 0.95 + 0.04], [0, 1], clamp);
          const flash = interpolate(prog, [d.at * 0.95, d.at * 0.95 + 0.02, d.at * 0.95 + 0.1], [0, 1, 0.5], clamp);
          const tw = 0.75 + 0.25 * Math.sin(sec * 3 + d.ph);
          return (
            <g key={i} opacity={visible * tw}>
              <circle cx={d.x} cy={d.y} r={d.r * 2.2} fill={T.lava} opacity={0.18 * (0.5 + flash)} />
              <circle cx={d.x} cy={d.y} r={d.r * (1 + flash * 0.4)} fill={T.lava} stroke={INK} strokeWidth={0.8} />
            </g>
          );
        })}
        <Pulse cx={1040} cy={600} f={f} r={14} />
        <InkLabel x={1084} y={588} text="PARICUTÍN" size={60} font={FONT.cinzel} weight={900} />
        <InkLabel x={96} y={150} text={`+ ${count.toLocaleString("es-ES").replace(/\./g, " ")} VOLCANES`} size={104} font={FONT.cinzel} weight={900} />
        <InkLabel x={100} y={216} text="en la misma región" size={52} weight={500} color="#4a3a2a" />
        <InkLabel x={96} y={1010} text="ESQUEMA · disposición ilustrativa" size={26} color="#5a4a38" font={FONT.courier} weight={700} />
      </svg>
    </AbsoluteFill>
  );
};

// ── «стол улик»: фото A1–A4 ──
const Table: React.FC<{ photos: { src: string; at: number }[]; folder: string }> = ({ photos, folder }) => {
  const f = useCurrentFrame();
  const rot = [-4, 3, -2, 4];
  const pos = [
    [220, 230],
    [800, 180],
    [1000, 560],
    [320, 590],
  ];
  return (
    <Frame bg="#1c1714">
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${T.brasa}30 0%, ${T.carbon}00 70%)` }} />
      {photos.map((p, i) => {
        const k = interpolate(f, [p.at, p.at + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        return (
          <div key={p.src} style={{ position: "absolute", left: pos[i][0], top: pos[i][1] + (1 - k) * 40, width: 620, height: 440, padding: 14, background: "#e8e2d4", transform: `rotate(${rot[i]}deg)`, opacity: k, boxShadow: "0 12px 34px #000b" }}>
            <Img src={staticFile(`${folder}/${p.src}`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "url(#duo-archivo) contrast(1.06)" }} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", fontFamily: FONT.oswald, fontWeight: 600, fontSize: 46, letterSpacing: 4, color: T.hueso, textShadow: shadow }}>MAPAS · DIBUJOS · MUESTRAS · FOTOGRAFÍAS</div>
    </Frame>
  );
};

const Life: React.FC = () => {
  const f = useCurrentFrame();
  const a = interpolate(f, [0, 10], [0, 1], clamp);
  return (
    <Frame bg="#17120f">
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: a }}>
        <div style={{ fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 230, color: T.hueso, letterSpacing: 24, textShadow: shadow }}>LIFE</div>
        <div style={{ width: 220, height: 5, background: T.lava, margin: "10px 0 26px" }} />
        <div style={{ fontFamily: FONT.courier, fontWeight: 700, fontSize: 60, color: T.cenizaClara, letterSpacing: 4 }}>1943 · FOTOGRAFÍAS DEL VOLCÁN</div>
      </div>
    </Frame>
  );
};

// ── B2 карточка главы «страница тетради» ──
const Card: React.FC<{ n: number; title: string; date: string; bg: string; folder: string; dur: number }> = ({ n, title, date, bg, folder, dur }) => {
  const f = useCurrentFrame();
  const inn = interpolate(f, [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const out = interpolate(f, [dur - 8, dur], [1, 0], clamp);
  const line = interpolate(f, [14, 29], [0, 1], clamp);
  return (
    <Frame>
      <Img src={staticFile(`${folder}/${bg}`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(26px) brightness(0.45)", transform: "scale(1.1)" }} />
      <div style={{ position: "absolute", left: 370, top: 190 + (1 - inn) * 40, width: 1180, height: 700, background: T.papel, transform: "rotate(-1.2deg)", opacity: inn * out, boxShadow: "0 20px 60px #000c", padding: "70px 90px" }}>
        <div style={{ position: "absolute", left: 70, top: 0, bottom: 0, width: 2, background: `${T.lava}80` }} />
        <div style={{ marginLeft: 30, fontFamily: FONT.courier, fontWeight: 400, fontSize: 38, color: "#4a3f33", letterSpacing: 3 }}>{`CAPÍTULO ${n}`}</div>
        <div style={{ marginLeft: 30, marginTop: 40, fontFamily: FONT.cinzel, fontWeight: 900, fontSize: 92, lineHeight: 1.08, color: T.carbon }}>{title}</div>
        <div style={{ marginLeft: 30, marginTop: 14, height: 6, width: `${line * 78}%`, background: T.lava }} />
        <div style={{ position: "absolute", left: 120, bottom: 70, fontFamily: FONT.courier, fontWeight: 400, fontSize: 40, color: "#4a3f33", letterSpacing: 4 }}>{date}</div>
      </div>
    </Frame>
  );
};

export const GfxView: React.FC<{ spec: Gfx; dur: number; folder: string }> = ({ spec, dur, folder }) => {
  switch (spec.g) {
    case "g1":
      return <G1 towerAtSec={spec.towerAtSec} growSec={spec.growSec} dur={dur} />;
    case "g2":
      return <G2 mode={spec.mode} dur={dur} />;
    case "g3":
      return <G3 dur={dur} />;
    case "g6":
      return <G6 dur={dur} />;
    case "r6":
      return <R6 step={spec.step} dur={dur} />;
    case "map":
      return <MapDots dur={dur} />;
    case "table":
      return <Table photos={spec.photos} folder={folder} />;
    case "life":
      return <Life />;
    case "card":
      return <Card n={spec.n} title={spec.title} date={spec.date} bg={spec.bg} folder={folder} dur={dur} />;
  }
};

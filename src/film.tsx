import React from "react";
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame } from "remotion";
import { T } from "./tokens";

// Общий плёночный слой R2: зерно (новое на каждом кадре) + виньетка ≈ 0,28. Только архив: пыль и царапины ≤ 15 %.
export const Film: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Img src={staticFile(`_brand/grain/grain-${f % 8}.png`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "overlay", opacity: 0.55 }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 46%, transparent 55%, ${T.carbon}47 100%)` }} />
    </AbsoluteFill>
  );
};

/** Только виньетка — для быстрых черновиков (зерно-наложение и смена PNG каждый кадр — самое дорогое в рендере). */
export const Vignette: React.FC = () => <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 46%, transparent 55%, ${T.carbon}47 100%)` }} />;

export const Scratches: React.FC = () => {
  const f = useCurrentFrame();
  const show = random(`s${Math.floor(f / 3)}`) < 0.35;
  const x = random(`x${Math.floor(f / 3)}`) * 1080;
  const dust = Array.from({ length: 5 }, (_, i) => ({ x: random(`dx${f}${i}`) * 1080, y: random(`dy${f}${i}`) * 1920, r: 1 + random(`dr${f}${i}`) * 2.5 }));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.12 }}>
      <svg width={1080} height={1920}>
        {show ? <line x1={x} y1={0} x2={x + 2} y2={1920} stroke={T.hueso} strokeWidth={1.5} /> : null}
        {dust.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={T.hueso} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

import React from "react";
import { Composition } from "remotion";
import { ShortTemplate, calculateShortMetadata, ShortProps } from "./Short";
import { sh1 } from "./sh1";
import { sh2 } from "./sh2";
import { ch2 } from "./ch2-01";
import { LongTemplate, calculateLongMetadata, calculateLongFromFile, LongProps, LW, LH } from "./long";

// CH2-03: вся раскладка (клипы, оверлеи, звук, длина) — в public/ch2-03/props.json, который строит scripts/ch203-build.mjs из board.mjs; в репозитории её нет.
const ch203Stub: LongProps = { folder: "ch2-03", voice: "vo.mp3", clips: [], overlays: [], sfx: [], totalSec: 10 };
import { FPS, H, W } from "./tokens";

// id композиции = имя ролика при рендере: npx remotion render <id> ...
const shorts: { id: string; props: ShortProps }[] = [{ id: "CH2-01-SH1", props: sh1 },
  { id: "CH2-01-SH2", props: sh2 },
];

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="CH2-01" component={LongTemplate} width={LW} height={LH} fps={FPS} durationInFrames={FPS * 555} defaultProps={ch2} calculateMetadata={calculateLongMetadata} />
    <Composition id="CH2-03" component={LongTemplate} width={LW} height={LH} fps={FPS} durationInFrames={FPS * 10} defaultProps={ch203Stub} calculateMetadata={calculateLongFromFile("ch2-03/props.json")} />
    <Composition id="CH2-03-FINAL" component={LongTemplate} width={LW} height={LH} fps={FPS} durationInFrames={FPS * 10} defaultProps={ch203Stub} calculateMetadata={calculateLongFromFile("ch2-03/props-final.json")} />
    <Composition id="CH2-03-DRAFT" component={LongTemplate} width={LW} height={LH} fps={FPS} durationInFrames={FPS * 10} defaultProps={ch203Stub} calculateMetadata={calculateLongFromFile("ch2-03/props-draft.json")} />
    {shorts.map((s) => (
      <Composition key={s.id} id={s.id} component={ShortTemplate} width={W} height={H} fps={FPS} durationInFrames={FPS * 40} defaultProps={s.props} calculateMetadata={calculateShortMetadata} />
    ))}
  </>
);

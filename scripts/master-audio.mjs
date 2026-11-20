// Мастер звука: loudnorm в два прохода до −14 LUFS, true peak ≤ −1,5 dBTP; видео копируется без перекодирования.
// Использование: node scripts/master-audio.mjs <вход.mp4> <выход.mp4>
import { spawnSync } from "node:child_process";

const [inp, out] = process.argv.slice(2);
const I = -14;
const TP = -1.5;
const LRA = 11;

const p1 = spawnSync("ffmpeg", ["-hide_banner", "-i", inp, "-vn", "-af", `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" }).stderr;
const j = JSON.parse(p1.slice(p1.lastIndexOf("{"), p1.lastIndexOf("}") + 1));
console.log("до мастера:", j.input_i, "LUFS, TP", j.input_tp);

const af = `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,alimiter=limit=0.84:level=false`;
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", inp, "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "256k", "-ar", "48000", out], { encoding: "utf8" });
if (r.status !== 0) throw new Error(r.stderr);

const p3 = spawnSync("ffmpeg", ["-hide_banner", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const I3 = /I:\s+(-?[\d.]+) LUFS/g;
const P3 = /Peak:\s+(-?[\d.]+) dBFS/g;
let a, b;
let li = "", lp = "";
while ((a = I3.exec(p3))) li = a[1];
while ((b = P3.exec(p3))) lp = b[1];
console.log("после мастера:", li, "LUFS, true peak", lp, "dBFS");

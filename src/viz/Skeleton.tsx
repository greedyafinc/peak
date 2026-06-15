// Live-coach skeleton tracking overlay (pose joints + bones).
type Pt = [number, number];

const JOINTS: Record<string, Pt> = {
  head: [195, 90],
  neck: [195, 118],
  lsh: [170, 128],
  rsh: [220, 128],
  lel: [150, 165],
  rel: [235, 170],
  lwr: [140, 200],
  rwr: [248, 150],
  hip: [195, 205],
  lhip: [178, 208],
  rhip: [212, 208],
  lkn: [170, 265],
  rkn: [218, 268],
  lank: [165, 320],
  rank: [222, 322],
};

const BONES: [string, string][] = [
  ["head", "neck"], ["neck", "lsh"], ["neck", "rsh"], ["lsh", "lel"], ["lel", "lwr"],
  ["rsh", "rel"], ["rel", "rwr"], ["neck", "hip"], ["hip", "lhip"], ["hip", "rhip"],
  ["lhip", "lkn"], ["lkn", "lank"], ["rhip", "rkn"], ["rkn", "rank"],
];

export function Skeleton() {
  return (
    <svg
      viewBox="0 0 390 360"
      preserveAspectRatio="xMidYMid meet"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {BONES.map((b, i) => {
        const a = JOINTS[b[0]];
        const c = JOINTS[b[1]];
        return <line key={"b" + i} x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} stroke="#c6ff3d" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />;
      })}
      {Object.keys(JOINTS).map((k, i) => {
        const j = JOINTS[k];
        return <circle key={"j" + i} cx={j[0]} cy={j[1]} r={4} fill="#0a0b0d" stroke="#c6ff3d" strokeWidth={2} />;
      })}
      <circle cx={JOINTS.head[0]} cy={JOINTS.head[1]} r={13} fill="none" stroke="#c6ff3d" strokeWidth={2} opacity={0.85} />
    </svg>
  );
}

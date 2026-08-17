const VIEW_W = 1440;
const VIEW_H = 3200;

type Peak = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rings: number;
  gap: number;
  seed: number;
  rotation: number;
};

const peaks: Peak[] = [
  { cx: 1120, cy: 260, rx: 42, ry: 28, rings: 16, gap: 36, seed: 0.8, rotation: -0.28 },
  { cx: 220, cy: 980, rx: 48, ry: 32, rings: 14, gap: 40, seed: 1.6, rotation: 0.22 },
  { cx: 980, cy: 1680, rx: 38, ry: 26, rings: 13, gap: 44, seed: 2.4, rotation: -0.14 },
  { cx: 360, cy: 2480, rx: 44, ry: 30, rings: 12, gap: 42, seed: 3.1, rotation: 0.18 },
];

function organicContour(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  rotation: number,
) {
  const points = 64;
  const coords: string[] = [];

  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    const wobble =
      Math.sin(t * 3 + seed) * 0.055 +
      Math.sin(t * 5 + seed * 1.7) * 0.035 +
      Math.cos(t * 2 - seed) * 0.02;
    const px = Math.cos(t) * rx * (1 + wobble);
    const py = Math.sin(t) * ry * (1 + wobble);
    const x = cx + px * Math.cos(rotation) - py * Math.sin(rotation);
    const y = cy + px * Math.sin(rotation) + py * Math.cos(rotation);
    coords.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return `${coords.join(" ")} Z`;
}

function ringsForPeak(peak: Peak) {
  return Array.from({ length: peak.rings }, (_, i) => {
    const scale = 1 + i * (peak.gap / peak.rx);
    return {
      d: organicContour(
        peak.cx,
        peak.cy,
        peak.rx * scale,
        peak.ry * scale,
        peak.seed + i * 0.18,
        peak.rotation,
      ),
      index: (i + 1) % 5 === 0,
    };
  });
}

export function Topography() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        className="h-full min-h-full w-full"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {peaks.map((peak, peakIndex) => (
          <g key={peakIndex}>
            {ringsForPeak(peak).map((ring, ringIndex) => (
              <path
                key={ringIndex}
                d={ring.d}
                stroke="white"
                strokeWidth={ring.index ? 1.15 : 0.7}
                strokeOpacity={ring.index ? 0.14 : 0.075}
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

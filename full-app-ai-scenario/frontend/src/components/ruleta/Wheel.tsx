import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../lib/constants/categories';
import type { CategoryName } from '../../lib/game/types';

const VIEWBOX = 500;
const CENTER = VIEWBOX / 2;
const RADIUS = 250;

/** Segment stroke and text colors, mirroring the canonical wheel design. */
const SEGMENT_TEXT_COLOR: Record<CategoryName, string> = {
  arte: '#FFFFFF',
  historia: '#1F1500',
  deportes: '#FFFFFF',
  entretenimiento: '#FFFFFF',
  geografia: '#FFFFFF',
  ciencia: '#022B20',
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function pointOnCircle(angleDegrees: number): { x: number; y: number } {
  return {
    x: CENTER + RADIUS * Math.sin(toRadians(angleDegrees)),
    y: CENTER - RADIUS * Math.cos(toRadians(angleDegrees)),
  };
}

function segmentPath(startDegrees: number, endDegrees: number): string {
  const start = pointOnCircle(startDegrees);
  const end = pointOnCircle(endDegrees);
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y} Z`;
}

interface WheelProps {
  categories: readonly CategoryName[];
  rotation: number;
}

export default function Wheel({ categories, rotation }: WheelProps) {
  const segmentDegrees = 360 / categories.length;

  return (
    <div
      data-testid="roulette-wheel"
      className="wheel-transition h-full w-full overflow-hidden rounded-full"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-full w-full">
        {categories.map((name, index) => {
          const start = index * segmentDegrees;
          const end = (index + 1) * segmentDegrees;
          const mid = start + segmentDegrees / 2;
          const label = CATEGORY_LABELS[name];
          const fontSize = label.length > 8 ? 13 : 18;

          return (
            <g key={name} data-testid="wheel-segment" data-category={name}>
              <path
                d={segmentPath(start, end)}
                fill={CATEGORY_COLORS[name]}
                stroke="#251630"
                strokeWidth={3}
              />
              <g transform={`rotate(${mid} ${CENTER} ${CENTER})`}>
                <text
                  x={CENTER}
                  y={85}
                  fill={SEGMENT_TEXT_COLOR[name]}
                  textAnchor="middle"
                  fontSize={fontSize}
                  fontWeight={700}
                  letterSpacing={1}
                  fontFamily="Space Grotesk, sans-serif"
                >
                  {label}
                </text>
                <text
                  x={CENTER}
                  y={118}
                  fill={SEGMENT_TEXT_COLOR[name]}
                  textAnchor="middle"
                  fontSize={26}
                  fontFamily="Material Symbols Outlined"
                >
                  {CATEGORY_ICONS[name]}
                </text>
              </g>
            </g>
          );
        })}
        <circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={RADIUS - 2}
          stroke="#120b18"
          strokeWidth={5}
        />
      </svg>
    </div>
  );
}

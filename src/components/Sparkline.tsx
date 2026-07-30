import Svg, {Circle, Defs, LinearGradient, Path, Stop} from 'react-native-svg';
import {colors} from '../../assets/colors';

type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
};

type Point = [number, number];

// Suaviza la línea trazando una curva cuadrática hasta el punto medio de cada segmento
const buildSmoothPath = (points: Point[]): string => {
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    d += ` Q ${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last[0]},${last[1]}`;
  return d;
};

export const Sparkline = ({data, width = 76, height = 32, color = colors.accent}: Props) => {
  if (data.length < 2) {
    return null;
  }
  const pad = 3;
  const min = Math.min(...data);
  const range = Math.max(...data) - min || 1;
  const points: Point[] = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (width - 2 * pad),
    height - pad - ((v - min) / range) * (height - 2 * pad),
  ]);
  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1][0]},${height} L ${points[0][0]},${height} Z`;
  const [ex, ey] = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#sparkFill)" />
      <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={ex} cy={ey} r={2.6} fill={color} />
    </Svg>
  );
};

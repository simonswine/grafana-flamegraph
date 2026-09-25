import { getBarColorByDiff, getBarColorByPackage, getBarColorByValue } from './FlameGraph/colors';
import { type ColorScheme, type ColorSchemeDiff } from './types';

export function getSymbolColor(label: string, value: number, total: number, right: number,
  totalRight: number, isLight: boolean, scheme: ColorScheme | ColorSchemeDiff,
  diffMode: 'proportionalDiff' | 'absoluteDiff' = 'proportionalDiff') {
  if (scheme === 'default' || scheme === 'diffColorBlind') {
    return getBarColorByDiff(value, right, total, totalRight,
      scheme === 'diffColorBlind' ? 'diffColorBlind' : 'default', diffMode).toHexString();
  }
  if (scheme === 'valueBased') return getBarColorByValue(value, total, 0, 1).toHexString();
  return getBarColorByPackage(label, isLight).toHexString();
}

/** A numeric cell with a 3px bar showing the value's share of its profile total. */
export function TableMetricCell({ value, total, display, color, label }: {
  value: number;
  total: number;
  display: string;
  color: string;
  label: string;
}) {
  const percent = total > 0 ? Math.min(100, Math.max(0, value / total * 100)) : 0;
  return <td className="fg-tt-numeric-cell fg-tt-metric-cell">
    <span>{display}</span>
    <div className="fg-tt-metric-track" role="img" aria-label={`${label}: ${percent.toFixed(2)}% of profile`}>
      <div className="fg-tt-metric-bar" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  </td>;
}

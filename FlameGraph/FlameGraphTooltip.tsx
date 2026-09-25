import { createPortal } from 'react-dom';

import {
  type CollapseConfig,
  type FlameGraphDataContainer,
  type LevelItem,
} from './dataTransform';

import './FlameGraphTooltip.css';

type Props = {
  data: FlameGraphDataContainer;
  totalTicks: number;
  diffMode?: 'proportionalDiff' | 'absoluteDiff';
  position?: { x: number; y: number };
  item?: LevelItem;
  collapseConfig?: CollapseConfig;
};

const FlameGraphTooltip = ({
  data,
  item,
  totalTicks,
  diffMode,
  position,
  collapseConfig,
}: Props) => {
  if (!(item && position)) {
    return null;
  }

  const tooltipData = getTooltipData(data, item, totalTicks);
  const diff = data.isDiffFlamegraph() ? getDiffTooltipData(data, item, totalTicks, diffMode) : undefined;

  return createPortal(
    <div
      className="fg-tooltip"
      style={{ left: position.x + 15, top: position.y }}
      role="tooltip"
      aria-live="polite"
    >
      <div className="fg-tooltip-content">
        <p className="fg-tooltip-name">
          {data.getLabel(item.itemIndexes[0])}
          {collapseConfig && collapseConfig.collapsed ? (
            <span>
              <br />
              and {collapseConfig.items.length} similar items
            </span>
          ) : (
            ''
          )}
        </p>
        {diff && <table className="fg-tooltip-diff"><thead><tr><th></th><th>Baseline</th><th>Comparison</th><th>Diff</th></tr></thead>
          <tbody><tr><th>{diffMode === 'absoluteDiff' ? 'Samples' : 'Total'}</th><td>{diff.baseline}</td><td>{diff.comparison}</td><td>{diff.change}</td></tr>
          <tr><th>Self</th><td>{diff.selfBaseline}</td><td>{diff.selfComparison}</td><td></td></tr></tbody></table>}
        {!diff && <p className="fg-tooltip-last">
          {tooltipData.unitTitle}
          <br />
          Total: <b>{tooltipData.unitValue}</b> ({tooltipData.percentValue}%)
          <br />
          Self: <b>{tooltipData.unitSelf}</b> ({tooltipData.percentSelf}%)
          <br />
          Samples: <b>{tooltipData.samples}</b>
        </p>}
      </div>
    </div>,
    document.body,
  );
};

type TooltipData = {
  percentValue: number;
  percentSelf: number;
  unitTitle: string;
  unitValue: string;
  unitSelf: string;
  samples: string;
};

export const getTooltipData = (
  data: FlameGraphDataContainer,
  item: LevelItem,
  totalTicks: number,
): TooltipData => {
  const displayValue = data.valueDisplayProcessor(item.value);
  const displaySelf = data.getSelfDisplay(item.itemIndexes);

  const percentValue =
    Math.round(10000 * (displayValue.numeric / totalTicks)) / 100;
  const percentSelf =
    Math.round(10000 * (displaySelf.numeric / totalTicks)) / 100;
  let unitValue = displayValue.text + displayValue.suffix;
  let unitSelf = displaySelf.text + displaySelf.suffix;

  const unitTitle = data.getUnitTitle();
  if (unitTitle === 'Count') {
    if (!displayValue.suffix) {
      // Makes sure we don't show 123undefined or something like that if suffix isn't defined
      unitValue = displayValue.text;
    }
    if (!displaySelf.suffix) {
      unitSelf = displaySelf.text;
    }
  }

  return {
    percentValue,
    percentSelf,
    unitTitle,
    unitValue,
    unitSelf,
    samples: displayValue.numeric.toLocaleString(),
  };
};

export function getDiffTooltipData(data: FlameGraphDataContainer, item: LevelItem, totalTicks: number,
  diffMode: 'proportionalDiff' | 'absoluteDiff' = 'proportionalDiff') {
  const totalRight = data.getLevels()[0]?.[0]?.valueRight ?? 0;
  const totalLeft = totalTicks - totalRight;
  const right = item.valueRight ?? 0;
  const left = item.value - right;
  const pct = (value: number, total: number) => total ? value / total * 100 : 0;
  const baseline = pct(left, totalLeft);
  const comparison = pct(right, totalRight);
  if (diffMode === 'absoluteDiff') {
    const formatted = data.valueDisplayProcessor(Math.abs(right - left));
    return {
      baseline: data.valueDisplayProcessor(left).text + data.valueDisplayProcessor(left).suffix,
      comparison: data.valueDisplayProcessor(right).text + data.valueDisplayProcessor(right).suffix,
      change: `${right >= left ? '+' : '−'}${formatted.text}${formatted.suffix ?? ''}`,
      selfBaseline: data.valueDisplayProcessor(data.getSelf(item.itemIndexes)).text,
      selfComparison: data.valueDisplayProcessor(data.getSelfRight(item.itemIndexes)).text,
    };
  }
  return {
    baseline: `${baseline.toFixed(2)}%`,
    comparison: `${comparison.toFixed(2)}%`,
    change: baseline ? `${((comparison - baseline) / baseline * 100).toFixed(2)}%` : '—',
    selfBaseline: `${pct(data.getSelf(item.itemIndexes), totalLeft).toFixed(2)}%`,
    selfComparison: `${pct(data.getSelfRight(item.itemIndexes), totalRight).toFixed(2)}%`,
  };
}

export default FlameGraphTooltip;

import { useMemo, useState } from 'react';
import type { FlameGraphDataContainer, LevelItem } from '../FlameGraph/dataTransform';
import './StacktraceTable.css';

export function StacktraceTable({ data, diffMode, search, onSymbolClick }: {
  data: FlameGraphDataContainer;
  diffMode?: 'proportionalDiff' | 'absoluteDiff';
  search: string;
  onSymbolClick?: (label: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));
  const [sort, setSort] = useState<'total' | 'self'>('total');
  const roots = data.getLevels()[0] ?? [];
  const total = roots.reduce((sum, root) => sum + root.value, 0);
  const totalRight = roots.reduce((sum, root) => sum + (root.valueRight ?? 0), 0);
  const totalLeft = total - totalRight;
  const isDiff = data.isDiffFlamegraph();
  const matcher = useMemo(() => {
    if (!search) return undefined;
    try { return new RegExp(search, 'i'); } catch { return undefined; }
  }, [search]);
  const rows: LevelItem[] = [];
  const visit = (nodes: LevelItem[]) => {
    for (const node of [...nodes].sort((a, b) => sort === 'self'
      ? data.getSelf(b.itemIndexes) - data.getSelf(a.itemIndexes)
      : b.value - a.value)) {
      rows.push(node);
      if (expanded.has(node.itemIndexes[0])) visit(node.children);
    }
  };
  visit(roots);
  const format = (value: number) => {
    const display = data.valueDisplayProcessor(value);
    return `${display.text}${display.suffix ?? ''}`;
  };
  return <div className="fg-stacktrace" data-testid="callTree">
    <table><thead><tr><th>Function</th>{isDiff ? <><th>Baseline</th><th>Comparison</th><th>Diff</th></> : <><th><button type="button" onClick={() => setSort('self')}>Self</button></th><th><button type="button" onClick={() => setSort('total')}>Total</button></th></>}</tr></thead>
      <tbody>{rows.map((node) => {
        const id = node.itemIndexes[0];
        const label = data.getLabel(id);
        const self = data.getSelf(node.itemIndexes);
        return <tr key={id} className={matcher?.test(label) ? 'fg-stacktrace-match' : ''}>
          <td><div className="fg-stacktrace-function" style={{ paddingLeft: node.level * 16 }}>
            {node.children.length > 0 ? <button type="button" aria-label={`${expanded.has(id) ? 'Collapse' : 'Expand'} ${label}`} aria-expanded={expanded.has(id)} onClick={() => setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>{expanded.has(id) ? '⌄' : '›'}</button> : <span className="fg-stacktrace-spacer" />}
            <button type="button" title={label} onClick={() => onSymbolClick?.(label)}>{label}</button>
          </div></td>
          {isDiff ? (() => {
            const baseline = totalLeft ? (node.value - (node.valueRight ?? 0)) / totalLeft * 100 : 0;
            const comparison = totalRight ? (node.valueRight ?? 0) / totalRight * 100 : 0;
            if (diffMode === 'absoluteDiff') {
              const left = node.value - (node.valueRight ?? 0), right = node.valueRight ?? 0;
              const delta = right - left;
              return <><td>{format(left)}</td><td>{format(right)}</td>
                <td>{delta >= 0 ? '+' : '−'}{format(Math.abs(delta))}</td></>;
            }
            return <><td>{baseline.toFixed(2)}%</td><td>{comparison.toFixed(2)}%</td>
              <td>{baseline ? `${((comparison - baseline) / baseline * 100).toFixed(2)}%` : '—'}</td></>;
          })() : <><td>{format(self)} <small>{total ? (self / total * 100).toFixed(2) : '0.00'}%</small></td>
          <td>{format(node.value)} <small>{total ? (node.value / total * 100).toFixed(2) : '0.00'}%</small></td></>}
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

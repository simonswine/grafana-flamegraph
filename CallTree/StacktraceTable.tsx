import { useMemo, useState } from 'react';
import type {
  FlameGraphDataContainer,
  LevelItem,
} from '../FlameGraph/dataTransform';
import { Icon } from '../Icon';
import { getSymbolColor, TableMetricCell } from '../TableMetricCell';
import { useIsLight } from '../theme';
import type { ColorScheme, ColorSchemeDiff } from '../types';
import '../TopTable/FlameGraphTopTableContainer.css';
import './StacktraceTable.css';

type SortColumn = 'self' | 'total';

export function StacktraceTable({
  data,
  diffMode,
  colorScheme,
  search,
  onSymbolClick,
}: {
  data: FlameGraphDataContainer;
  diffMode?: 'proportionalDiff' | 'absoluteDiff';
  colorScheme?: ColorScheme | ColorSchemeDiff;
  search: string;
  onSymbolClick?: (label: string) => void;
}) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));
  const [sort, setSort] = useState<{ column: SortColumn; descending: boolean }>(
    { column: 'total', descending: true },
  );
  const roots = data.getLevels()[0] ?? [];
  const total = roots.reduce((sum, root) => sum + root.value, 0);
  const totalRight = roots.reduce(
    (sum, root) => sum + (root.valueRight ?? 0),
    0,
  );
  const totalLeft = total - totalRight;
  const isDiff = data.isDiffFlamegraph();
  const matcher = useMemo(() => {
    if (!search) return undefined;
    try {
      return new RegExp(search, 'i');
    } catch {
      return undefined;
    }
  }, [search]);
  const rows: Array<{
    node: LevelItem;
    continuations: boolean[];
    hasNext: boolean;
  }> = [];
  const visit = (nodes: LevelItem[], continuations: boolean[] = []) => {
    const sorted = [...nodes].sort((a, b) => {
      const value = (item: LevelItem) =>
        sort.column === 'self' ? data.getSelf(item.itemIndexes) : item.value;
      return (value(a) - value(b)) * (sort.descending ? -1 : 1);
    });
    sorted.forEach((node, index) => {
      const hasNext = index < sorted.length - 1;
      rows.push({ node, continuations, hasNext });
      if (expanded.has(node.itemIndexes[0]))
        visit(node.children, [...continuations, hasNext]);
    });
  };
  visit(roots);
  const format = (value: number) => {
    const display = data.valueDisplayProcessor(value);
    return `${display.text}${display.suffix ?? ''}`;
  };
  const sortHeader = (column: SortColumn) => (
    <button
      type="button"
      className="fg-tt-sort-btn"
      aria-label={`Sort by ${column}`}
      onClick={() =>
        setSort((current) => ({
          column,
          descending: current.column === column ? !current.descending : true,
        }))
      }
    >
      {column === 'self' ? 'Self' : 'Total'}
      {sort.column === column && (
        <Icon name={sort.descending ? 'angle-down' : 'angle-up'} size={12} />
      )}
    </button>
  );

  return (
    <div
      className={`fg-tt-container fg-stacktrace${isDiff ? ' fg-stacktrace-diff' : ''}`}
      data-testid="callTree"
    >
      <div className="fg-tt-scroll">
        <table className="fg-tt-table">
          <thead className="fg-tt-thead">
            <tr className="fg-tt-header-row">
              <th
                className="fg-tt-action-header"
                aria-label="Expand or collapse"
              />
              <th className="fg-tt-symbol-header">Function</th>
              {isDiff ? (
                <>
                  <th className="fg-tt-numeric-header">Baseline</th>
                  <th className="fg-tt-numeric-header">Comparison</th>
                  <th className="fg-tt-numeric-header">Diff</th>
                </>
              ) : (
                <>
                  <th className="fg-tt-numeric-header">{sortHeader('self')}</th>
                  <th className="fg-tt-numeric-header">
                    {sortHeader('total')}
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ node, continuations, hasNext }) => {
              const id = node.itemIndexes[0];
              const label = data.getLabel(id);
              const self = data.getSelf(node.itemIndexes);
              const symbolColor = getSymbolColor(
                label,
                node.value,
                total,
                node.valueRight ?? 0,
                totalRight,
                isLight,
                colorScheme ?? 'packageBased',
                diffMode,
              );
              const metricCell = (
                value: number,
                profileTotal: number,
                display: string,
                title: string,
              ) => (
                <TableMetricCell
                  label={title}
                  value={value}
                  total={profileTotal}
                  display={display}
                  color={symbolColor}
                />
              );
              const isExpanded = expanded.has(id);
              const numericCell = (value: string, color?: string) => (
                <td
                  className="fg-tt-numeric-cell"
                  style={color ? { color } : undefined}
                >
                  {value}
                </td>
              );
              return (
                <tr
                  key={id}
                  className={`fg-tt-row${matcher?.test(label) ? ' fg-stacktrace-match' : ''}`}
                  style={{ height: 25 }}
                >
                  <td className="fg-tt-action-cell">
                    {node.children.length > 0 && (
                      <button
                        type="button"
                        className="fg-tt-action-btn"
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${label}`}
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          })
                        }
                      >
                        <Icon
                          name={isExpanded ? 'angle-down' : 'angle-right'}
                          size={14}
                        />
                      </button>
                    )}
                  </td>
                  <td className="fg-tt-symbol-cell" title={label}>
                    <div className="fg-stacktrace-symbol">
                      {node.level > 0 && (
                        <>
                          {continuations.slice(1).map((continues, depth) => (
                            <span
                              key={depth}
                              className={`fg-stacktrace-guide${continues ? ' fg-stacktrace-guide-continuation' : ''}`}
                              aria-hidden="true"
                            />
                          ))}
                          <span
                            className={`fg-stacktrace-guide fg-stacktrace-branch${hasNext ? ' fg-stacktrace-guide-continuation' : ''}`}
                            aria-hidden="true"
                          />
                        </>
                      )}
                      <button
                        type="button"
                        className="fg-tt-symbol-link fg-stacktrace-link"
                        onClick={() => onSymbolClick?.(label)}
                      >
                        {label}
                      </button>
                    </div>
                  </td>
                  {isDiff ? (
                    (() => {
                      const left = node.value - (node.valueRight ?? 0),
                        right = node.valueRight ?? 0;
                      if (diffMode === 'absoluteDiff') {
                        const delta = right - left;
                        return (
                          <>
                            {metricCell(
                              left,
                              totalLeft,
                              format(left),
                              'Baseline',
                            )}
                            {metricCell(
                              right,
                              totalRight,
                              format(right),
                              'Comparison',
                            )}
                            {numericCell(
                              `${delta >= 0 ? '+' : '−'}${format(Math.abs(delta))}`,
                              delta > 0 ? 'var(--red-300)' : 'var(--green-300)',
                            )}
                          </>
                        );
                      }
                      const baseline = totalLeft ? (left / totalLeft) * 100 : 0;
                      const comparison = totalRight
                        ? (right / totalRight) * 100
                        : 0;
                      const change = baseline
                        ? ((comparison - baseline) / baseline) * 100
                        : 0;
                      return (
                        <>
                          {metricCell(
                            left,
                            totalLeft,
                            `${baseline.toFixed(2)}%`,
                            'Baseline',
                          )}
                          {metricCell(
                            right,
                            totalRight,
                            `${comparison.toFixed(2)}%`,
                            'Comparison',
                          )}
                          {numericCell(
                            baseline ? `${change.toFixed(2)}%` : '—',
                            change > 0 ? 'var(--red-300)' : 'var(--green-300)',
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <>
                      {metricCell(self, total, format(self), 'Self')}
                      {metricCell(
                        node.value,
                        total,
                        format(node.value),
                        'Total',
                      )}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

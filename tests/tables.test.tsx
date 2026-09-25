import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StacktraceTable } from '../CallTree/StacktraceTable';
import TopTable from '../TopTable/FlameGraphTopTableContainer';
import { FlameGraphDataContainer, FieldType, type DataFrame } from '../FlameGraph/dataTransform';

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const frame: DataFrame = {
  length: 3,
  fields: [
    { name: 'label', type: FieldType.string, values: ['root', 'child', 'leaf'], config: {} },
    { name: 'level', type: FieldType.number, values: [0, 1, 2], config: {} },
    { name: 'value', type: FieldType.number, values: [100, 50, 25], config: {} },
    { name: 'self', type: FieldType.number, values: [50, 25, 25], config: {} },
  ],
};
const data = new FlameGraphDataContainer(frame, { collapsing: false });

it('uses top-table styles and value formatting while retaining expand/collapse', async () => {
  const user = userEvent.setup();
  const { container, rerender } = render(<TopTable data={data} onSymbolClick={() => {}} onSearch={() => {}} onSandwich={() => {}} />);
  expect(container.querySelector('.fg-tt-container .fg-tt-table .fg-tt-row')).toBeTruthy();
  const topRoot = screen.getByText('root').closest('tr')!;
  expect(within(topRoot).getByRole('img', { name: 'Self: 50.00% of profile' }).querySelector('.fg-tt-metric-bar')?.getAttribute('style')).toContain('width: 50%');
  expect(within(topRoot).getByRole('img', { name: 'Total: 100.00% of profile' }).querySelector('.fg-tt-metric-bar')?.getAttribute('style')).toContain('width: 100%');
  rerender(<StacktraceTable data={data} search="" />);
  expect(container.querySelector('.fg-tt-container .fg-tt-table .fg-tt-row')).toBeTruthy();
  const stackRoot = screen.getByText('root').closest('tr')!;
  expect(stackRoot.querySelectorAll('.fg-tt-numeric-cell')).toHaveLength(2);
  expect(within(stackRoot).getByRole('img', { name: 'Self: 50.00% of profile' }).querySelector('.fg-tt-metric-bar')?.getAttribute('style')).toContain('width: 50%');
  expect(screen.queryByText('leaf')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Expand child' }));
  const leafRow = screen.getByText('leaf').closest('tr')!;
  expect(leafRow.querySelectorAll('.fg-stacktrace-guide')).toHaveLength(2);
  expect(leafRow.querySelector('.fg-stacktrace-branch')).toBeTruthy();
  expect(screen.getByText('root').closest('tr')?.querySelector('.fg-stacktrace-guide')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Collapse child' }));
  expect(screen.queryByText('leaf')).toBeNull();
});

it('uses each side of a diff profile as the 100% reference', () => {
  const diffData = new FlameGraphDataContainer({
    ...frame,
    fields: [
      ...frame.fields,
      { name: 'valueRight', type: FieldType.number, values: [200, 50, 25], config: {} },
      { name: 'selfRight', type: FieldType.number, values: [150, 25, 25], config: {} },
    ],
  }, { collapsing: false });
  const { container } = render(<StacktraceTable data={diffData} diffMode="absoluteDiff" search="" />);
  const child = screen.getByText('child').closest('tr')!;
  const bars = child.querySelectorAll<HTMLElement>('.fg-tt-metric-bar');
  expect(bars[0].style.width).toBe('50%'); // 50 / 100 baseline
  expect(bars[1].style.width).toBe('25%'); // 50 / 200 comparison
  expect(container.querySelector('.fg-tt-metric-track')).toBeTruthy();
});

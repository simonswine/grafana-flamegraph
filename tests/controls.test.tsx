import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  type DataFrame,
  FieldType,
  type FlameGraphDataContainer,
} from '../FlameGraph/dataTransform';
import FlameGraphContainer from '../FlameGraphContainer';

vi.mock('../FlameGraph/FlameGraph', () => ({
  default: ({
    data,
    collapsedMap,
    textAlign,
    colorScheme,
  }: {
    data: FlameGraphDataContainer;
    collapsedMap: ReturnType<FlameGraphDataContainer['getCollapsedMap']>;
    textAlign: string;
    colorScheme: string;
  }) => (
    <div
      data-testid="graph"
      data-align={textAlign}
      data-scheme={colorScheme}
      data-profile={
        data.isDiffFlamegraph()
          ? 'diff'
          : data.getValue(0) === 100
            ? 'baseline'
            : 'comparison'
      }
      data-collapsed={
        Array.from(collapsedMap.values()).every((group) => group.collapsed)
          ? 'yes'
          : 'no'
      }
    />
  ),
}));
vi.mock('../TopTable/FlameGraphTopTableContainer', () => ({
  default: ({ data }: { data: FlameGraphDataContainer }) => (
    <div data-testid="table" data-value={data.getValue(0)} />
  ),
}));
vi.mock('../CallTree/StacktraceTable', () => ({
  StacktraceTable: ({ data }: { data: FlameGraphDataContainer }) => (
    <div data-testid="stacktrace" data-value={data.getValue(0)} />
  ),
}));

const values = [100, 90, 89.9];
const data: DataFrame = {
  length: 3,
  fields: [
    {
      name: 'label',
      type: FieldType.string,
      values: ['root', 'parent', 'a.long.name.that.will.not.fit.in.the.bar'],
      config: {},
    },
    { name: 'level', type: FieldType.number, values: [0, 1, 2], config: {} },
    { name: 'value', type: FieldType.number, values, config: {} },
    {
      name: 'self',
      type: FieldType.number,
      values: [10, 0.1, 89.9],
      config: {},
    },
    {
      name: 'valueRight',
      type: FieldType.number,
      values: [200, 180, 179.9],
      config: {},
    },
    {
      name: 'selfRight',
      type: FieldType.number,
      values: [20, 0.1, 179.9],
      config: {},
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('selects data independently in both panes', async () => {
  const user = userEvent.setup();
  render(<FlameGraphContainer data={data} />);
  const layout = screen.getByRole('group', { name: 'Layout' });
  expect(layout.closest('.fg-header')).toBeTruthy();
  expect(
    screen
      .getByText('Colors')
      .closest('.fg-header')
      ?.querySelector('.fg-cs-button'),
  ).toBeTruthy();
  expect(
    screen
      .getByText('Grouping')
      .closest('.fg-header')
      ?.querySelector('.fg-header-btn-group'),
  ).toBeTruthy();
  const left = screen.getByRole('group', { name: 'Left pane data' });
  const right = screen.getByRole('group', { name: 'Right pane data' });
  expect(
    within(left)
      .getByRole('button', { name: 'Baseline' })
      .getAttribute('aria-pressed'),
  ).toBe('true');
  expect(
    within(right)
      .getByRole('button', { name: 'Comparison' })
      .getAttribute('aria-pressed'),
  ).toBe('true');
  expect(screen.getByTestId('table').getAttribute('data-value')).toBe('100');
  expect(screen.getByTestId('graph').getAttribute('data-profile')).toBe(
    'comparison',
  );
  await user.click(
    within(right).getByRole('button', { name: 'Proportional diff' }),
  );
  expect(screen.getByTestId('graph').getAttribute('data-profile')).toBe('diff');
  expect(screen.getByTestId('table').getAttribute('data-value')).toBe('100');
  await user.click(within(left).getByRole('button', { name: 'Comparison' }));
  expect(screen.getByTestId('table').getAttribute('data-value')).toBe('200');
});

it('expand/collapse acts on visible baseline and comparison graphs, and alignment updates both', async () => {
  const user = userEvent.setup();
  render(<FlameGraphContainer data={data} />);
  await user.click(
    within(screen.getByRole('group', { name: 'Left pane view' })).getByRole(
      'button',
      { name: 'Flame graph' },
    ),
  );
  const graphs = () => screen.getAllByTestId('graph');
  expect(graphs()).toHaveLength(2);
  expect(graphs().map((graph) => graph.getAttribute('data-collapsed'))).toEqual(
    ['yes', 'yes'],
  );
  const expand = screen.getByRole('button', { name: 'Expand all groups' });
  expect(expand.hasAttribute('disabled')).toBe(false);
  await user.click(expand);
  expect(graphs().map((graph) => graph.getAttribute('data-collapsed'))).toEqual(
    ['no', 'no'],
  );
  await user.click(screen.getByRole('button', { name: 'Collapse all groups' }));
  expect(graphs().map((graph) => graph.getAttribute('data-collapsed'))).toEqual(
    ['yes', 'yes'],
  );
  await user.click(
    screen.getByRole('radio', { name: 'Align clipped text right' }),
  );
  expect(graphs().map((graph) => graph.getAttribute('data-align'))).toEqual([
    'right',
    'right',
  ]);
});

it('color controls use the regular palette for baseline/comparison and diff palette for diff', async () => {
  const user = userEvent.setup();
  render(<FlameGraphContainer data={data} />);
  await user.click(
    within(screen.getByRole('group', { name: 'Left pane view' })).getByRole(
      'button',
      { name: 'Flame graph' },
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Change color scheme' }));
  expect(
    await screen.findByRole('menuitem', { name: 'By value' }),
  ).toBeTruthy();
  await user.click(screen.getByRole('menuitem', { name: 'By value' }));
  expect(
    screen
      .getAllByTestId('graph')
      .map((graph) => graph.getAttribute('data-scheme')),
  ).toEqual(['valueBased', 'valueBased']);
  await user.click(
    within(screen.getByRole('group', { name: 'Right pane data' })).getByRole(
      'button',
      { name: 'Absolute diff' },
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Change color scheme' }));
  expect(
    await screen.findByRole('menuitem', { name: 'Diff (color blind)' }),
  ).toBeTruthy();
  await user.click(
    screen.getByRole('menuitem', { name: 'Diff (color blind)' }),
  );
  expect(
    screen
      .getAllByTestId('graph')
      .map((graph) => graph.getAttribute('data-scheme')),
  ).toEqual(['valueBased', 'diffColorBlind']);
});

it('changes flamegraph colors in single layout for both regular and diff profiles', async () => {
  const user = userEvent.setup();
  const regular = {
    ...data,
    fields: data.fields.filter((field) => !field.name.endsWith('Right')),
  };
  const { rerender } = render(
    <FlameGraphContainer data={regular} initialViewMode="single" />,
  );
  expect(screen.getByTestId('graph').getAttribute('data-scheme')).toBe(
    'packageBased',
  );
  await user.click(screen.getByRole('button', { name: 'Change color scheme' }));
  await user.click(await screen.findByRole('menuitem', { name: 'By value' }));
  expect(screen.getByTestId('graph').getAttribute('data-scheme')).toBe(
    'valueBased',
  );

  rerender(<FlameGraphContainer data={data} initialViewMode="single" />);
  await user.click(screen.getByRole('button', { name: 'Change color scheme' }));
  await user.click(
    await screen.findByRole('menuitem', { name: 'Diff (color blind)' }),
  );
  expect(screen.getByTestId('graph').getAttribute('data-scheme')).toBe(
    'diffColorBlind',
  );
});

it('reveals matches inside collapsed groups and restores collapse when search clears', async () => {
  const user = userEvent.setup();
  render(<FlameGraphContainer data={data} />);
  expect(screen.getByTestId('graph').getAttribute('data-collapsed')).toBe(
    'yes',
  );
  const search = screen.getByPlaceholderText('Search...');
  await user.type(search, 'a.long.name');
  await waitFor(() =>
    expect(screen.getByTestId('graph').getAttribute('data-collapsed')).toBe(
      'no',
    ),
  );
  await user.clear(search);
  await waitFor(() =>
    expect(screen.getByTestId('graph').getAttribute('data-collapsed')).toBe(
      'yes',
    ),
  );
});

it('disables group controls when no collapsible groups exist', () => {
  render(
    <FlameGraphContainer
      data={{
        ...data,
        length: 1,
        fields: data.fields.map((field) => ({
          ...field,
          values: field.values.slice(0, 1),
        })),
      }}
    />,
  );
  expect(
    screen
      .getByRole('button', { name: 'Expand all groups' })
      .hasAttribute('disabled'),
  ).toBe(true);
  expect(
    screen
      .getByRole('button', { name: 'Collapse all groups' })
      .hasAttribute('disabled'),
  ).toBe(true);
});

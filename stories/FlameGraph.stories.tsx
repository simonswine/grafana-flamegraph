import type { Meta, StoryObj } from '@storybook/react';
import FlameGraphContainer from '../FlameGraphContainer';
import { FieldType, type DataFrame } from '../FlameGraph/dataTransform';

const rows = [
  ['all', 0, 100, 10],
  ['render', 1, 60, 15],
  ['layout', 2, 30, 30],
  ['paint', 2, 15, 15],
  ['fetch', 1, 30, 5],
  ['request', 2, 25, 25],
] as const;

const data: DataFrame = {
  length: rows.length,
  fields: [
    { name: 'label', type: FieldType.string, values: rows.map((row) => row[0]), config: {} },
    { name: 'level', type: FieldType.number, values: rows.map((row) => row[1]), config: {} },
    { name: 'value', type: FieldType.number, values: rows.map((row) => row[2]), config: { unit: 'short' } },
    { name: 'self', type: FieldType.number, values: rows.map((row) => row[3]), config: { unit: 'short' } },
  ],
};

const meta = {
  title: 'FlameGraph',
  component: FlameGraphContainer,
  args: { data },
  decorators: [(Story) => <div style={{ width: '100%', height: 600, background: 'var(--bg-primary)', padding: 16, boxSizing: 'border-box' }}><Story /></div>],
} satisfies Meta<typeof FlameGraphContainer>;

export default meta;
export const Basic: StoryObj<typeof meta> = {};
export const FlameGraphOnly: StoryObj<typeof meta> = { args: { showFlameGraphOnly: true } };
export const Vertical: StoryObj<typeof meta> = { args: { vertical: true, initialViewMode: 'dual' } };
export const Single: StoryObj<typeof meta> = { args: { initialViewMode: 'single' } };
export const Dual: StoryObj<typeof meta> = { args: { initialViewMode: 'dual' } };

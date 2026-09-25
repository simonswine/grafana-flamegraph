import { expect, it } from 'vitest';
import { FieldType, FlameGraphDataContainer, type DataFrame } from '../FlameGraph/dataTransform';

const frame: DataFrame = {
  length: 5,
  fields: [
    { name: 'label', type: FieldType.string, values: ['root', 'alpha', 'alpha/leaf', 'beta', 'beta/leaf'], config: {} },
    { name: 'level', type: FieldType.number, values: [0, 1, 2, 1, 2], config: {} },
    { name: 'value', type: FieldType.number, values: [100, 50, 49.9, 50, 49.9], config: {} },
    { name: 'self', type: FieldType.number, values: [0, 0.1, 49.9, 0.1, 49.9], config: {} },
  ],
};

it('expands the focused collapsed group without expanding unrelated groups or mutating state', () => {
  const data = new FlameGraphDataContainer(frame, { collapsing: true });
  const levels = data.getLevels();
  const alpha = levels[1][0], alphaLeaf = levels[2][0], beta = levels[1][1];
  const original = data.getCollapsedMap();
  expect(original.get(alphaLeaf)?.collapsed).toBe(true);
  expect(original.get(beta)?.collapsed).toBe(true);

  const expanded = original.expandForFocus(alphaLeaf);
  expect(expanded.get(alpha)?.collapsed).toBe(false);
  expect(expanded.get(alphaLeaf)?.collapsed).toBe(false);
  expect(expanded.get(beta)?.collapsed).toBe(true);
  expect(original.get(alphaLeaf)?.collapsed).toBe(true);
  expect(expanded.expandForFocus(alphaLeaf)).toBe(expanded);
});

it('reveals matching symbols while keeping the saved collapsed state intact', () => {
  const data = new FlameGraphDataContainer(frame, { collapsing: true });
  const alpha = data.getLevels()[1][0], beta = data.getLevels()[1][1];
  const saved = data.getCollapsedMap();
  const searching = saved.expandMatchingLabels(data, new Set(['alpha/leaf']));
  expect(searching.get(alpha)?.collapsed).toBe(false);
  expect(searching.get(beta)?.collapsed).toBe(true);
  expect(saved.get(alpha)?.collapsed).toBe(true);
  expect(saved.expandMatchingLabels(data, new Set())).toBe(saved);
});

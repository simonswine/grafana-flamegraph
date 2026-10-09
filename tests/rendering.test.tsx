import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  FieldType,
  FlameGraphDataContainer,
} from '../FlameGraph/dataTransform';
import { convertPixelCoordinatesToBarCoordinates } from '../FlameGraph/FlameGraphCanvas';
import { useFlameRender, walkTree } from '../FlameGraph/rendering';
import { ColorScheme } from '../types';

const data = new FlameGraphDataContainer(
  {
    length: 2,
    fields: [
      {
        name: 'label',
        type: FieldType.string,
        values: ['root', 'child'],
        config: {},
      },
      { name: 'level', type: FieldType.number, values: [0, 1], config: {} },
      { name: 'value', type: FieldType.number, values: [100, 100], config: {} },
      { name: 'self', type: FieldType.number, values: [0, 100], config: {} },
    ],
  },
  { collapsing: false },
);
const root = data.getLevels()[0][0];
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([1, 1.5, 2])(
  'scales canvas geometry while hit testing stays in CSS pixels at DPR %s',
  (dpr) => {
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(dpr);
    const bars: number[][] = [];
    walkTree(
      root,
      'children',
      data,
      100,
      0,
      1,
      100,
      data.getCollapsedMap(),
      (_item, x, y, width, height) => bars.push([x, y, width, height]),
      dpr,
    );
    expect(bars[0]).toEqual([0, 0, 99 * dpr, 22 * dpr]);
    expect(bars[1]).toEqual([0, 22 * dpr, 99 * dpr, 22 * dpr]);
    expect(
      convertPixelCoordinatesToBarCoordinates(
        { x: 50, y: 23 },
        root,
        'children',
        2,
        1,
        100,
        0,
        data.getCollapsedMap(),
      ),
    ).toBe(root.children[0]);
  },
);

it('resizes and redraws the canvas on display/zoom changes and cleans up listeners', () => {
  let dpr = 1;
  vi.spyOn(window, 'devicePixelRatio', 'get').mockImplementation(() => dpr);
  const queries: EventTarget[] = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => {
      const query = new EventTarget();
      queries.push(query);
      return query;
    }),
  );
  const viewport = new EventTarget();
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal(
    'Path2D',
    class {
      rect() {}
    },
  );
  const canvas = document.createElement('canvas');
  const ctx = {
    canvas,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    clip: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    measureText: () => ({ width: 10 }),
  };
  vi.spyOn(canvas, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  const { unmount } = renderHook(() =>
    useFlameRender({
      canvasRef: { current: canvas },
      data,
      root,
      direction: 'children',
      depth: 2,
      wrapperWidth: 100,
      rangeMin: 0,
      rangeMax: 1,
      matchedLabels: undefined,
      textAlign: 'left',
      totalViewTicks: 100,
      totalColorTicks: 100,
      colorScheme: ColorScheme.ValueBased,
      collapsedMap: data.getCollapsedMap(),
    }),
  );
  expect(canvas.height).toBe(44);
  const removed = vi.spyOn(queries[0], 'removeEventListener');
  act(() => {
    dpr = 2;
    queries[0].dispatchEvent(new Event('change'));
  });
  expect(canvas.width).toBe(200);
  expect(canvas.height).toBe(88);
  expect(canvas.style.height).toBe('44px');
  expect(ctx.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
  expect(removed).toHaveBeenCalled();
  act(() => {
    dpr = 1.5;
    viewport.dispatchEvent(new Event('resize'));
  });
  expect(canvas.width).toBe(150);
  expect(canvas.height).toBe(66);
  const cleanup = vi.spyOn(viewport, 'removeEventListener');
  unmount();
  expect(cleanup).toHaveBeenCalledWith('resize', expect.any(Function));
});

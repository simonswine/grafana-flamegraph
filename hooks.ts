import {
  type DependencyList,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

import { type FlameGraphDataContainer } from './FlameGraph/dataTransform';
import { ColorScheme, ColorSchemeDiff } from './types';

/**
 * Reset the color scheme when switching between regular and diff profiles.
 */
export function useColorScheme(
  _dataContainer: FlameGraphDataContainer | undefined,
) {
  const isDiff = _dataContainer?.isDiffFlamegraph() ?? false;
  const [scheme, setScheme] = useState<ColorScheme | ColorSchemeDiff>(
    isDiff ? ColorSchemeDiff.Default : ColorScheme.PackageBased,
  );
  useEffect(() => {
    setScheme(isDiff ? ColorSchemeDiff.Default : ColorScheme.PackageBased);
  }, [isDiff]);
  return [scheme, setScheme] as const;
}

/**
 * Fire `fn` `delay` ms after `deps` last changed. Cancels on unmount or
 * before each new schedule.
 *
 * Drop-in for `react-use`'s `useDebounce`.
 */
export function useDebounce(
  fn: () => void,
  delay: number,
  deps: DependencyList,
) {
  // Stash the latest callback so we never call a stale closure.
  const cbRef = useRef(fn);
  cbRef.current = fn;

  useEffect(() => {
    const id = window.setTimeout(() => cbRef.current(), delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Returns the previous value of `value` (undefined on first render). */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/**
 * Attach via the returned ref to observe an element's content-box. Returns
 * a tuple `[ref, { width, height }]` matching `react-use`'s `useMeasure`
 * shape. Updates on every ResizeObserver entry.
 */
export function useMeasure<T extends HTMLElement>(): [
  RefObject<T | null>,
  { width: number; height: number },
] {
  const ref = useRef<T | null>(null);
  const [rect, setRect] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const r = entry.contentRect;
        setRect({ width: r.width, height: r.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, rect];
}

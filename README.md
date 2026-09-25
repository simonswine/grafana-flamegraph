# grafana-flamegraph-solo

Standalone React flamegraph component with a Storybook preview.

```sh
corepack pnpm install
corepack pnpm storybook
```

Build the publishable package with `corepack pnpm build`, the static Storybook with `corepack pnpm build-storybook`, and run the control regression tests with `corepack pnpm test`.

```tsx
import { FlameGraph } from 'grafana-flamegraph-solo';
import 'grafana-flamegraph-solo/style.css';

<FlameGraph data={frame} />
```

`frame` is a DataFrame with `label`, `level`, `value`, and `self` fields. For diff profiles, include both `valueRight` and `selfRight` numeric fields; `value` and `self` represent the baseline. Diff flamegraphs size bars by the combined totals and color them by the comparison change. See the **Diff** Storybook story. React and React DOM 19 or newer are required.

The toolbar offers Single and Dual layouts with independently selectable Flame graph, Top table, and Stacktrace table panes. For diff profiles each pane also has its own Baseline, Comparison, Proportional diff, or Absolute diff data selector (Dual defaults to baseline on the left and comparison on the right). Proportional diff compares each function’s share of its respective profile; absolute diff compares raw sample counts (comparison minus baseline). The diff legend explains the colors and their intensity. Both diff modes size bars by the combined totals. Set `initialViewMode="single"` to start in single-pane mode.

The exported stylesheet includes the Pyroscope UI design tokens and flamegraph styles (without Pyroscope's global reset). Dark mode is the default; set `data-theme="light"` on the document's `<html>` element for light mode. The tokens define the same colors, typography, spacing, and controls as `grafana/pyroscope/ui/src/theme.css` (Apache-2.0).

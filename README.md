# grafana-flamegraph-solo

Standalone React flamegraph component with a Storybook preview.

```sh
corepack pnpm install
corepack pnpm storybook
```

Build the publishable package with `corepack pnpm build` and the static Storybook with `corepack pnpm build-storybook`.

```tsx
import { FlameGraph } from 'grafana-flamegraph-solo';
import 'grafana-flamegraph-solo/style.css';

<FlameGraph data={frame} />
```

`frame` is a DataFrame with `label`, `level`, `value`, and `self` fields. React and React DOM 19 or newer are required.

The toolbar offers Single and Dual layouts with independently selectable Flame graph, Top table, and Stacktrace table panes. Set `initialViewMode="single"` to start in single-pane mode.

The exported stylesheet includes the Pyroscope UI design tokens and flamegraph styles (without Pyroscope's global reset). Dark mode is the default; set `data-theme="light"` on the document's `<html>` element for light mode. The tokens define the same colors, typography, spacing, and controls as `grafana/pyroscope/ui/src/theme.css` (Apache-2.0).

# grafana-flamegraph

Standalone React flamegraph component with a Storybook preview.

```sh
corepack pnpm install
corepack pnpm storybook
```

Build the publishable package with `corepack pnpm build`, the static Storybook with `corepack pnpm build-storybook`, and run the control regression tests with `corepack pnpm test`. Biome handles linting and formatting: run `corepack pnpm check` to check both (plus import organization), or `corepack pnpm exec biome check --write .` to apply safe fixes. `corepack pnpm lint`, `corepack pnpm format:check`, and `corepack pnpm format` are also available. Existing lint findings are reported as warnings so the check passes while new code can be improved incrementally.

```tsx
import { FlameGraph } from '@simonswine/grafana-flamegraph';
import '@simonswine/grafana-flamegraph/style.css';

<FlameGraph data={frame} />
```

`frame` is a DataFrame with `label`, `level`, `value`, and `self` fields. For diff profiles, include both `valueRight` and `selfRight` numeric fields; `value` and `self` represent the baseline. Diff flamegraphs size bars by the combined totals and color them by the comparison change. See the **Diff** Storybook story. React and React DOM 19 or newer are required.

The toolbar offers Single and Dual layouts with independently selectable Flame graph, Top table, and Call tree panes. For diff profiles each pane also has its own Baseline, Comparison, Proportional diff, or Absolute diff data selector (Dual defaults to baseline on the left and comparison on the right). Proportional diff compares each function’s share of its respective profile; absolute diff compares raw sample counts (comparison minus baseline). The diff legend explains the colors and their intensity. Both diff modes size bars by the combined totals. Set `initialViewMode="single"` to start in single-pane mode.

## Publishing

The npm package is `@simonswine/grafana-flamegraph`. You must control the
`simonswine` npm scope.

### First publish

Trusted publishing is configured on an existing npm package. Bootstrap version
`0.1.0` locally using your npm account (complete any npm 2FA prompts):

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm build
npm login
npm publish --access public
```

Do not push `v0.1.0` afterward: that version is already published.

### Configure trusted publishing

1. Create a GitHub environment named `npm`, preferably with required reviewers
   and deployment restricted to release tags.
2. In npm's package settings, add a GitHub Actions trusted publisher:
   - Owner: `simonswine`
   - Repository: `grafana-flamegraph`
   - Workflow filename: `publish.yml`
   - Environment: `npm`
3. Push the workflow to GitHub. No npm token or `NODE_AUTH_TOKEN` secret is needed.

### Subsequent releases

Update `package.json` to a new version, commit it, then push a matching tag:

```sh
git push origin main
git tag v0.1.1
git push origin v0.1.1
```

The publishing workflow checks the tag against the package version, validates
and builds the package, and publishes with OIDC and provenance. Versions cannot
be overwritten. Approve the `npm` deployment when prompted, if reviewers are enabled.

The exported stylesheet includes the Pyroscope UI design tokens and flamegraph styles (without Pyroscope's global reset). Dark mode is the default; set `data-theme="light"` on the document's `<html>` element for light mode. The tokens define the same colors, typography, spacing, and controls as `grafana/pyroscope/ui/src/theme.css` (Apache-2.0).

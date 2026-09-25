// This component is based on logic from the flamebearer project
// https://github.com/mapbox/flamebearer

// ISC License

// Copyright (c) 2018, Mapbox

// Permission to use, copy, modify, and/or distribute this software for any purpose
// with or without fee is hereby granted, provided that the above copyright notice
// and this permission notice appear in all copies.

// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
// REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
// FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
// INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
// OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
// TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
// THIS SOFTWARE.
import { useEffect, useState } from 'react';
import { PIXELS_PER_LEVEL } from '../constants';
import { cx } from '../cx';
import { Icon } from '../Icon';
import type {
  ClickedItemData,
  ColorScheme,
  ColorSchemeDiff,
  SelectedView,
  TextAlign,
} from '../types';
import { diffColorBlindGradient, diffDefaultGradient } from './colors';
import type {
  CollapsedMap,
  FlameGraphDataContainer,
  LevelItem,
} from './dataTransform';
import FlameGraphCanvas from './FlameGraphCanvas';
import type { GetExtraContextMenuButtonsFunction } from './FlameGraphContextMenu';
import FlameGraphMetadata from './FlameGraphMetadata';

import './FlameGraph.css';

type Props = {
  data: FlameGraphDataContainer;
  rangeMin: number;
  rangeMax: number;
  matchedLabels?: Set<string>;
  setRangeMin: (range: number) => void;
  setRangeMax: (range: number) => void;
  onItemFocused: (data: ClickedItemData) => void;
  focusedItemData?: ClickedItemData;
  textAlign: TextAlign;
  sandwichItem?: string;
  onSandwich: (label: string) => void;
  onFocusPillClick: () => void;
  onSandwichPillClick: () => void;
  colorScheme: ColorScheme | ColorSchemeDiff;
  diffMode?: 'proportionalDiff' | 'absoluteDiff';
  showFlameGraphOnly?: boolean;
  getExtraContextMenuButtons?: GetExtraContextMenuButtonsFunction;
  collapsing?: boolean;
  search: string;
  collapsedMap: CollapsedMap;
  setCollapsedMap: (collapsedMap: CollapsedMap) => void;
  selectedView?: SelectedView;
};

const FlameGraph = ({
  data,
  rangeMin,
  rangeMax,
  matchedLabels,
  setRangeMin,
  setRangeMax,
  onItemFocused,
  focusedItemData,
  textAlign,
  onSandwich,
  sandwichItem,
  onFocusPillClick,
  onSandwichPillClick,
  colorScheme,
  diffMode = 'proportionalDiff',
  showFlameGraphOnly,
  getExtraContextMenuButtons,
  collapsing,
  search,
  collapsedMap,
  setCollapsedMap,
  selectedView,
}: Props) => {
  // PIXELS_PER_LEVEL depends on devicePixelRatio so it's computed at runtime
  // rather than baked into the .css file. Used to space sandwich canvases.
  const sandwichMargin = `${PIXELS_PER_LEVEL / window.devicePixelRatio}px`;

  const [levels, setLevels] = useState<LevelItem[][]>();
  const [levelsCallers, setLevelsCallers] = useState<LevelItem[][]>();
  const [totalViewTicks, setTotalViewTicks] = useState<number>(0);
  const totalProfileTicks = data.getLevels()[0]?.[0]?.value ?? 0;
  const totalProfileTicksRight = data.isDiffFlamegraph()
    ? data.getLevels()[0]?.[0]?.valueRight
    : undefined;

  useEffect(() => {
    if (data) {
      let levels = data.getLevels();
      let totalViewTicks = levels.length ? levels[0][0].value : 0;
      let levelsCallers;

      if (sandwichItem) {
        const [callers, callees] = data.getSandwichLevels(sandwichItem);
        levels = callees;
        levelsCallers = callers;
        totalViewTicks = callees[0]?.[0]?.value ?? 0;
      }
      setLevels(levels);
      setLevelsCallers(levelsCallers);
      setTotalViewTicks(totalViewTicks);
    }
  }, [data, sandwichItem]);

  if (!levels) {
    return null;
  }

  const commonCanvasProps = {
    data,
    rangeMin,
    rangeMax,
    matchedLabels,
    setRangeMin,
    setRangeMax,
    onItemFocused,
    focusedItemData,
    textAlign,
    onSandwich,
    colorScheme,
    diffMode,
    totalViewTicks,
    totalProfileTicks,
    totalProfileTicksRight,
    showFlameGraphOnly,
    collapsedMap,
    setCollapsedMap,
    getExtraContextMenuButtons,
    collapsing,
    search,
    selectedView,
  };
  let canvas = null;

  if (levelsCallers?.length) {
    canvas = (
      <>
        <div
          className="fg-sandwich-canvas-wrapper"
          style={{ marginBottom: sandwichMargin }}
        >
          <div className="fg-sandwich-marker">
            Callers
            <Icon className="fg-sandwich-marker-icon" name="angle-down" />
          </div>
          <FlameGraphCanvas
            {...commonCanvasProps}
            root={levelsCallers[levelsCallers.length - 1][0]}
            depth={levelsCallers.length}
            direction={'parents'}
            // We do not support collapsing in sandwich view for now.
            collapsing={false}
          />
        </div>

        <div
          className="fg-sandwich-canvas-wrapper"
          style={{ marginBottom: sandwichMargin }}
        >
          <div
            className={cx('fg-sandwich-marker', 'fg-sandwich-marker-callees')}
          >
            <Icon className="fg-sandwich-marker-icon" name="angle-up" />
            Callees
          </div>
          <FlameGraphCanvas
            {...commonCanvasProps}
            root={levels[0][0]}
            depth={levels.length}
            direction={'children'}
            collapsing={false}
          />
        </div>
      </>
    );
  } else if (levels?.length) {
    canvas = (
      <FlameGraphCanvas
        {...commonCanvasProps}
        root={levels[0][0]}
        depth={levels.length}
        direction={'children'}
      />
    );
  }

  return (
    <div className="fg-graph">
      <FlameGraphMetadata
        data={data}
        focusedItem={focusedItemData}
        sandwichedLabel={sandwichItem}
        totalTicks={totalViewTicks}
        onFocusPillClick={onFocusPillClick}
        onSandwichPillClick={onSandwichPillClick}
      />
      {canvas}
      {data.isDiffFlamegraph() && (
        <div
          className="fg-diff-legend"
          role="note"
          aria-label={`${diffMode === 'absoluteDiff' ? 'Absolute' : 'Proportional'} diff flamegraph color legend`}
        >
          <strong>
            {diffMode === 'absoluteDiff'
              ? 'Absolute diff'
              : 'Proportional diff'}
          </strong>
          <div
            className="fg-diff-legend-scale"
            style={{
              background:
                colorScheme === 'diffColorBlind'
                  ? diffColorBlindGradient
                  : diffDefaultGradient,
            }}
            aria-hidden="true"
          />
          <div className="fg-diff-legend-labels">
            <span>
              {colorScheme === 'diffColorBlind' ? 'Blue' : 'Green'}: decreased
            </span>
            <span>Gray: unchanged</span>
            <span>
              {colorScheme === 'diffColorBlind' ? 'Orange-red' : 'Red'}:
              increased
            </span>
          </div>
          <small>
            {diffMode === 'absoluteDiff'
              ? 'Color shows the raw sample count change (comparison minus baseline); intensity is scaled to the larger profile’s total. Bar width is the combined total.'
              : 'Node labels show the percentage change in each function’s share of the profile from baseline to comparison (or “new” if its baseline share was zero). Color shows the same change, not the change in raw samples. Bar width is the combined total.'}
          </small>
        </div>
      )}
    </div>
  );
};

export default FlameGraph;

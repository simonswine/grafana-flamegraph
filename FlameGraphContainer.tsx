import uFuzzy from '@leeoniya/ufuzzy';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import * as React from 'react';

import FlameGraph from './FlameGraph/FlameGraph';
import { type GetExtraContextMenuButtonsFunction } from './FlameGraph/FlameGraphContextMenu';
import {
  CollapsedMap,
  type DataFrame,
  FlameGraphDataContainer,
} from './FlameGraph/dataTransform';
import { escapeRegex } from './format';
import FlameGraphHeader from './FlameGraphHeader';
import FlameGraphTopTableContainer from './TopTable/FlameGraphTopTableContainer';
import { StacktraceTable } from './CallTree/StacktraceTable';

import './pyroscope-theme.css';
import './FlameGraphContainer.css';
import './Layout.css';
import { useColorScheme, useMeasure } from './hooks';
import { type ClickedItemData, ColorScheme, type TextAlign } from './types';

type DataMode = 'baseline' | 'comparison' | 'proportionalDiff' | 'absoluteDiff';

const ufuzzy = new uFuzzy();

export type Props = {
  /**
   * DataFrame with the profile data. The dataFrame needs to have the following fields:
   * label: string - the label of the node
   * level: number - the nesting level of the node
   * value: number - the total value of the node
   * self: number - the self value of the node
   * For diff profiles also provide numeric valueRight and selfRight fields.
   */
  data?: DataFrame;

  /**
   * Whether the header should be sticky and be always visible on the top when scrolling.
   */
  stickyHeader?: boolean;

  /**
   * Various interaction hooks that can be used to report on the interaction.
   */
  onTableSymbolClick?: (symbol: string) => void;
  onViewSelected?: (view: string) => void;
  onTextAlignSelected?: (align: string) => void;
  onTableSort?: (sort: string) => void;

  /**
   * Elements that will be shown in the header on the right side of the header buttons. Useful for additional
   * functionality.
   */
  extraHeaderElements?: React.ReactNode;

  /**
   * Extra buttons that will be shown in the context menu when user clicks on a Node.
   */
  getExtraContextMenuButtons?: GetExtraContextMenuButtonsFunction;

  /**
   * If true the flamegraph will be rendered on top of the table.
   */
  vertical?: boolean;

  /**
   * If true only the flamegraph will be rendered.
   */
  showFlameGraphOnly?: boolean;

  /**
   * Disable behaviour where similar items in the same stack will be collapsed into single item.
   */
  disableCollapsing?: boolean;
  /**
   * Whether or not to keep any focused item when the profile data changes.
   */
  keepFocusOnDataChange?: boolean;
  /** Initial layout: one pane or two independently selectable panes. */
  initialViewMode?: 'single' | 'dual';
};

const FlameGraphContainer = ({
  data,
  onTableSymbolClick,
  onViewSelected,
  onTextAlignSelected,
  onTableSort,
  stickyHeader,
  extraHeaderElements,
  vertical,
  showFlameGraphOnly,
  disableCollapsing,
  keepFocusOnDataChange,
  initialViewMode = 'dual',
  getExtraContextMenuButtons,
}: Props) => {
  const [focusedItemData, setFocusedItemData] = useState<ClickedItemData>();

  const [rangeMin, setRangeMin] = useState(0);
  const [rangeMax, setRangeMax] = useState(1);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'single' | 'dual'>(initialViewMode);
  const [leftView, setLeftView] = useState<'flameGraph' | 'topTable' | 'callTree'>('topTable');
  const [rightView, setRightView] = useState<'flameGraph' | 'topTable' | 'callTree'>('flameGraph');
  const [singleView, setSingleView] = useState<'flameGraph' | 'topTable' | 'callTree'>('flameGraph');
  const [singleDataMode, setSingleDataMode] = useState<DataMode>('proportionalDiff');
  const [leftDataMode, setLeftDataMode] = useState<DataMode>('baseline');
  const [rightDataMode, setRightDataMode] = useState<DataMode>('comparison');
  const [sizeRef, { width: containerWidth }] = useMeasure<HTMLDivElement>();
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
  // This is a label of the item because in sandwich view we group all items by label and present a merged graph
  const [sandwichItem, setSandwichItem] = useState<string>();
  const [collapsedMaps, setCollapsedMaps] = useState<Partial<Record<DataMode, CollapsedMap>>>({});

  // Use refs to hold the latest callback values to prevent unnecessary re-renders
  const onTableSymbolClickRef = useRef(onTableSymbolClick);
  const onTableSortRef = useRef(onTableSort);

  // Update refs when props change
  onTableSymbolClickRef.current = onTableSymbolClick;
  onTableSortRef.current = onTableSort;

  const isDiffData = Boolean(data?.fields.some((field) => field.name === 'valueRight') &&
    data?.fields.some((field) => field.name === 'selfRight'));
  const containers = useMemo(() => {
    if (!data) return undefined;
    const make = (mode: DataMode) => {
      const frame = !isDiffData || mode === 'proportionalDiff' || mode === 'absoluteDiff' ? data : {
        ...data,
        fields: data.fields.filter((field) => field.name !== 'valueRight' && field.name !== 'selfRight').map((field) => {
          if (mode === 'comparison' && (field.name === 'value' || field.name === 'self')) {
            const right = data.fields.find((candidate) => candidate.name === `${field.name}Right`)!;
            return { ...right, name: field.name };
          }
          return field;
        }),
      };
      return new FlameGraphDataContainer(frame, { collapsing: !disableCollapsing });
    };
    const diff = make('proportionalDiff');
    return { proportionalDiff: diff, absoluteDiff: diff, baseline: make('baseline'), comparison: make('comparison') };
  }, [data, isDiffData, disableCollapsing]);
  const dataContainer = containers?.proportionalDiff;
  useEffect(() => {
    if (containers) setCollapsedMaps({
      baseline: containers.baseline.getCollapsedMap(),
      comparison: containers.comparison.getCollapsedMap(),
      proportionalDiff: containers.proportionalDiff.getCollapsedMap(),
      absoluteDiff: containers.absoluteDiff.getCollapsedMap(),
    });
  }, [containers]);
  const [colorScheme, setColorScheme] = useColorScheme(dataContainer);
  const [regularColorScheme, setRegularColorScheme] = useState<ColorScheme>(ColorScheme.PackageBased);
  const visibleModes = viewMode === 'single' ? [singleDataMode] : [leftDataMode, rightDataMode];
  const showingDiff = isDiffData && visibleModes.some((mode) => mode === 'proportionalDiff' || mode === 'absoluteDiff');
  const matchedLabels = useLabelSearch(search, dataContainer);

  const resetFocus = useCallback(() => {
    setFocusedItemData(undefined);
    setRangeMin(0);
    setRangeMax(1);
  }, [setFocusedItemData, setRangeMax, setRangeMin]);

  const resetSandwich = useCallback(() => {
    setSandwichItem(undefined);
  }, [setSandwichItem]);

  useEffect(() => {
    if (!keepFocusOnDataChange) {
      resetFocus();
      resetSandwich();
      return;
    }

    if (dataContainer && focusedItemData) {
      const item = dataContainer.getNodesWithLabel(focusedItemData.label)?.[0];

      if (item) {
        setFocusedItemData({ ...focusedItemData, item });

        const levels = dataContainer.getLevels();
        const totalViewTicks = levels.length ? levels[0][0].value : 0;
        setRangeMin(item.start / totalViewTicks);
        setRangeMax((item.start + item.value) / totalViewTicks);
      } else {
        setFocusedItemData({
          ...focusedItemData,
          item: {
            start: 0,
            value: 0,
            itemIndexes: [],
            children: [],
            level: 0,
          },
        });

        setRangeMin(0);
        setRangeMax(1);
      }
    }
  }, [dataContainer, keepFocusOnDataChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSymbolClick = useCallback(
    (symbol: string) => {
      const anchored = `^${escapeRegex(symbol)}$`;

      if (search === anchored) {
        setSearch('');
      } else {
        onTableSymbolClickRef.current?.(symbol);
        setSearch(anchored);
        resetFocus();
      }
    },
    [setSearch, resetFocus, search],
  );

  // Memoize methods to prevent unnecessary re-renders of FlameGraphTopTableContainer
  const onSearch = useCallback(
    (str: string) => {
      if (!str) {
        setSearch('');
        return;
      }
      setSearch(`^${escapeRegex(str)}$`);
    },
    [setSearch],
  );
  const onSandwich = useCallback(
    (label: string) => {
      resetFocus();
      setSandwichItem(label);
    },
    [resetFocus, setSandwichItem],
  );
  const onTableSortStable = useCallback((sort: string) => {
    onTableSortRef.current?.(sort);
  }, []);

  if (!dataContainer) {
    return null;
  }

  const activeCollapsedMap = visibleModes.map((mode) => collapsedMaps[mode] ?? containers![mode].getCollapsedMap())
    .find((map) => map.size() > 0) ?? dataContainer.getCollapsedMap();

  const schemeFor = (mode: DataMode) => containers![mode].isDiffFlamegraph() ? colorScheme : regularColorScheme;

  const flameGraph = (mode: DataMode) => {
    const paneData = containers![mode];
    return <FlameGraph
      key={mode}
      data={paneData}
      rangeMin={rangeMin}
      rangeMax={rangeMax}
      matchedLabels={matchedLabels}
      setRangeMin={setRangeMin}
      setRangeMax={setRangeMax}
      onItemFocused={(data) => setFocusedItemData(data)}
      focusedItemData={focusedItemData}
      textAlign={textAlign}
      sandwichItem={sandwichItem}
      onSandwich={onSandwich}
      onFocusPillClick={resetFocus}
      onSandwichPillClick={resetSandwich}
      colorScheme={schemeFor(mode)}
      diffMode={mode === 'absoluteDiff' ? mode : 'proportionalDiff'}
      showFlameGraphOnly={showFlameGraphOnly}
      collapsing={!disableCollapsing}
      getExtraContextMenuButtons={getExtraContextMenuButtons}
      search={search}
      collapsedMap={(collapsedMaps[mode] ?? paneData.getCollapsedMap()).expandMatchingLabels(paneData, matchedLabels)}
      setCollapsedMap={(map) => setCollapsedMaps((previous) => ({ ...previous, [mode]: map }))}
    />;
  };

  const table = (mode: DataMode) => (
    <FlameGraphTopTableContainer
      data={containers![mode]}
      diffMode={mode === 'absoluteDiff' ? mode : 'proportionalDiff'}
      colorScheme={schemeFor(mode)}
      onSymbolClick={onSymbolClick}
      search={search}
      matchedLabels={matchedLabels}
      sandwichItem={sandwichItem}
      onSandwich={setSandwichItem}
      onSearch={onSearch}
      onTableSort={onTableSortStable}
    />
  );

  const pane = (view: typeof singleView, mode: DataMode) => view === 'flameGraph' ? flameGraph(mode) : view === 'topTable'
    ? <div className="fg-table-container">{table(mode)}</div>
    : <StacktraceTable data={containers![mode]} diffMode={mode === 'absoluteDiff' ? mode : 'proportionalDiff'}
      colorScheme={schemeFor(mode)}
      search={search} onSymbolClick={onSymbolClick} />;

  const viewPicker = (view: typeof singleView, position: 'View' | 'Left' | 'Right' | 'Top' | 'Bottom', select: (value: typeof singleView) => void) => (
    <div className="fg-view-picker">
      <span>Visualization</span>
      <div className="fg-segmented" role="group" aria-label={`${position} pane view`}>
        {([
          ['flameGraph', 'Flame graph', 'Show the profile as a flame graph'],
          ['topTable', 'Top table', 'Show functions ranked by their sample values'],
          ['callTree', 'Call tree', 'Show the profile as a stack trace tree'],
        ] as const).map(([value, label, tooltip]) =>
          <button key={value} type="button" title={tooltip} aria-pressed={view === value} onClick={() => {
            select(value);
            onViewSelected?.(value);
          }}>{label}</button>
        )}
      </div>
    </div>
  );

  const dataPicker = (mode: DataMode, position: 'View' | 'Left' | 'Right' | 'Top' | 'Bottom', select: (mode: DataMode) => void) =>
    isDiffData && <div className="fg-data-picker">
      <span>Data</span>
      <div className="fg-segmented" role="group" aria-label={`${position} pane data`}>
        {(['baseline', 'comparison', 'proportionalDiff', 'absoluteDiff'] as const).map((value) =>
          <button key={value} type="button" title={{
            baseline: 'Show the baseline profile',
            comparison: 'Show the comparison profile',
            proportionalDiff: 'Compare each function’s share of its profile',
            absoluteDiff: 'Compare raw sample counts (comparison minus baseline)',
          }[value]} aria-pressed={mode === value} onClick={() => { select(value); resetFocus(); }}>
            {{ baseline: 'Baseline', comparison: 'Comparison', proportionalDiff: 'Proportional diff', absoluteDiff: 'Absolute diff' }[value]}
          </button>)}
      </div>
    </div>;

  return (
    <div ref={sizeRef} className="fg-container">
      {!showFlameGraphOnly && (
        <FlameGraphHeader
          search={search}
          setSearch={setSearch}
          viewMode={viewMode}
          setViewMode={setViewMode}
          containerWidth={containerWidth}
          onReset={() => {
            resetFocus();
            resetSandwich();
          }}
          textAlign={textAlign}
          onTextAlignChange={(align) => {
            setTextAlign(align);
            onTextAlignSelected?.(align);
          }}
          showResetButton={Boolean(focusedItemData || sandwichItem)}
          colorScheme={showingDiff ? colorScheme : regularColorScheme}
          isDiffMode={showingDiff}
          onColorSchemeChange={(scheme) => {
            if (showingDiff) setColorScheme(scheme);
            else if (scheme === ColorScheme.PackageBased || scheme === ColorScheme.ValueBased) setRegularColorScheme(scheme);
          }}
          stickyHeader={Boolean(stickyHeader)}
          extraHeaderElements={extraHeaderElements}
          vertical={vertical}
          setCollapsedMap={(map) => {
            const collapsed = Array.from(map.values()).every((config) => config.collapsed);
            setCollapsedMaps((previous) => {
              const next = { ...previous };
              for (const mode of ['baseline', 'comparison', 'proportionalDiff', 'absoluteDiff'] as const) {
                const current = previous[mode] ?? containers![mode].getCollapsedMap();
                next[mode] = current.setAllCollapsedStatus(collapsed);
              }
              return next;
            });
          }}
          collapsedMap={activeCollapsedMap}
          disableCollapsing={disableCollapsing}
        />
      )}

      <div className="fg-body">{showFlameGraphOnly ? flameGraph(singleDataMode) : viewMode === 'single' ?
        <div className="fg-pane-with-picker">
          <div className="fg-pane-controls">{viewPicker(singleView, 'View', setSingleView)}
            {dataPicker(singleDataMode, 'View', setSingleDataMode)}</div>
          <div className="fg-pane-content">{pane(singleView, singleDataMode)}</div>
        </div> :
        <div className={vertical ? 'fg-dual-vertical' : 'fg-dual'}>
          <div className="fg-dual-pane">
            <div className="fg-pane-controls">{viewPicker(leftView, vertical ? 'Top' : 'Left', setLeftView)}
              {dataPicker(leftDataMode, vertical ? 'Top' : 'Left', setLeftDataMode)}</div>
            <div className="fg-pane-content">{pane(leftView, leftDataMode)}</div>
          </div>
          <div className="fg-dual-pane">
            <div className="fg-pane-controls">{viewPicker(rightView, vertical ? 'Bottom' : 'Right', setRightView)}
              {dataPicker(rightDataMode, vertical ? 'Bottom' : 'Right', setRightDataMode)}</div>
            <div className="fg-pane-content">{pane(rightView, rightDataMode)}</div>
          </div>
        </div>}</div>
    </div>
  );
};

/**
 * Based on the search string it does a fuzzy search over all the unique labels, so we can highlight them later.
 */
export function useLabelSearch(
  search: string | undefined,
  data: FlameGraphDataContainer | undefined,
): Set<string> | undefined {
  return useMemo(() => {
    if (!search || !data) {
      // In this case undefined means there was no search so no attempt to
      // highlighting anything should be made.
      return undefined;
    }

    return labelSearch(search, data);
  }, [search, data]);
}

export function labelSearch(
  search: string,
  data: FlameGraphDataContainer,
): Set<string> {
  const foundLabels = new Set<string>();
  const terms = search.split(',');

  const regexFilter = (labels: string[], pattern: string): boolean => {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch (e) {
      return false;
    }

    let foundMatch = false;
    for (let label of labels) {
      if (!regex.test(label)) {
        continue;
      }

      foundLabels.add(label);
      foundMatch = true;
    }
    return foundMatch;
  };

  const fuzzyFilter = (labels: string[], term: string): boolean => {
    let idxs = ufuzzy.filter(labels, term);
    if (!idxs) {
      return false;
    }

    let foundMatch = false;
    for (let idx of idxs) {
      foundLabels.add(labels[idx]);
      foundMatch = true;
    }
    return foundMatch;
  };

  for (let term of terms) {
    if (!term) {
      continue;
    }

    const found = regexFilter(data.getUniqueLabels(), term);
    if (!found) {
      fuzzyFilter(data.getUniqueLabels(), term);
    }
  }

  return foundLabels;
}

export default FlameGraphContainer;

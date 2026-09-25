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
import { MIN_WIDTH_TO_SHOW_BOTH_TOPTABLE_AND_FLAMEGRAPH } from './constants';

import './pyroscope-theme.css';
import './FlameGraphContainer.css';
import './Layout.css';
import { useColorScheme, useMeasure } from './hooks';
import { type ClickedItemData, SelectedView, type TextAlign } from './types';

const ufuzzy = new uFuzzy();

export type Props = {
  /**
   * DataFrame with the profile data. The dataFrame needs to have the following fields:
   * label: string - the label of the node
   * level: number - the nesting level of the node
   * value: number - the total value of the node
   * self: number - the self value of the node
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
  const [selectedView, setSelectedView] = useState<SelectedView>(SelectedView.Both);
  const [sizeRef, { width: containerWidth }] = useMeasure<HTMLDivElement>();
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
  // This is a label of the item because in sandwich view we group all items by label and present a merged graph
  const [sandwichItem, setSandwichItem] = useState<string>();
  const [collapsedMap, setCollapsedMap] = useState(new CollapsedMap());

  // Use refs to hold the latest callback values to prevent unnecessary re-renders
  const onTableSymbolClickRef = useRef(onTableSymbolClick);
  const onTableSortRef = useRef(onTableSort);

  // Update refs when props change
  onTableSymbolClickRef.current = onTableSymbolClick;
  onTableSortRef.current = onTableSort;

  const dataContainer = useMemo((): FlameGraphDataContainer | undefined => {
    if (!data) {
      return;
    }

    const container = new FlameGraphDataContainer(data, {
      collapsing: !disableCollapsing,
    });
    setCollapsedMap(container.getCollapsedMap());
    return container;
  }, [data, disableCollapsing]);
  const [colorScheme, setColorScheme] = useColorScheme(dataContainer);
  const matchedLabels = useLabelSearch(search, dataContainer);

  // If user resizes window with both as the selected view
  useEffect(() => {
    if (
      containerWidth > 0 &&
      containerWidth < MIN_WIDTH_TO_SHOW_BOTH_TOPTABLE_AND_FLAMEGRAPH &&
      selectedView === SelectedView.Both &&
      !vertical
    ) {
      setSelectedView(SelectedView.FlameGraph);
    }
  }, [selectedView, setSelectedView, containerWidth, vertical]);

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

  const flameGraph = (
    <FlameGraph
      data={dataContainer}
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
      colorScheme={colorScheme}
      showFlameGraphOnly={showFlameGraphOnly}
      collapsing={!disableCollapsing}
      getExtraContextMenuButtons={getExtraContextMenuButtons}
      selectedView={selectedView}
      search={search}
      collapsedMap={collapsedMap}
      setCollapsedMap={setCollapsedMap}
    />
  );

  const table = (
    <FlameGraphTopTableContainer
      data={dataContainer}
      onSymbolClick={onSymbolClick}
      search={search}
      matchedLabels={matchedLabels}
      sandwichItem={sandwichItem}
      onSandwich={setSandwichItem}
      onSearch={onSearch}
      onTableSort={onTableSortStable}
    />
  );

  const pane = (view: typeof singleView) => view === 'flameGraph' ? flameGraph : view === 'topTable'
    ? <div className="fg-table-container">{table}</div>
    : <StacktraceTable data={dataContainer} search={search} onSymbolClick={onSymbolClick} />;

  const viewPicker = (view: typeof singleView, position: 'View' | 'Left' | 'Right' | 'Top' | 'Bottom', select: (value: typeof singleView) => void) => (
    <div className="fg-view-picker">
      <span>{position}</span>
      <div className="fg-segmented" role="group" aria-label={`${position} pane view`}>
        {([
          ['flameGraph', 'Flame graph'],
          ['topTable', 'Top table'],
          ['callTree', 'Stacktrace table'],
        ] as const).map(([value, title]) =>
          <button key={value} type="button" aria-pressed={view === value} onClick={() => {
            select(value);
            onViewSelected?.(value);
          }}>{title}</button>
        )}
      </div>
    </div>
  );

  return (
    <div ref={sizeRef} className="fg-container">
      {!showFlameGraphOnly && (
        <FlameGraphHeader
          search={search}
          setSearch={setSearch}
          selectedView={selectedView}
          setSelectedView={setSelectedView}
          hideViewSelector
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
          colorScheme={colorScheme}
          onColorSchemeChange={setColorScheme}
          stickyHeader={Boolean(stickyHeader)}
          extraHeaderElements={extraHeaderElements}
          vertical={vertical}
          setCollapsedMap={setCollapsedMap}
          collapsedMap={collapsedMap}
        />
      )}

      {!showFlameGraphOnly && <div className="fg-layout-controls">
        <div role="group" aria-label="Layout">
          <button type="button" aria-pressed={viewMode === 'single'} onClick={() => setViewMode('single')}>Single</button>
          <button type="button" aria-pressed={viewMode === 'dual'} onClick={() => setViewMode('dual')}>Dual</button>
        </div>

      </div>}
      <div className="fg-body">{showFlameGraphOnly ? flameGraph : viewMode === 'single' ?
        <div className="fg-pane-with-picker">
          {viewPicker(singleView, 'View', setSingleView)}
          <div className="fg-pane-content">{pane(singleView)}</div>
        </div> :
        <div className={vertical ? 'fg-dual-vertical' : 'fg-dual'}>
          <div className="fg-dual-pane">
            {viewPicker(leftView, vertical ? 'Top' : 'Left', setLeftView)}
            <div className="fg-pane-content">{pane(leftView)}</div>
          </div>
          <div className="fg-dual-pane">
            {viewPicker(rightView, vertical ? 'Bottom' : 'Right', setRightView)}
            <div className="fg-pane-content">{pane(rightView)}</div>
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

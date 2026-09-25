import { useEffect, useId, useState } from 'react';
import * as React from 'react';

import { Icon, type IconType } from './Icon';

import { ColorSchemeButton } from './ColorSchemeButton';
import { type CollapsedMap } from './FlameGraph/dataTransform';
import { cx } from './cx';
import { useDebounce, usePrevious } from './hooks';
import { type ColorScheme, type ColorSchemeDiff, type TextAlign } from './types';

import './FlameGraphHeader.css';

type Props = {
  search: string;
  setSearch: (search: string) => void;
  viewMode?: 'single' | 'dual';
  setViewMode?: (mode: 'single' | 'dual') => void;
  onReset: () => void;
  textAlign: TextAlign;
  onTextAlignChange: (align: TextAlign) => void;
  showResetButton: boolean;
  colorScheme: ColorScheme | ColorSchemeDiff;
  onColorSchemeChange: (colorScheme: ColorScheme | ColorSchemeDiff) => void;
  isDiffMode?: boolean;
  stickyHeader: boolean;
  vertical?: boolean;
  setCollapsedMap: (collapsedMap: CollapsedMap) => void;
  collapsedMap: CollapsedMap;
  disableCollapsing?: boolean;

  extraHeaderElements?: React.ReactNode;
};

const FlameGraphHeader = (props: Props) => {
  const [localSearch, setLocalSearch] = useSearchInput(
    props.search,
    props.setSearch,
  );

  const {
    onReset,
    textAlign,
    onTextAlignChange,
    showResetButton,
    colorScheme,
    onColorSchemeChange,
    stickyHeader,
    extraHeaderElements,
    setCollapsedMap,
    collapsedMap,
  } = props;

  return (
    <div className={cx('fg-header', { 'fg-header-sticky': stickyHeader })}>
      <div className="fg-header-input-container">
        <div className="fg-header-search-wrapper">
          <input
            type="text"
            className="fg-header-search-input"
            value={localSearch || ''}
            onChange={(e) => setLocalSearch(e.currentTarget.value)}
            placeholder="Search..."
          />
          {localSearch !== '' ? (
            <button
              type="button"
              className="fg-header-clear-button"
              onClick={() => {
                props.setSearch('');
                setLocalSearch('');
              }}
              aria-label="Clear"
            >
              <Icon name="times" size={12} />
              <span>Clear</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="fg-header-right">
        {showResetButton && (
          <IconBtn
            icon="history-alt"
            label="Reset focus and sandwich state"
            onClick={onReset}
          />
        )}
        <div className="fg-header-control fg-header-spacing-right">
          <span>Colors</span>
          <ColorSchemeButton value={colorScheme} onChange={onColorSchemeChange} isDiffMode={props.isDiffMode} />
        </div>
        {props.viewMode && props.setViewMode && <div className="fg-layout-picker fg-header-spacing-right">
          <span>Layout</span>
          <div className="fg-segmented" role="group" aria-label="Layout">
            <button type="button" title="Show one visualization pane" aria-pressed={props.viewMode === 'single'} onClick={() => props.setViewMode?.('single')}>Single</button>
            <button type="button" title="Show two independently configured visualization panes" aria-pressed={props.viewMode === 'dual'} onClick={() => props.setViewMode?.('dual')}>Dual</button>
          </div>
        </div>}
        <div className="fg-header-control fg-header-spacing-right">
          <span>Grouping</span>
          <div className="fg-header-btn-group">
            <IconBtn
              icon="angle-double-down"
              label="Expand all groups"
              disabled={props.disableCollapsing || collapsedMap.size() === 0}
              onClick={() => setCollapsedMap(collapsedMap.setAllCollapsedStatus(false))}
              grouped
            />
            <IconBtn
              icon="angle-double-up"
              label="Collapse all groups"
              disabled={props.disableCollapsing || collapsedMap.size() === 0}
              onClick={() => setCollapsedMap(collapsedMap.setAllCollapsedStatus(true))}
              grouped
            />
          </div>
        </div>
        <div className="fg-header-radio-control fg-header-spacing-right">
          <span>Text alignment</span>
          <RadioGroup
            name="text-align"
            value={textAlign}
            onChange={onTextAlignChange}
            options={[
              { value: 'left', title: 'Align clipped text left', icon: 'align-left' },
              { value: 'right', title: 'Align clipped text right', icon: 'align-right' },
            ]}
          />
        </div>
        {extraHeaderElements && (
          <div className="fg-header-extra-elements">{extraHeaderElements}</div>
        )}
      </div>
    </div>
  );
};

function IconBtn({
  icon,
  label,
  onClick,
  disabled,
  grouped,
}: {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  grouped?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx(
        'fg-header-icon-btn',
        grouped && 'fg-header-icon-btn-grouped',
        !grouped && 'fg-header-spacing-right',
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

type RadioOption<T extends string> = {
  value: T;
  title: string;
  label?: string;
  icon?: IconType;
};

function RadioGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: RadioOption<T>[];
  disabled?: boolean;
  className?: string;
}) {
  const groupId = useId();
  return (
    <div className={cx('fg-header-radio-group', className)} role="radiogroup">
      {options.map((opt) => {
        const id = `${groupId}-${opt.value}`;
        const checked = value === opt.value;
        return (
          <span key={opt.value} className="fg-header-radio-cell">
            {/* Input must remain a preceding sibling of the label — e2e
                tests use `label/preceding-sibling::input` XPath to find it. */}
            <input
              type="radio"
              id={id}
              name={`${name}-${groupId}`}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
              className="fg-header-radio-input"
              aria-label={opt.title}
            />
            <label
              htmlFor={id}
              title={opt.title}
              className="fg-header-radio-label"
              data-checked={checked}
            >
              {opt.icon && <Icon name={opt.icon} size={14} />}
              {opt.label && <span>{opt.label}</span>}
            </label>
          </span>
        );
      })}
    </div>
  );
}

function useSearchInput(
  search: string,
  setSearch: (search: string) => void,
): [string | undefined, (search: string) => void] {
  const [localSearchState, setLocalSearchState] = useState(search);
  const prevSearch = usePrevious(search);

  // Debouncing cause changing parent search triggers rerender on both the flamegraph and table
  useDebounce(
    () => {
      setSearch(localSearchState);
    },
    250,
    [localSearchState],
  );

  // Make sure we still handle updates from parent (from clicking on a table item for example). We check if the parent
  // search value changed to something that isn't our local value.
  useEffect(() => {
    if (prevSearch !== search && search !== localSearchState) {
      setLocalSearchState(search);
    }
  }, [search, prevSearch, localSearchState]);

  return [localSearchState, setLocalSearchState];
}

export default FlameGraphHeader;

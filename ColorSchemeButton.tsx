import {
  byPackageGradient,
  byValueGradient,
  diffColorBlindGradient,
  diffDefaultGradient,
} from './FlameGraph/colors';
import { Popover, PopoverItem } from './Popover';
import { ColorScheme, ColorSchemeDiff } from './types';
import './ColorSchemeButton.css';

type ColorSchemeButtonProps = {
  value: ColorScheme | ColorSchemeDiff;
  onChange: (colorScheme: ColorScheme | ColorSchemeDiff) => void;
  isDiffMode?: boolean;
};

export function ColorSchemeButton(props: ColorSchemeButtonProps) {
  const gradient = props.isDiffMode
    ? props.value === ColorSchemeDiff.DiffColorBlind
      ? diffColorBlindGradient
      : diffDefaultGradient
    : props.value === ColorScheme.PackageBased
      ? byPackageGradient
      : byValueGradient;

  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          type="button"
          className="fg-cs-button"
          onClick={toggle}
          aria-label="Change color scheme"
          title="Change color scheme"
        >
          <span className="fg-cs-dot" style={{ background: gradient }} />
        </button>
      )}
      overlay={({ close }) => (
        <>
          {props.isDiffMode ? (
            <>
              <PopoverItem
                label="Diff"
                active={props.value === ColorSchemeDiff.Default}
                onClick={() => {
                  props.onChange(ColorSchemeDiff.Default);
                  close();
                }}
              />
              <PopoverItem
                label="Diff (color blind)"
                active={props.value === ColorSchemeDiff.DiffColorBlind}
                onClick={() => {
                  props.onChange(ColorSchemeDiff.DiffColorBlind);
                  close();
                }}
              />
            </>
          ) : (
            <>
              <PopoverItem
                label="By package name"
                active={props.value === ColorScheme.PackageBased}
                onClick={() => {
                  props.onChange(ColorScheme.PackageBased);
                  close();
                }}
              />
              <PopoverItem
                label="By value"
                active={props.value === ColorScheme.ValueBased}
                onClick={() => {
                  props.onChange(ColorScheme.ValueBased);
                  close();
                }}
              />
            </>
          )}
        </>
      )}
    />
  );
}

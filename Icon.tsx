import type { CSSProperties } from 'react';

export type IconType = string;
const symbols: Record<string, string> = {
  times: '×', search: '⌕', 'angle-down': '⌄', 'angle-up': '⌃',
  'angle-right': '›', sandwich: '☰', 'arrow-down': '↓', 'arrow-up': '↑',
};

export function Icon({ name, size = 14, className }: { name: IconType; size?: number; className?: string }) {
  const style: CSSProperties = { fontSize: size };
  return <span className={className} style={style} aria-hidden="true">{symbols[name] ?? '•'}</span>;
}

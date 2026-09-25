import type { ReactNode } from 'react';

export type IconType = string;

/** Small local replacements for the Grafana icons used by the flamegraph controls. */
const paths: Record<string, ReactNode> = {
  'angle-double-down': (
    <>
      <path d="m4 5 4 4 4-4M4 10l4 4 4-4" />
    </>
  ),
  'angle-double-up': (
    <>
      <path d="m4 11 4-4 4 4M4 6l4-4 4 4" />
    </>
  ),
  'angle-down': <path d="m3 6 5 5 5-5" />,
  'angle-up': <path d="m3 10 5-5 5 5" />,
  'angle-right': <path d="m6 3 5 5-5 5" />,
  'align-left': <path d="M2 3h12M2 6h8M2 9h12M2 12h8" />,
  'align-right': <path d="M2 3h12M6 6h8M2 9h12M6 12h8" />,
  'history-alt': (
    <>
      <path d="M3 5a6 6 0 1 1-1 4M3 1v4h4" />
      <path d="M8 5v4l2 1" />
    </>
  ),
  times: <path d="M3 3 13 13M13 3 3 13" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4" />
      <path d="m10 10 4 4" />
    </>
  ),
  sandwich: (
    <>
      <path d="M2 4h12M4 8h8M2 12h12" />
    </>
  ),
  copy: (
    <>
      <rect x="5" y="5" width="9" height="9" rx="1" />
      <path d="M2 11V2h9" />
    </>
  ),
  eye: (
    <>
      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5Z" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  'exclamation-circle': (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4v5M8 12h.01" />
    </>
  ),
};

export function Icon({
  name,
  size = 14,
  className,
}: {
  name: IconType;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="presentation"
      aria-hidden="true"
    >
      {paths[name] ?? <circle cx="8" cy="8" r="3" />}
    </svg>
  );
}

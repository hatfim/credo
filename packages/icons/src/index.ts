// Only this package imports the vendor package (PRD 5.3). Re-export per icon, from the
// per-icon path, so a bundle never carries the whole set. Add an icon here only when a
// component uses it. Server components and SSR use the `./server` entry.
export { CircleNotchIcon } from "@phosphor-icons/react/dist/csr/CircleNotch";
export type { Icon, IconProps, IconWeight } from "@phosphor-icons/react";

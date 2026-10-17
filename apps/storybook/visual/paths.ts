import { resolve } from "node:path";

// VISUAL_SNAPSHOT_DIR exists only so a scratch run can use a throwaway directory.
export const snapshotDir = resolve(process.env.VISUAL_SNAPSHOT_DIR ?? resolve(import.meta.dirname, "__snapshots__"));
// Regeneration is allowed only on CI and only when asked for explicitly.
export const updating = process.env.VISUAL_UPDATE === "1" && Boolean(process.env.CI);

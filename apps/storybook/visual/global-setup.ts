import { existsSync, readdirSync } from "node:fs";
import { snapshotDir, updating } from "./paths";

// Baselines change only through CI. Refuse a local update, and fail clearly when none exist.
export default function globalSetup() {
  const asksUpdate = process.argv.some((a) => a.startsWith("--update-snapshots") || a === "-u");
  if ((asksUpdate || process.env.VISUAL_UPDATE === "1") && !process.env.CI) {
    throw new Error(
      "Refusing to update visual baselines locally. Baselines are generated on the CI runner (Linux) " +
        "by the 'Update visual baselines' workflow. See docs/contributing/visual-testing.md.",
    );
  }
  if (updating) return;
  const has = existsSync(snapshotDir) && readdirSync(snapshotDir).some((f) => f.endsWith(".png"));
  if (!has) {
    throw new Error(
      `No visual baselines in ${snapshotDir}. Run the 'Update visual baselines' workflow once, ` +
        "commit the downloaded artifact through a pull request, then re-run. See docs/contributing/visual-testing.md.",
    );
  }
}

import { describe, expect, it } from "vitest";
import { buildArtifacts, type TokenTable } from "../src/build";
import { DIFF_MARKER, compareWithFirstAvailable, diffTables } from "../src/diff";
import { makeValid } from "./fixtures/valid";

async function tableOf(mutate?: (f: ReturnType<typeof makeValid>) => void) {
  const f = makeValid();
  mutate?.(f);
  return { text: JSON.stringify(f), table: JSON.parse((await buildArtifacts(f)).table) as TokenTable };
}

const greyChange = (f: ReturnType<typeof makeValid>) => {
  f["Primitives/Default"].color.grey["500"].$value = "#707070";
};

describe("diffTables", () => {
  it("is empty for identical files", async () => {
    const a = await tableOf();
    expect(diffTables(a.table, a.table)).toEqual([]);
  });

  it("reports a changed resolved value", async () => {
    const a = await tableOf();
    const b = await tableOf(greyChange);
    const changes = diffTables(a.table, b.table);
    expect(changes.map((c) => c.name)).toContain("content.disabled (light)");
    expect(changes.find((c) => c.name === "content.disabled (light)")?.after).toBe("#707070");
  });
});

describe("compareWithFirstAvailable", () => {
  it("uses the previous commit when readable", async () => {
    const a = await tableOf();
    const b = await tableOf(greyChange);
    const md = await compareWithFirstAvailable(b.text, [
      { label: "the previous commit", read: () => a.text },
      { label: "`origin/main`", read: () => { throw new Error("must not be read"); } },
    ]);
    expect(md).toContain(DIFF_MARKER);
    expect(md).toContain("Compared with the previous commit.");
    expect(md).toContain("| content.disabled (light) |");
  });

  it("falls back to main when there is no previous commit", async () => {
    const a = await tableOf();
    const b = await tableOf(greyChange);
    const md = await compareWithFirstAvailable(b.text, [
      { label: "the previous commit", read: () => undefined },
      { label: "`origin/main`", read: () => a.text },
    ]);
    expect(md).toContain("Compared with `origin/main`.");
    expect(md).toContain("2 resolved values changed.");
  });

  it("falls back when the previous version is not a buildable token file", async () => {
    const a = await tableOf();
    const md = await compareWithFirstAvailable(a.text, [
      { label: "the previous commit", read: () => "not json" },
      { label: "`origin/main`", read: () => a.text },
    ]);
    expect(md).toContain("Compared with `origin/main`.");
  });

  it("states no change", async () => {
    const a = await tableOf();
    const md = await compareWithFirstAvailable(a.text, [{ label: "`origin/main`", read: () => a.text }]);
    expect(md).toContain("No resolved value changed");
  });

  it("says so when nothing can be read", async () => {
    const a = await tableOf();
    const md = await compareWithFirstAvailable(a.text, [{ label: "x", read: () => undefined }]);
    expect(md).toContain("no comparison is shown");
  });

  it("adds a total against main when the delta is against the previous commit", async () => {
    const a = await tableOf();
    const b = await tableOf(greyChange);
    const md = await compareWithFirstAvailable(
      b.text,
      [{ label: "the previous commit", read: () => b.text }],
      { label: "`origin/main`", read: () => a.text },
    );
    expect(md).toContain("Compared with the previous commit.");
    expect(md).toContain("No resolved value changed");
    expect(md).toContain("Total in this pull request, compared with `origin/main`: 2 resolved values changed.");
  });
});

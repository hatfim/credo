import { describe, expect, it } from "vitest";
import { formatIssue, validateText, validateTokens } from "../src/validate";
import { makeValid } from "./fixtures/valid";

const codes = (f: unknown) => validateTokens(f).filter((i) => i.severity === "error");

describe("validateTokens", () => {
  it("accepts the valid fixture", () => {
    expect(validateTokens(makeValid())).toEqual([]);
  });

  it("reports invalid JSON readably", () => {
    const [issue] = validateText("{ not json");
    expect(issue?.code).toBe("invalid-json");
    expect(formatIssue(issue!)).toMatch(/^error \[invalid-json\] File is not valid JSON/);
  });

  it("fails an unresolved alias and names it", () => {
    const f = makeValid();
    f["Semantic/Light"].surface.page.$value = "{scale.neutral.999}";
    const issues = codes(f);
    expect(issues).toHaveLength(1);
    expect(formatIssue(issues[0]!)).toBe(
      "error [alias-unresolved] Semantic/Light surface.page: Alias {scale.neutral.999} does not resolve (checked in light context).",
    );
  });

  it("fails an alias cycle", () => {
    const f = makeValid();
    f["Brand/Default"].scale.neutral["50"].$value = "{scale.neutral.500}";
    f["Brand/Default"].scale.neutral["500"].$value = "{scale.neutral.50}";
    expect(codes(f).some((i) => i.code === "alias-cycle")).toBe(true);
  });

  it("fails a token without $type", () => {
    const f = makeValid();
    delete f["Semantic/Light"].surface.page.$type;
    expect(codes(f).map((i) => i.code)).toContain("missing-type");
  });

  it("fails a name defined in two stacked sets", () => {
    const f = makeValid();
    f["Brand/Default"].color = { white: { $type: "color", $value: "#fff" } };
    const dup = codes(f).find((i) => i.code === "duplicate");
    expect(dup?.message).toContain('"Primitives/Default" and "Brand/Default"');
  });

  it("fails light/dark key parity", () => {
    const f = makeValid();
    delete f["Semantic/Dark"].content.tertiary;
    const issue = codes(f).find((i) => i.code === "parity");
    expect(issue).toMatchObject({ set: "Semantic/Dark", path: "content.tertiary" });
  });

  it("fails names that are not lowercase kebab-case", () => {
    const f = makeValid();
    f["Semantic/Light"].surface["Page Alt"] = f["Semantic/Light"].surface.page;
    expect(codes(f).some((i) => i.code === "name" && i.message.includes("Page Alt"))).toBe(true);
  });

  it("fails a raw hex outside Primitives, alpha and shadow.color", () => {
    const f = makeValid();
    f["Semantic/Light"].surface.page.$value = "#ffffff";
    const issues = codes(f).filter((i) => i.code === "raw-literal");
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain("only allowed in Primitives, alpha.* and shadow.color.*");
  });

  it("allows raw hex in alpha and shadow.color", () => {
    expect(codes(makeValid())).toEqual([]);
  });

  it("fails an alpha literal whose RGB is not the named scale step", () => {
    const f = makeValid();
    f["Semantic/Light"].alpha.destructive["5"].$value = "#d134470d";
    const issue = codes(f).find((i) => i.code === "alpha-source");
    expect(issue?.message).toBe("RGB #d13447 does not match scale.destructive.600 (#cf3359).");
  });

  it("checks the dark alpha source separately", () => {
    const f = makeValid();
    f["Semantic/Dark"].alpha.neutral["5"].$value = "#2020200d";
    const issue = codes(f).find((i) => i.code === "alpha-source");
    expect(issue).toMatchObject({ set: "Semantic/Dark", path: "alpha.neutral.5" });
  });

  it("fails an alias whose target has another $type", () => {
    const f = makeValid();
    f["Semantic/Light"].surface.page.$value = "{font-size.40}";
    expect(codes(f).some((i) => i.code === "alias-type")).toBe(true);
  });

  it("fails a role group outside the contract", () => {
    const f = makeValid();
    f["Semantic/Light"].background = { page: f["Semantic/Light"].surface.page };
    f["Semantic/Dark"].background = { page: f["Semantic/Dark"].surface.page };
    expect(codes(f).some((i) => i.code === "role-group" && i.path === "background")).toBe(true);
  });

  it("fails a missing set", () => {
    const f = makeValid();
    delete f["Semantic/Dark"];
    expect(codes(f).some((i) => i.code === "set-missing")).toBe(true);
  });
});

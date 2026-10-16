import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins conditional classes", () => {
    expect(cn("a", Math.random() > 2 && "b", ["c", { d: true, e: false }])).toBe("a c d");
  });

  it("lets the last conflicting utility win", () => {
    expect(cn("px-4 bg-actions-primary-default", "px-2")).toBe("bg-actions-primary-default px-2");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });
});

import axe, { type AxeResults, type ImpactValue, type Result, type RunOptions } from "axe-core";

const order: ImpactValue[] = ["minor", "moderate", "serious", "critical"];

export type A11yOptions = {
  /** Lowest impact that fails the check. Default "minor" (any violation fails). */
  minImpact?: ImpactValue;
  /** Extra axe run options. */
  axe?: RunOptions;
};

/** Runs axe on an element. jsdom has no layout, so the colour-contrast rule is off here; contrast is checked on tokens and in Storybook. */
export async function runAxe(element: Element, options: A11yOptions = {}): Promise<AxeResults> {
  return axe.run(element, {
    rules: { "color-contrast": { enabled: false } },
    ...options.axe,
  });
}

export function filterViolations(violations: Result[], minImpact: ImpactValue = "minor"): Result[] {
  const min = order.indexOf(minImpact);
  return violations.filter((v) => order.indexOf(v.impact ?? "minor") >= min);
}

/** Throws with a readable message when the element has accessibility violations. */
export async function expectNoA11yViolations(
  element: Element,
  options: A11yOptions = {},
): Promise<void> {
  const results = await runAxe(element, options);
  const found = filterViolations(results.violations, options.minImpact);
  if (found.length > 0) {
    const lines = found.map(
      (v) => `- ${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.html).join("\n  ")}`,
    );
    throw new Error(`Accessibility violations:\n${lines.join("\n")}`);
  }
}

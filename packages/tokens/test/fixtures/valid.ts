import type { TokenFile } from "../../src/model";

const c = (value: string) => ({ $type: "color", $value: value });
const d = (value: string) => ({ $type: "dimension", $value: value });

/** A small but complete token file: every set, every role group, all contract rules satisfied. */
// Tests mutate nested tokens freely, so the fixture is deliberately loosely typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeValid(): TokenFile & Record<string, any> {
  const semantic = (mode: "light" | "dark") => {
    const ink = mode === "light" ? "{scale.neutral.900}" : "{scale.neutral.50}";
    const page = mode === "light" ? "{scale.neutral.50}" : "{scale.neutral.900}";
    return {
      surface: { page: c(page), container: c(page) },
      content: { primary: c(ink), secondary: c(ink), tertiary: c(ink), disabled: c("{scale.neutral.500}") },
      field: { background: c(page), border: c(ink), "border-focus": c(ink) },
      actions: {
        primary: {
          default: c("{scale.primary.500}"),
          hover: c("{scale.primary.500}"),
          pressed: c("{scale.primary.500}"),
          foreground: c("{scale.neutral.900}"),
        },
      },
      state: { focus: { ring: c(ink) } },
      border: { default: c(ink) },
      feedback: { error: { default: c("{scale.destructive.600}") } },
      alpha: {
        neutral: { "5": c(mode === "light" ? "#2020200d" : "#0000000d") },
        primary: { "5": c(mode === "light" ? "#7992000d" : "#c8f0000d") },
        destructive: { "5": c(mode === "light" ? "#cf33590d" : "#de4b690d") },
      },
      shadow: { color: { default: c("#00000012") } },
    };
  };
  const typography = (size: string) => ({ display: { large: { "font-size": d(size) } } });
  return {
    "Primitives/Default": {
      color: {
        white: c("#ffffff"),
        black: c("#000000"),
        grey: { "50": c("#fafafa"), "500": c("#808080"), "900": c("#202020") },
        lime: { "500": c("#c8f000"), "700": c("#799200") },
        red: { "500": c("#de4b69"), "600": c("#cf3359") },
      },
      "font-size": { "32": d("2rem"), "40": d("2.5rem") },
    },
    "Brand/Default": {
      scale: {
        neutral: { "50": c("{color.grey.50}"), "500": c("{color.grey.500}"), "900": c("{color.grey.900}") },
        primary: { "500": c("{color.lime.500}"), "700": c("{color.lime.700}") },
        destructive: { "500": c("{color.red.500}"), "600": c("{color.red.600}") },
      },
    },
    "Semantic/Light": semantic("light"),
    "Semantic/Dark": semantic("dark"),
    "Typography/Desktop": typography("{font-size.40}"),
    "Typography/Mobile": typography("{font-size.32}"),
    $themes: [],
    $metadata: {
      tokenSetOrder: [
        "Primitives/Default",
        "Brand/Default",
        "Semantic/Light",
        "Semantic/Dark",
        "Typography/Desktop",
        "Typography/Mobile",
      ],
    },
  };
}

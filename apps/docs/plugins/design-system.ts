// Wires the real design system into the docs build:
//  - Tailwind v4 through PostCSS, so src/css/custom.css generates the utilities the real
//    @usecredo/ui components use;
//  - MDX partials in docs/_generated (gitignored), written at build time from the built packages:
//    API tables from the TypeScript declarations of @usecredo/ui (the files a consumer's editor
//    reads) and the token reference from @usecredo/tokens/table.json. Pages import the partials.
//    Nothing in them is written by hand.
import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/postcss";
import { withCompilerOptions } from "react-docgen-typescript";

type PostcssHook = (root: { source?: { input: { file?: string } } }, helpers: unknown) => unknown;
interface PostcssPlugin {
  postcssPlugin: string;
  plugins?: PostcssPlugin[];
  [hook: string]: unknown;
}

/**
 * Tailwind must only process src/css/custom.css. Run on Infima, the module CSS and the search
 * plugin's CSS it rewrites or drops rules (for example the contents of `@layer infima`).
 */
function onlyDesignSystemCss(plugin: PostcssPlugin): PostcssPlugin {
  const guard = (p: PostcssPlugin): PostcssPlugin => {
    const out: PostcssPlugin = { postcssPlugin: p.postcssPlugin };
    for (const [key, value] of Object.entries(p)) {
      if (key === "postcssPlugin" || key === "plugins") continue;
      out[key] = (root: Parameters<PostcssHook>[0], helpers: unknown) =>
        root.source?.input.file?.endsWith(path.join("src", "css", "custom.css"))
          ? (value as PostcssHook)(root, helpers)
          : undefined;
    }
    return out;
  };
  return { postcssPlugin: "credo-tailwind-scope", plugins: (plugin.plugins ?? [plugin]).map(guard) };
}

interface PackageJson {
  exports: Record<string, string | { types?: string }>;
}
const readPackage = (siteDir: string, name: string) => {
  const dir = path.join(siteDir, "node_modules", name);
  return { dir, pkg: JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as PackageJson };
};

/** Subpaths of @usecredo/ui with types, read from its exports map (the public API). */
export function componentTypeEntries(siteDir: string): { name: string; dts: string }[] {
  const { dir, pkg } = readPackage(siteDir, "@usecredo/ui");
  return Object.entries(pkg.exports).flatMap(([key, value]) =>
    key !== "." && typeof value === "object" && value.types
      ? [{ name: key.slice(2), dts: path.join(dir, value.types) }]
      : [],
  );
}

const cell = (text: string) => text.replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").replace(/[{}<>]/g, (c) => `\\${c}`);
const code = (text: string) => `<code>${text.replace(/[{}<>|&]/g, (c) => `&#${c.charCodeAt(0)};`)}</code>`;

interface TokenTable {
  roles: { path: string; group: string; variable: string; type: string; value: { light: string; dark: string } }[];
  scales: { path: string; variable: string; value: string }[];
  typography: { path: string; variable: string; desktop: string; mobile: string }[];
}

const table = (head: string[], rows: string[][]) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

const swatch = (value: string) =>
  `<span className="credo-swatch" style={{ background: ${JSON.stringify(value)} }} aria-hidden="true" />`;

function tokensMdx(t: TokenTable): { roles: string; scales: string; typography: string } {
  const groups = [...new Set(t.roles.map((r) => r.group))];
  const roles = groups
    .map((group) => {
      const rows = t.roles
        .filter((r) => r.group === group)
        .map((r) => {
          const color = (v: string) => `${r.type === "color" ? swatch(v) : ""}${code(v)}`;
          return [code(r.path), code(r.variable), color(r.value.light), color(r.value.dark)];
        });
      return `### ${group}\n\n${table(["Role", "CSS variable", "Light", "Dark"], rows)}\n`;
    })
    .join("\n");
  const scales = table(
    ["Token", "CSS variable", "Value"],
    t.scales.map((s) => [code(s.path), code(s.variable), code(s.value)]),
  );
  const typography = table(
    ["Token", "CSS variable", "Desktop", "Mobile"],
    t.typography.map((s) => [code(s.path), code(s.variable), code(s.desktop), code(s.mobile)]),
  );
  return { roles, scales, typography };
}

export default function designSystem(context: { siteDir: string }) {
  return {
    name: "credo-design-system",
    configurePostCss(options: { plugins: unknown[] }) {
      // First, so Tailwind sees the source before the other transforms.
      options.plugins.unshift(onlyDesignSystemCss(tailwindcss() as unknown as PostcssPlugin));
      return options;
    },
    async loadContent() {
      const out = path.join(context.siteDir, "docs/_generated");
      fs.mkdirSync(out, { recursive: true });

      const parser = withCompilerOptions(
        { jsx: 4, module: 99, moduleResolution: 100, target: 99, strict: true, skipLibCheck: true },
        {
          shouldExtractLiteralValuesFromEnum: true,
          shouldRemoveUndefinedFromOptional: true,
          // Props inherited from @types/react (native button attributes) are summarised in prose
          // on the page, not listed one by one.
          propFilter: (prop) => !prop.parent || !/@types\/react\//.test(prop.parent.fileName),
        },
      );
      for (const { name, dts } of componentTypeEntries(context.siteDir)) {
        const [component] = parser.parse(dts);
        if (!component) throw new Error(`No component found in ${dts}`);
        const rows = Object.values(component.props).map((p) => [
          `<code>${p.name}</code>${p.required ? " (required)" : ""}`,
          code(p.type.name),
          p.defaultValue ? code(String((p.defaultValue as { value: unknown }).value)) : "-",
          cell(p.description) || "-",
        ]);
        fs.writeFileSync(
          path.join(out, `api-${name}.mdx`),
          `${table(["Prop", "Type", "Default", "Description"], rows)}\n`,
        );
      }

      const { dir, pkg } = readPackage(context.siteDir, "@usecredo/tokens");
      const tableFile = path.join(dir, pkg.exports["./table.json"] as string);
      const tokens = tokensMdx(JSON.parse(fs.readFileSync(tableFile, "utf8")) as TokenTable);
      fs.writeFileSync(path.join(out, "tokens-roles.mdx"), tokens.roles);
      fs.writeFileSync(path.join(out, "tokens-scales.mdx"), tokens.scales + "\n");
      fs.writeFileSync(path.join(out, "tokens-typography.mdx"), tokens.typography + "\n");
    },
  };
}

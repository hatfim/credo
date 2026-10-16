// Webpack loader: wraps a stylesheet in `@layer infima { ... }`.
export default function layerLoader(source) {
  return `@layer infima {\n${source}\n}\n`;
};

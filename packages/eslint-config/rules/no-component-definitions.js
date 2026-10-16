const isPascal = (name) => typeof name === "string" && /^[A-Z][A-Za-z0-9]*$/.test(name);
const WRAPPERS = new Set(["forwardRef", "memo"]);

function calleeName(callee) {
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
    return callee.property.name;
  }
  return undefined;
}

/** Forbids React component definitions. Components live in packages/ui. */
export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      noComponent:
        "Component definition '{{name}}' is not allowed here. Components live in @usecredo/ui (BLD-09).",
    },
  },
  create(context) {
    const stack = [];
    const nameOf = (node) => {
      if (node.type === "FunctionDeclaration" && node.id) return node.id.name;
      if (node.id) return node.id.name;
      const p = node.parent;
      if (p?.type === "VariableDeclarator" && p.id.type === "Identifier") return p.id.name;
      return undefined;
    };
    const enter = (node) => stack.push({ node, jsx: false });
    const exit = () => {
      const frame = stack.pop();
      const name = nameOf(frame.node);
      if (frame.jsx && isPascal(name)) {
        context.report({ node: frame.node, messageId: "noComponent", data: { name } });
      }
    };
    const markJsx = () => stack.forEach((f) => (f.jsx = true));
    return {
      FunctionDeclaration: enter,
      "FunctionDeclaration:exit": exit,
      FunctionExpression: enter,
      "FunctionExpression:exit": exit,
      ArrowFunctionExpression: enter,
      "ArrowFunctionExpression:exit": exit,
      JSXElement: markJsx,
      JSXFragment: markJsx,
      CallExpression(node) {
        const p = node.parent;
        if (
          WRAPPERS.has(calleeName(node.callee)) &&
          p?.type === "VariableDeclarator" &&
          p.id.type === "Identifier" &&
          isPascal(p.id.name)
        ) {
          context.report({ node, messageId: "noComponent", data: { name: p.id.name } });
        }
      },
      ClassDeclaration(node) {
        const sc = node.superClass;
        const base = sc && (sc.type === "Identifier" ? sc.name : sc.property?.name);
        if (node.id && (base === "Component" || base === "PureComponent")) {
          context.report({ node, messageId: "noComponent", data: { name: node.id.name } });
        }
      },
    };
  },
};

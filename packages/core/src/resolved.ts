
import { EvalContext, ExpressionEngine, Json } from "@print-engine/expr";
import { Node, PrintDocument, Style } from "@print-engine/schema";

export type ResolvedNode =
  | { kind: 'block'; direction: 'column' | 'row'; style?: Style; children: ResolvedNode[]; breakInside?: 'auto' | 'avoid'; keepWithNext?: boolean }
  | { kind: 'canvas'; width?: string; height: string; style?: Style; children: ResolvedPositioned[] }
  | { kind: 'text'; value: string; inline?: boolean; style?: Style }
  | { kind: 'image'; src: string; width?: string; height?: string; style?: Style };

export interface ResolvedPositioned {
  x: string; 
  y: string; 
  w?: string; 
  h?: string;
  node: ResolvedNode;
}

export interface ResolvedDocument {
  header?: ResolvedNode;
  body: ResolvedNode;
  footer?: ResolvedNode;
}

export function applyFormat(value: Json, format: string | undefined): string {
  if (value == null) return '';
  
  if (format != null) {
    const splitRes = format.split(':');
    const formatType = splitRes[0];
    const formatPattern = splitRes[1];
    switch (formatType) {
      case 'number': {
        const decimals = formatPattern?.includes('.')
          ? formatPattern.split('.')[1]!.length
          : 0;
        const num = Number(value);
        return Number.isNaN(num) 
          ? String(value) 
          : new Intl.NumberFormat('it-IT', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          }).format(num);
      }
      // LIMITATION: naive token replacement — only the dd/MM/yyyy tokens are
      // recognized (yy, single M/d, and month names are unsupported), and
      // new Date(String) assumes ISO input; non-ISO strings are unreliable.
      case 'date': {
        const d = new Date(String(value));
        if (Number.isNaN(d.getTime())) return String(value);  // data is not valid
        const dd = String(d.getDate()).padStart(2, '0');
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = String(d.getFullYear());
        return (formatPattern ?? 'dd/MM/yyyy')
          .replace('yyyy', yyyy)
          .replace('dd', dd)
          .replace('MM', MM);
      }
    }
  }
  return String(value);
}

function resolveNode(node: Node, ctx: EvalContext, engine: ExpressionEngine): ResolvedNode {
  switch (node.type) {
    case 'text':
      return {
        kind: 'text',
        value: node.value,
        inline: node.inline,
        style: resolveStyle(node.style, ctx, engine),
      }
    case 'stack':
      return {
        kind: 'block',
        direction: node.direction ?? 'column',
        style: resolveStyle(node.style, ctx, engine),
        breakInside: node.breakInside,
        keepWithNext: node.keepWithNext,
        children: node.children.map(c => resolveNode(c, ctx, engine))
      };
    case 'field': {
      const r = engine.evaluate(node.bind, ctx);
      const raw = r.ok ? r.value : null;
      const text = applyFormat(raw, node.format);
      return {
        kind: 'text',
        value: (node.prefix ?? '') + text + (node.suffix ?? ''),
        style: resolveStyle(node.style, ctx, engine),
      };
    };
    case 'repeat': {
      const source = engine.evaluate(node.dataSource, ctx);
      const data = source.ok ? source.value : [];
      const children = Array.isArray(data) 
        ? data.map(el => resolveNode(node.template, { ...ctx, item: el }, engine))
        : [];
      return { 
        kind: 'block', 
        direction: 'column', 
        style: resolveStyle(node.style, ctx, engine),
        children,
        breakInside: node.breakInside,
        keepWithNext: node.keepWithNext,
      };
    };
    case 'group': {
      const source = engine.evaluate(node.dataSource, ctx);
      const mappedGroups: Map<string, Json[]> = new Map<string, Json[]>();
      const data = source.ok ? source.value : [];
      if (Array.isArray(data)) {
        data.forEach(el => {
          const groupVal = engine.evaluate(node.groupBy, {...ctx, item: el});
          if (groupVal.ok)
          {
            const key = String(groupVal.value);
            const list = mappedGroups.get(key) ?? [];
            list.push(el);
            mappedGroups.set(key, list);            
          }
        });
      }
      let children: ResolvedNode[] = [];

      mappedGroups.forEach((elements, groupKey) => {
        if (node.groupHeader != null) {
          children.push(
            resolveNode(node.groupHeader, {...ctx, group: {key: groupKey, items: elements}}, engine)
          );
        }
        // details
        elements.forEach(element => {
          children.push(
            resolveNode(node.detail, {...ctx, group: {key: groupKey, items: elements}, item: element}, engine)
          );
        });
        if (node.groupFooter != null) {
          children.push(
            resolveNode(node.groupFooter, {...ctx, group: {key: groupKey, items: elements}}, engine)
          );
        }
      });
      return { 
        kind: 'block', 
        direction: 'column', 
        style: resolveStyle(node.style, ctx, engine),
        children,
        breakInside: node.breakInside,
        keepWithNext: node.keepWithNext,
      };
    };
    case 'canvas':
      return {
        kind: 'canvas',
        height: node.height,
        style: resolveStyle(node.style, ctx, engine),
        width: node.width,
        children: node.children.map((c) => {
          return {
            x: c.x,
            y: c.y, 
            h: c.h,
            w: c.w,
            node: resolveNode(c.node, ctx, engine)
          }
        })
      };
    case 'image': {
      let src = '';
      if ('src' in node) {
        src = node.src;
      } else {
        const evalResult = engine.evaluate(node.bind, ctx);
        if (evalResult.ok)
        {
          src = String(evalResult.value);
        }
      }
      return {
        kind: 'image',
        height: node.height,
        width: node.width,
        style: resolveStyle(node.style, ctx, engine),
        src 
      };
    }
  
    default:
      throw new Error(`unhandled node type`);
  }
}

export function resolveStyle(style: Style | undefined, ctx: EvalContext, engine: ExpressionEngine): Style | undefined {
  if (style == null) return;

  const resolvedStyle: Style = {...style};
  // LIMITATION: only *string* style properties can be '=' expressions, and the
  // evaluated result is always coerced to String. Numeric props (e.g. weight,
  // grow) are therefore always literal — a data-driven numeric style value is
  // not supported yet.
  Object.entries(style).forEach(e => {
    const key = e[0] as keyof Style;
    const value = e[1];
    if (typeof value === 'string' && value.startsWith('=')) {
      const evaluationValue = value.substring(1, value.length);
      // need to evaluate
      const evaluationResult = engine.evaluate(evaluationValue, ctx);
      if (evaluationResult.ok) {
        (resolvedStyle as Record<string, unknown>)[key] = String(evaluationResult.value);
      } else {
        // not managed
        delete (resolvedStyle as Record<string, unknown>)[key];
      }
    }
  });
  
  return resolvedStyle;
}

export function resolve(doc: PrintDocument, data: Json, engine: ExpressionEngine): ResolvedDocument {
  const ctx = { root: data };
  return {
    header: doc.regions?.header ? resolveNode(doc.regions.header, ctx, engine): undefined,
    body: resolveNode(doc.body, ctx, engine),
    footer: doc.regions?.footer ? resolveNode(doc.regions.footer, ctx, engine) : undefined
  }
}
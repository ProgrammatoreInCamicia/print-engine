
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

function resolveNode(node: Node, ctx: EvalContext, engine: ExpressionEngine): ResolvedNode {
  switch (node.type) {
    case 'text':
      return {
        kind: 'text',
        value: node.value,
        inline: node.inline,
        style: node.style,
      }
    case 'stack':
      return {
        kind: 'block',
        direction: node.direction ?? 'column',
        style: node.style,
        breakInside: undefined, // TODO i hasn't this info
        keepWithNext: undefined, // TODO i hasn't this info
        children: node.children.map(c => resolveNode(c, ctx, engine))
      };
    case 'field': {
      const r = engine.evaluate(node.bind, ctx);
      const raw = r.ok ? r.value : null;
      const text = raw == null ? '' : String(raw);
      return {
        kind: 'text',
        value: (node.prefix ?? '') + text + (node.suffix ?? ''),
        style: node.style,
      };
    };
    case 'repeat': {
      const source = engine.evaluate(node.dataSource, ctx);
      const data = source.ok ? source.value : [];
      const children = Array.isArray(data) 
        ? data.map(el => resolveNode(node.template, { ...ctx, item: el }, engine))
        : [];
      return { kind: 'block', direction: 'column', style: node.style, children };
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

      mappedGroups.forEach((elements, grounpKey) => {
        if (node.groupHeader != null) {
          children.push(
            resolveNode(node.groupHeader, {...ctx, group: {key: grounpKey, items: elements}}, engine)
          );
        }
        // details
        elements.forEach(element => {
          children.push(
            resolveNode(node.detail, {...ctx, group: {key: grounpKey, items: elements}, item: element}, engine)
          );
        });
        if (node.groupFooter != null) {
          children.push(
            resolveNode(node.groupFooter, {...ctx, group: {key: grounpKey, items: elements}}, engine)
          );
        }
      });
      return { kind: 'block', direction: 'column', style: node.style, children };
    };
    case 'canvas':
      return {
        kind: 'canvas',
        height: node.height,
        style: node.style,
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
        style: node.style,
        src 
      };
    }
  
    default:
      throw new Error(`unhandled node type`);
  }
}

export function resolve(doc: PrintDocument, data: Json, engine: ExpressionEngine): ResolvedDocument {
  const ctx = { root: data };
  return {
    header: doc.regions?.header ? resolveNode(doc.regions.header, ctx, engine): undefined,
    body: resolveNode(doc.body, ctx, engine),
    footer: doc.regions?.footer ? resolveNode(doc.regions.footer, ctx, engine) : undefined
  }
}
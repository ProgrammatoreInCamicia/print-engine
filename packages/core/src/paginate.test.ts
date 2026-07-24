import { describe, it, expect } from 'vitest';
import { paginate } from './paginate.js';
import { LeafCountMeasurer } from './measure.js';
import type { ResolvedNode } from './resolved.js';
import type { PrintDocument } from '@print-engine/schema';

// A4 portrait, margine 15mm → area utile 180 × 267 mm
const doc: PrintDocument = {
  schemaVersion: 1,
  page: { size: 'A4', orientation: 'portrait', margin: '15mm' },
  body: { type: 'text', value: 'placeholder' },
};

function textNode(value: string): ResolvedNode {
  return { kind: 'text', value };
}

function tree(...values: string[]): ResolvedNode {
  return {
    kind: 'block',
    direction: 'column',
    children: values.map(textNode),
  };
}

function valuesOf(nodes: ResolvedNode[]): string[] {
  return nodes.flatMap((n) =>
    n.kind === 'block' ? valuesOf(n.children) : [(n as { value: string }).value],
  );
}

describe('paginate', () => {
  it('keeps the whole tree on one page when it fits', () => {
    // 3 foglie × 50mm = 150mm ≤ 267mm → il blocco radice entra intero
    const result = paginate(doc, tree('a', 'b', 'c'), new LeafCountMeasurer(50));

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]!.nodes).toHaveLength(1);
    expect(result.pages[0]!.nodes[0]!.kind).toBe('block');
    expect(result.pages[0]!.pageNumber).toBe(1);
  });

  it('descends into the tree when the whole block does not fit', () => {
    // 5 foglie × 100mm = 500mm > 267mm → scende nei figli
    // 2 foglie per pagina (200 ok, 300 no) → 2, 2, 1
    const result = paginate(
      doc,
      tree('a', 'b', 'c', 'd', 'e'),
      new LeafCountMeasurer(100),
    );

    expect(result.pages).toHaveLength(3);
    expect(result.pages.map((p) => p.nodes.length)).toEqual([2, 2, 1]);
  });

  it('numbers pages sequentially', () => {
    const result = paginate(
      doc,
      tree('a', 'b', 'c', 'd', 'e'),
      new LeafCountMeasurer(100),
    );

    expect(result.pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
  });

  it('keeps node order across pages', () => {
    const result = paginate(
      doc,
      tree('a', 'b', 'c', 'd', 'e'),
      new LeafCountMeasurer(100),
    );

    const values = result.pages.flatMap((p) => valuesOf(p.nodes));
    expect(values).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('returns a single page for empty content', () => {
    // blocco vuoto → 0 foglie → altezza 0 → entra nella pagina 1
    const result = paginate(doc, tree(), new LeafCountMeasurer(50));

    expect(result.pages).toHaveLength(1);
  });

  it('places an oversized leaf on its own page without looping', () => {
    // ogni foglia è 400mm > 267mm: nessuna ci sta, ma non deve ciclare
    const result = paginate(
      doc,
      tree('big', 'after'),
      new LeafCountMeasurer(400),
    );

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]!.nodes).toHaveLength(1);
    expect(result.pages[1]!.nodes).toHaveLength(1);
  });

  it('keeps an inner block together when it fits', () => {
    const nested: ResolvedNode = {
      kind: 'block',
      direction: 'column',
      children: [
        textNode('a'),
        {
          kind: 'block',
          direction: 'row',
          children: [textNode('b'), textNode('c')],
        },
        textNode('d'),
      ],
    };

    // 4 foglie × 80mm = 320mm > 267 → scende nella radice.
    // 'a' (80) entra, il block [b,c] (160) entra → 240,
    // 'd' (80) non entra → seconda pagina.
    const result = paginate(doc, nested, new LeafCountMeasurer(80));

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]!.nodes).toHaveLength(2);
    // il block interno è rimasto UNITO, non spezzato in due foglie
    expect(result.pages[0]!.nodes[1]!.kind).toBe('block');
    expect(result.pages[1]!.nodes).toHaveLength(1);
  });

  it('accounts for margins in the usable area', () => {
    const noMargin: PrintDocument = {
      ...doc,
      page: { size: 'A4', orientation: 'portrait' },
    };
    const withMargin: PrintDocument = {
      ...doc,
      page: { size: 'A4', orientation: 'portrait', margin: '20mm' },
    };

    // 2 foglie × 140mm = 280mm
    // senza margine: 297mm utili → ci sta tutto in una pagina
    // con margine 20mm: 257mm utili → serve scendere e spezzare
    const a = paginate(noMargin, tree('x', 'y'), new LeafCountMeasurer(140));
    const b = paginate(withMargin, tree('x', 'y'), new LeafCountMeasurer(140));

    expect(a.pages).toHaveLength(1);
    expect(b.pages).toHaveLength(2);
  });

  it('respects landscape orientation', () => {
    const landscape: PrintDocument = {
      ...doc,
      page: { size: 'A4', orientation: 'landscape', margin: '15mm' },
    };
    // landscape: 297×210 → utile 267×180
    // 2 foglie × 100mm = 200mm > 180 → due pagine
    const result = paginate(landscape, tree('x', 'y'), new LeafCountMeasurer(100));

    expect(result.pages).toHaveLength(2);
  });
});
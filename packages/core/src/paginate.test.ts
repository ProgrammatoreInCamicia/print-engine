import { describe, it, expect } from 'vitest';
import { paginate } from './paginate.js';
import { StubMeasurer } from './measure.js';
import type { ResolvedNode } from './resolved.js';
import type { PrintDocument } from '@print-engine/schema';

// A4 portrait con margine 15mm → area utile 180 × 267 mm
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

describe('paginate', () => {
  it('puts everything on one page when it fits', () => {
    // 3 nodi × 50mm = 150mm, ci stanno in 267mm
    const result = paginate(doc, tree('a', 'b', 'c'), new StubMeasurer(50));

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]!.nodes).toHaveLength(3);
    expect(result.pages[0]!.pageNumber).toBe(1);
  });

  it('splits across pages when content overflows', () => {
    // 100mm per nodo → 2 nodi per pagina (200 ok, 300 no)
    // 5 nodi → pagine da 2, 2, 1
    const result = paginate(
      doc,
      tree('a', 'b', 'c', 'd', 'e'),
      new StubMeasurer(100),
    );

    expect(result.pages).toHaveLength(3);
    expect(result.pages.map((p) => p.nodes.length)).toEqual([2, 2, 1]);
  });

  it('numbers pages sequentially', () => {
    const result = paginate(
      doc,
      tree('a', 'b', 'c', 'd', 'e'),
      new StubMeasurer(100),
    );

    expect(result.pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
  });

  it('keeps node order across pages', () => {
    const result = paginate(
      doc,
      tree('a', 'b', 'c', 'd', 'e'),
      new StubMeasurer(100),
    );

    const values = result.pages.flatMap((p) =>
      p.nodes.map((n) => (n as { value: string }).value),
    );
    expect(values).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('returns a single empty page for empty content', () => {
    const result = paginate(doc, tree(), new StubMeasurer(50));

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]!.nodes).toEqual([]);
  });

  it('places an oversized node on its own page without looping', () => {
    // nodo da 400mm su pagina da 267mm: non ci sta mai,
    // ma deve finire comunque su una pagina
    const result = paginate(
      doc,
      tree('big', 'after'),
      new StubMeasurer(400),
    );

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]!.nodes).toHaveLength(1);
    expect(result.pages[1]!.nodes).toHaveLength(1);
  });

  it('flattens nested blocks before paginating', () => {
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

    const result = paginate(doc, nested, new StubMeasurer(50));

    // 4 foglie in totale, 50mm ciascuna → tutte in una pagina
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]!.nodes).toHaveLength(4);
  });

  it('accounts for margins in the usable area', () => {
    // senza margine: 297mm utili → 2 nodi da 140mm ci stanno (280)
    const noMargin: PrintDocument = {
      ...doc,
      page: { size: 'A4', orientation: 'portrait' },
    };
    const withMargin: PrintDocument = {
      ...doc,
      page: { size: 'A4', orientation: 'portrait', margin: '20mm' },
    };

    const a = paginate(noMargin, tree('x', 'y'), new StubMeasurer(140));
    const b = paginate(withMargin, tree('x', 'y'), new StubMeasurer(140));

    expect(a.pages).toHaveLength(1);   // 280 <= 297
    expect(b.pages).toHaveLength(2);   // 280 > 257
  });

  it('respects landscape orientation', () => {
    const landscape: PrintDocument = {
      ...doc,
      page: { size: 'A4', orientation: 'landscape', margin: '15mm' },
    };
    // landscape: 297×210 → utile 267×180
    // 2 nodi da 100mm = 200 > 180 → due pagine
    const result = paginate(landscape, tree('x', 'y'), new StubMeasurer(100));

    expect(result.pages).toHaveLength(2);
  });
});
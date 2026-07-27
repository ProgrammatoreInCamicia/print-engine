import { describe, it, expect } from 'vitest';
import { Page, paginate, parseHorizontalPadding } from './paginate.js';
import { LeafCountMeasurer } from './measure.js';
import type { ResolvedDocument, ResolvedNode } from './resolved.js';
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

function tree(...values: string[]): ResolvedDocument {
  return {
    body: {
      kind: 'block',
      direction: 'column',
      children: values.map(textNode),
    }
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
    const nested: ResolvedDocument = {
      body: {
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
      }
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

// Prende solo i wrapper di colonna diretti (i figli del block 'row' sintetico
// prodotto da handleColumns), non l'intero sottoalbero — evita di raccogliere
// anche il contenuto originale annidato più in profondità.
function columnWrapperWidths(page: Page): string[] {
  const rowNode = page.nodes[0];
  if (rowNode?.kind !== 'block') return [];
  return rowNode.children
    .filter((c): c is Extract<ResolvedNode, { kind: 'block' }> => c.kind === 'block')
    .map(c => c.style?.width ?? '');
}

describe('parseHorizontalPadding', () => {
  it('handles 1 value (all sides)', () => {
    expect(parseHorizontalPadding('5mm')).toBe(10); // 5 left + 5 right
  });
  it('handles 2 values (vertical | horizontal)', () => {
    expect(parseHorizontalPadding('2mm 5mm')).toBe(10);
  });
  it('handles 3 values (top | horizontal | bottom)', () => {
    expect(parseHorizontalPadding('1mm 5mm 1mm')).toBe(10);
  });
  it('handles 4 values (top | right | bottom | left)', () => {
    expect(parseHorizontalPadding('1mm 3mm 1mm 7mm')).toBe(10);
  });
  it('returns 0 for malformed input', () => {
    expect(parseHorizontalPadding('')).toBe(0);
  });
});

describe('paginate columns — width calculation', () => {
  it('splits width evenly with no fixed columns or padding', () => {
    const columnsNode: ResolvedNode = {
      kind: 'columns',
      children: [
        { kind: 'block', direction: 'column', children: [{ kind: 'text', value: 'a' }] },
        { kind: 'block', direction: 'column', children: [{ kind: 'text', value: 'b' }] },
      ],
    };
    const resolved: ResolvedDocument = { body: columnsNode };
    const result = paginate(doc, resolved, new LeafCountMeasurer(10));

    // area utile 180mm, 2 colonne flessibili senza gap → 90mm ciascuna
    expect(columnWrapperWidths(result.pages[0]!)).toEqual(['90mm', '90mm']);
  });

  it('honors explicit width on one column and gives the rest to the flexible one', () => {
    const columnsNode: ResolvedNode = {
      kind: 'columns',
      children: [
        { kind: 'block', direction: 'column', style: { width: '24mm' }, children: [{ kind: 'text', value: 'badge' }] },
        { kind: 'block', direction: 'column', children: [{ kind: 'text', value: 'table' }] },
      ],
    };
    const resolved: ResolvedDocument = { body: columnsNode };
    const result = paginate(doc, resolved, new LeafCountMeasurer(10));

    // 180mm totali: 24mm fissi + 156mm alla colonna flessibile
    expect(columnWrapperWidths(result.pages[0]!)).toEqual(['24mm', '156mm']);
  });

  it('subtracts gap between columns before dividing', () => {
    const columnsNode: ResolvedNode = {
      kind: 'columns',
      style: { gap: '4mm' },
      children: [
        { kind: 'block', direction: 'column', children: [{ kind: 'text', value: 'a' }] },
        { kind: 'block', direction: 'column', children: [{ kind: 'text', value: 'b' }] },
      ],
    };
    const resolved: ResolvedDocument = { body: columnsNode };
    const result = paginate(doc, resolved, new LeafCountMeasurer(10));

    // 180mm - 4mm gap = 176mm / 2 = 88mm ciascuna
    expect(columnWrapperWidths(result.pages[0]!)).toEqual(['88mm', '88mm']);
  });

  it('subtracts container horizontal padding before dividing', () => {
    const columnsNode: ResolvedNode = {
      kind: 'columns',
      style: { padding: '0 3mm 0 3mm' },
      children: [
        { kind: 'block', direction: 'column', children: [{ kind: 'text', value: 'a' }] },
        { kind: 'block', direction: 'column', children: [{ kind: 'text', value: 'b' }] },
      ],
    };
    const resolved: ResolvedDocument = { body: columnsNode };
    const result = paginate(doc, resolved, new LeafCountMeasurer(10));

    // 180mm - 6mm padding totale = 174mm / 2 = 87mm ciascuna
    expect(columnWrapperWidths(result.pages[0]!)).toEqual(['87mm', '87mm']);
  });

  it('nested columns: widths sum back to the parent column width', () => {
    // Riproduce il caso reale lineColumn: columns esterno (2 linee)
    // contenente, in ciascuna colonna, un altro columns (badge + tabella).
    const innerColumns = (): ResolvedNode => ({
      kind: 'columns',
      children: [
        { kind: 'block', direction: 'column', style: { width: '24mm' }, children: [{ kind: 'text', value: 'badge' }] },
        { kind: 'block', direction: 'column', children: [{ kind: 'text', value: 'table' }] },
      ],
    });
    const outerColumns: ResolvedNode = {
      kind: 'columns',
      children: [innerColumns(), innerColumns()],
    };
    const resolved: ResolvedDocument = { body: outerColumns };
    const result = paginate(doc, resolved, new LeafCountMeasurer(10));

    // livello esterno: due wrapper da 90mm ciascuno (180mm / 2)
    const outerWidths = columnWrapperWidths(result.pages[0]!);
    expect(outerWidths).toEqual(['90mm', '90mm']);

    // livello interno: dentro il primo wrapper esterno (90mm), il columns
    // interno è stato trasformato a sua volta in un block 'row' sintetico
    // con i suoi due wrapper (24mm badge + 66mm tabella).
    const outerRow = result.pages[0]!.nodes[0];
    const firstOuterColumn = outerRow?.kind === 'block' ? outerRow.children[0] : undefined;
    const innerRow = firstOuterColumn?.kind === 'block' ? firstOuterColumn.children[0] : undefined;
    const innerWidths =
      innerRow?.kind === 'block'
        ? innerRow.children
            .filter((c): c is Extract<ResolvedNode, { kind: 'block' }> => c.kind === 'block')
            .map(c => c.style?.width ?? '')
        : [];

    expect(innerWidths).toEqual(['24mm', '66mm']);
  });
});
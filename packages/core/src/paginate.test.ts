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
      mode: 'independent',
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
      mode: 'independent',
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
      mode: 'independent',
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
      mode: 'independent',
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
      mode: 'independent',
      children: [
        { kind: 'block', direction: 'column', style: { width: '24mm' }, children: [{ kind: 'text', value: 'badge' }] },
        { kind: 'block', direction: 'column', children: [{ kind: 'text', value: 'table' }] },
      ],
    });
    const outerColumns: ResolvedNode = {
      kind: 'columns',
      mode: 'independent',
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

function newspaperColumns(count: number, ...values: string[]): ResolvedNode {
  return {
    kind: 'columns',
    mode: 'newspaper',
    count,
    children: values.map(textNode),
  };
}

// Estrae, per la prima (e unica) riga di colonne di una pagina, quanti nodi
// contiene ciascuna colonna — utile per leggere il risultato senza scavare
// a mano nell'albero ad ogni assert.
function columnNodeCounts(page: Page): number[] {
  const row = page.nodes[0];
  if (row?.kind !== 'block') return [];
  return row.children.map(col => (col.kind === 'block' ? col.children.length : 0));
}

function columnValues(page: Page): string[][] {
  const row = page.nodes[0];
  if (row?.kind !== 'block') return [];
  return row.children.map(col =>
    col.kind === 'block'
      ? col.children.map(n => (n.kind === 'text' ? n.value : '?'))
      : [],
  );
}

describe('paginate — newspaper columns', () => {
  it('keeps everything in the first column when it all fits', () => {
    // 3 foglie x 50mm = 150mm, area utile 267mm, 2 colonne
    const result = paginate(
      doc,
      { body: newspaperColumns(2, 'a', 'b', 'c') } as unknown as ResolvedDocument,
      new LeafCountMeasurer(50),
    );

    expect(result.pages).toHaveLength(1);
    expect(columnNodeCounts(result.pages[0]!)).toEqual([3, 0]);
    expect(columnValues(result.pages[0]!)[0]).toEqual(['a', 'b', 'c']);
  });

  it('snakes into the second column when the first is full', () => {
    const result = paginate(
      doc,
      { body: newspaperColumns(2, 'a', 'b', 'c', 'd', 'e') } as unknown as ResolvedDocument,
      new LeafCountMeasurer(100),
    );

    expect(result.pages).toHaveLength(2);
    expect(columnNodeCounts(result.pages[0]!)).toEqual([2, 2]);
    expect(columnValues(result.pages[0]!)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(columnNodeCounts(result.pages[1]!)).toEqual([1, 0]);
    expect(columnValues(result.pages[1]!)).toEqual([['e'], []]);
  });

  it('opens a new page once all columns on the current page are full', () => {
    
    // area utile 267mm / 70mm => 3 foglie per colonna (210mm), 6 per pagina.
    // Rifacciamo il conto con 5 foglie: tutte in pagina 1, non testa il multi-pagina.
    // Usiamo invece 8 foglie per forzare la seconda pagina.
    const result2 = paginate(
      doc,
      { body: newspaperColumns(2, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h') } as unknown as ResolvedDocument,
      new LeafCountMeasurer(70),
    );

    // per colonna: floor(267/70) = 3 foglie (210mm), 4a foglia (280mm) non ci sta
    // -> 3 per colonna, 6 per pagina -> 8 foglie: pagina1 = 6, pagina2 = 2
    expect(result2.pages).toHaveLength(2);
    expect(columnNodeCounts(result2.pages[0]!)).toEqual([3, 3]);
    expect(columnNodeCounts(result2.pages[1]!)).toEqual([2, 0]);
  });

  it('places an oversized leaf on its own column without looping', () => {
    // ogni foglia è 400mm > 267mm: nessuna colonna la contiene mai per intero,
    // ma deve finire piazzata comunque, senza ciclare.
    const result = paginate(
      doc,
      { body: newspaperColumns(2, 'big1', 'big2', 'big3') } as unknown as ResolvedDocument,
      new LeafCountMeasurer(400),
    );

    // ogni foglia oversize apre la sua colonna/pagina:
    // big1 -> col0 pag1 (fondo, colonna vuota)
    // big2 -> non ci sta in col0 (già occupata) -> advance -> col1 pag1 (fondo)
    // big3 -> non ci sta in col1 (già occupata), niente altra colonna -> freeze -> pag2 col0 (fondo)
    expect(result.pages).toHaveLength(2);
    expect(columnNodeCounts(result.pages[0]!)).toEqual([1, 1]);
    expect(columnNodeCounts(result.pages[1]!)).toEqual([1, 0]);
  });

  it('flushes the last partially-filled page (tail content is not lost)', () => {
    // 3 foglie, 2 colonne, ognuna ci sta da sola ma non tutte e tre in una riga:
    // con foglie piccole (50mm) tutto ci sta in colonna 0 di una pagina sola
    // -> verifica esplicita che il contenuto finale non sparisca.
    const result = paginate(
      doc,
      { body: newspaperColumns(3, 'only-one') } as unknown as ResolvedDocument,
      new LeafCountMeasurer(50),
    );

    expect(result.pages).toHaveLength(1);
    expect(columnNodeCounts(result.pages[0]!)).toEqual([1, 0, 0]);
  });
});

function textCell(value: string): ResolvedNode {
  return { kind: 'text', value };
}

function makePivot(
  rowCount: number,
  colCount: number,
  rowHeaderWidth: string,
  columnWidth: string,
): Extract<ResolvedNode, { kind: 'pivot' }> {
  return {
    kind: 'pivot',
    rowHeaderWidth,
    columnWidth,
    headers: [
      {
        corner: textCell('corner'),
        cells: Array.from({ length: colCount }, (_, j) => textCell(`H${j}`)),
      },
    ],
    rows: Array.from({ length: rowCount }, (_, i) => ({
      header: textCell(`R${i}`),
      cells: Array.from({ length: colCount }, (_, j) => textCell(`${i}-${j}`)),
    })),
  };
}

// Estrae, da una pagina prodotta dalla paginazione di un pivot, il testo di
// tutte le foglie in ordine — utile per verificare quali righe/colonne sono
// finite in quella pagina senza scavare a mano nell'albero sintetico.
function leafValues(nodes: ResolvedNode[]): string[] {
  return nodes.flatMap(n => {
    if (n.kind === 'text') return [n.value];
    if (n.kind === 'block') return leafValues(n.children);
    return [];
  });
}

describe('paginate — pivot', () => {
  it('fits everything on one page when columns and rows are few', () => {
    const pivot = makePivot(2, 2, '20mm', '20mm');
    const doc: PrintDocument = {
      schemaVersion: 1,
      page: { size: 'A4', orientation: 'portrait', margin: '15mm' },
      body: { type: 'text', value: 'x' },
    };
    const resolved: ResolvedDocument = { body: pivot };

    const result = paginate(doc, resolved, new LeafCountMeasurer(10));

    expect(result.pages).toHaveLength(1);
    const values = leafValues(result.pages[0]!.nodes);
    // header corner + 2 header cells + 2 righe × (row header + 2 celle dati)
    expect(values).toEqual(['corner', 'H0', 'H1', 'R0', '0-0', '0-1', 'R1', '1-0', '1-1']);
  });

  it('splits into horizontal chunks when there are too many columns for the page width', () => {
    // area utile: 180mm. rowHeaderWidth 20mm, columnWidth 40mm →
    // colsPerPage = floor((180-20)/40) = 4
    const pivot = makePivot(1, 6, '20mm', '40mm');
    const doc: PrintDocument = {
      schemaVersion: 1,
      page: { size: 'A4', orientation: 'portrait', margin: '15mm' },
      body: { type: 'text', value: 'x' },
    };
    const resolved: ResolvedDocument = { body: pivot };

    const result = paginate(doc, resolved, new LeafCountMeasurer(10));

    // 6 colonne, 4 per pagina → 2 chunk → (con 1 sola riga, ogni chunk sta
    // sicuramente in una pagina verticale) → 2 pagine totali
    expect(result.pages).toHaveLength(2);

    const page1 = leafValues(result.pages[0]!.nodes);
    const page2 = leafValues(result.pages[1]!.nodes);

    // chunk 0: colonne 0-3
    expect(page1).toEqual(['corner', 'H0', 'H1', 'H2', 'H3', 'R0', '0-0', '0-1', '0-2', '0-3']);
    // chunk 1: colonne 4-5 (ultimo chunk, sbilanciato: solo 2 colonne)
    expect(page2).toEqual(['corner', 'H4', 'H5', 'R0', '0-4', '0-5']);
  });

  it('splits vertically within a chunk when rows overflow the page height, repeating the header', () => {
    // area utile 267mm, ogni foglia 'alta' 10 (LeafCountMeasurer conta le foglie).
    // Una riga = header + 2 celle = 3 foglie = 30 unità. L'header del chunk
    // (corner + 2 celle header) = 3 foglie = 30 unità.
    // Con altezza disponibile 267 e 20 righe da 30 ciascuna, non tutte
    // ci stanno in una pagina: verifichiamo che si spezzi E che l'header
    // ricompaia in cima alla seconda pagina del chunk.
    const pivot = makePivot(20, 2, '20mm', '20mm');
    const doc: PrintDocument = {
      schemaVersion: 1,
      page: { size: 'A4', orientation: 'portrait', margin: '15mm' },
      body: { type: 'text', value: 'x' },
    };
    const resolved: ResolvedDocument = { body: pivot };

    const result = paginate(doc, resolved, new LeafCountMeasurer(10));

    expect(result.pages.length).toBeGreaterThan(1);

    // Ogni pagina del chunk deve iniziare con l'header ripetuto ('corner').
    result.pages.forEach(page => {
      const values = leafValues(page.nodes);
      expect(values[0]).toBe('corner');
    });

    // Nessuna riga persa: raccogliendo tutte le celle 'i-0' su tutte le
    // pagine, devono esserci tutte le 20 righe, in ordine, senza duplicati.
    const allValues = result.pages.flatMap(p => leafValues(p.nodes));
    const rowMarkers = allValues.filter(v => /^\d+-0$/.test(v));
    expect(rowMarkers).toEqual(Array.from({ length: 20 }, (_, i) => `${i}-0`));
  });

  it('places an oversized single column without looping', () => {
    // columnWidth più larga dell'intera area utile: colsPerPage deve
    // comunque valere 1 (mai 0), altrimenti loop infinito nel calcolo dei chunk.
    const pivot = makePivot(1, 3, '20mm', '500mm');
    const doc: PrintDocument = {
      schemaVersion: 1,
      page: { size: 'A4', orientation: 'portrait', margin: '15mm' },
      body: { type: 'text', value: 'x' },
    };
    const resolved: ResolvedDocument = { body: pivot };

    const result = paginate(doc, resolved, new LeafCountMeasurer(10));

    // 3 colonne, 1 per chunk (larghezza obbliga colsPerPage=1) → 3 chunk,
    // ognuno con 1 sola riga → 3 pagine.
    expect(result.pages).toHaveLength(3);
  });
});
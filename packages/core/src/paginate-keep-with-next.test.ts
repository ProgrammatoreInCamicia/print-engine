import { describe, it, expect } from 'vitest';
import { paginate } from './paginate.js';
import type { Measurer } from './measure.js';
import type { ResolvedDocument, ResolvedNode } from './resolved.js';
import type { PrintDocument } from '@print-engine/schema';

const doc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4', orientation: 'portrait', margin: '15mm' },
    body: { type: 'text', value: 'x' },
};
// area utile: 297 - 30 = 267mm di altezza

// Measurer che assegna un'altezza in base a una mappa per-valore.
// Per i block, somma le altezze delle foglie contenute.
class MapMeasurer implements Measurer {
    constructor(private heights: Record<string, number>) {}

    measure(node: ResolvedNode, _w: number): number {
        if (node.kind === 'block') {
            return node.children.reduce((s, c) => s + this.measure(c, _w), 0);
        }
        if (node.kind === 'text') {
            return this.heights[node.value] ?? 0;
        }
        return 0;
    }
}

describe('paginate keepWithNext', () => {
    // Struttura comune: due filler, poi header (block) + row.
    // filler totali = 200mm → restano 67mm.
    // header alto 50mm → da solo ci starebbe (50 ≤ 67).
    // row alto 50mm → header+row = 100mm > 67mm.
    function makeTree(keepWithNext: boolean): ResolvedDocument {
        return {
            body: {
                kind: 'block',
                direction: 'column',
                children: [
                    { kind: 'text', value: 'filler1' },
                    { kind: 'text', value: 'filler2' },
                    {
                        kind: 'block',
                        direction: 'column',
                        keepWithNext,
                        children: [{ kind: 'text', value: 'header' }],
                    },
                    { kind: 'text', value: 'row' },
                ],
            }
        };
    }

    const heights = { filler1: 100, filler2: 100, header: 50, row: 50 };

    it('without keepWithNext, header and row get separated', () => {
        const result = paginate(doc, makeTree(false), new MapMeasurer(heights));

        // pagina 1: filler1, filler2, header (200+50=250 ≤ 267)
        // pagina 2: row (non ci stava: 250+50=300 > 267)
        const values = result.pages.map((p) =>
        collectText(p.nodes),
        );
        expect(result.pages).toHaveLength(2);
        expect(values[0]).toContain('header');
        expect(values[1]).toContain('row');
        // header e row su pagine DIVERSE → orfano
        expect(values[0]).not.toContain('row');
    });

    it('with keepWithNext, header moves to stay with row', () => {
        const result = paginate(doc, makeTree(true), new MapMeasurer(heights));

        // header ha keepWithNext: header+row = 100mm, ma restano 67mm
        // → header va a pagina nuova PRIMA di essere piazzato
        // pagina 1: filler1, filler2
        // pagina 2: header, row (insieme!)
        const values = result.pages.map((p) => collectText(p.nodes));
        expect(values[0]).not.toContain('header');
        const headerPage = values.findIndex((v) => v.includes('header'));
        const rowPage = values.findIndex((v) => v.includes('row'));
        expect(headerPage).toBe(rowPage); // stessa pagina
    });
});

// Raccoglie tutti i value dei text, scendendo nei block.
function collectText(nodes: ResolvedNode[]): string[] {
    return nodes.flatMap((n) =>
        n.kind === 'block'
        ? collectText(n.children)
        : n.kind === 'text'
            ? [n.value]
            : [],
    );
}
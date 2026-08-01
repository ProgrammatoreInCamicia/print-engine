import { describe, it, expect, vi, afterEach } from 'vitest';
import { DomMeasurer } from './dom-measurer.js';
import type { ResolvedNode } from '@print-engine/core';

const text = (value: string): ResolvedNode => ({ kind: 'text', value });

// jsdom non fa layout: getBoundingClientRect restituisce sempre 0. Lo stubbiamo
// per poter verificare la conversione px -> mm, che è la parte di logica vera.
function stubHeight(px: number) {
    return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        height: px, width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0,
        toJSON: () => ({}),
    } as DOMRect);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('DomMeasurer', () => {
    it('converts the measured height from px to mm', () => {
        stubHeight(37.795); // 1mm ~ 3.7795px -> 10mm
        expect(new DomMeasurer().measure(text('x'), 100)).toBeCloseTo(10, 2);
    });

    it('reports zero for an empty measurement', () => {
        stubHeight(0);
        expect(new DomMeasurer().measure(text(''), 100)).toBe(0);
    });

    it('constrains the probe to the available width before measuring', () => {
        // La larghezza disponibile decide gli a-capo, quindi l'altezza: se non
        // venisse applicata, la misura sarebbe quella di una riga sola.
        stubHeight(0);
        const measurer = new DomMeasurer();
        measurer.measure(text('x'), 63.5);
        const probe = document.body.lastElementChild as HTMLElement;
        expect(probe.style.width).toBe('63.5mm');
    });

    it('empties the probe so measurements do not leak into each other', () => {
        stubHeight(0);
        const measurer = new DomMeasurer();
        measurer.measure(text('primo'), 100);
        const probe = document.body.lastElementChild as HTMLElement;
        expect(probe.innerHTML).toBe('');
    });

    it('keeps the probe out of the visible area', () => {
        stubHeight(0);
        new DomMeasurer();
        const probe = document.body.lastElementChild as HTMLElement;
        expect(probe.style.position).toBe('absolute');
        expect(probe.style.left).toBe('-99999px');
    });
});

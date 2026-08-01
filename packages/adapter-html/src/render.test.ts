import { describe, it, expect } from 'vitest';
import { renderNode } from './render.js';
import type { ResolvedNode } from '@print-engine/core';

// Ri-parsa l'HTML prodotto: asserire sul DOM è più robusto che confrontare
// stringhe, che dipendono dall'ordine con cui il browser serializza il css.
function parse(html: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    return wrapper.firstElementChild as HTMLElement;
}

const text = (value: string): ResolvedNode => ({ kind: 'text', value });

describe('renderNode', () => {
    it('renders a text node as a div', () => {
        const el = parse(renderNode(text('Ciao')));
        expect(el.tagName).toBe('DIV');
        expect(el.textContent).toBe('Ciao');
    });

    it('renders an inline text node as a span', () => {
        const el = parse(renderNode({ kind: 'text', value: 'Ciao', inline: true }));
        expect(el.tagName).toBe('SPAN');
    });

    it('escapes text instead of injecting it as markup', () => {
        const el = parse(renderNode(text('<b>grassetto</b>')));
        expect(el.textContent).toBe('<b>grassetto</b>');
        expect(el.querySelector('b')).toBeNull();
    });

    it('renders a block as a flex container in the requested direction', () => {
        const el = parse(renderNode({
            kind: 'block',
            direction: 'row',
            children: [text('a'), text('b')],
        }));
        expect(el.style.display).toBe('flex');
        expect(el.style.flexDirection).toBe('row');
        expect(el.children).toHaveLength(2);
        expect(el.textContent).toBe('ab');
    });

    it('applies the node style to the rendered element', () => {
        const el = parse(renderNode({ kind: 'text', value: 'x', style: { width: '20mm', align: 'center' } }));
        expect(el.style.width).toBe('20mm');
        expect(el.style.textAlign).toBe('center');
    });

    it('renders an image with its source and size', () => {
        const el = parse(renderNode({ kind: 'image', src: 'logo.png', width: '4mm', height: '6mm' }));
        expect(el.tagName).toBe('IMG');
        expect(el.getAttribute('src')).toBe('logo.png');
        expect(el.style.width).toBe('4mm');
        expect(el.style.height).toBe('6mm');
    });

    it('renders canvas children as absolutely positioned boxes', () => {
        const el = parse(renderNode({
            kind: 'canvas',
            height: '50mm',
            children: [{ x: '10mm', y: '20mm', node: text('posizionato') }],
        }));
        expect(el.style.position).toBe('relative');
        expect(el.style.height).toBe('50mm');

        const child = el.firstElementChild as HTMLElement;
        expect(child.style.position).toBe('absolute');
        expect(child.style.left).toBe('10mm');
        expect(child.style.top).toBe('20mm');
    });

    // I due rami difensivi: paginate() sostituisce 'columns' e 'pivot' con
    // block ordinari prima del render, ma se un nodo arrivasse qui non deve
    // sparire in silenzio.
    it('falls back to a row of children for a columns node', () => {
        const el = parse(renderNode({
            kind: 'columns',
            mode: 'independent',
            children: [text('sinistra'), text('destra')],
        }));
        expect(el.style.flexDirection).toBe('row');
        expect(el.textContent).toBe('sinistradestra');
    });

    it('falls back to drawing the whole grid for a pivot node', () => {
        const el = parse(renderNode({
            kind: 'pivot',
            rowHeaderWidth: '20mm',
            columnWidth: '15mm',
            headers: [{ corner: text('angolo'), cells: [text('H0')] }],
            rows: [{ header: text('R0'), cells: [text('0-0')] }],
        }));
        // niente rendering vuoto: header band + riga dati devono comparire
        expect(el.textContent).toContain('angolo');
        expect(el.textContent).toContain('H0');
        expect(el.textContent).toContain('R0');
        expect(el.textContent).toContain('0-0');
    });

    it('uses an empty corner when the header band declares none', () => {
        const el = parse(renderNode({
            kind: 'pivot',
            rowHeaderWidth: '20mm',
            columnWidth: '15mm',
            headers: [{ cells: [text('H0')] }],
            rows: [],
        }));
        expect(el.textContent).toBe('H0');
    });
});

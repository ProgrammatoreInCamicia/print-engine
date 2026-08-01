import { describe, it, expect } from 'vitest';
import { renderPages } from './render-pages.js';
import type { PaginatedDocument, ResolvedNode } from '@print-engine/core';
import type { PageSetup } from '@print-engine/schema';

const text = (value: string): ResolvedNode => ({ kind: 'text', value });

const a4: PageSetup = { size: 'A4', orientation: 'portrait', margin: '15mm' };

// Ogni pagina è un elemento di primo livello della stringa prodotta.
function pagesOf(html: string): HTMLElement[] {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    return Array.from(wrapper.children) as HTMLElement[];
}

function doc(pageCount: number, extra: Partial<PaginatedDocument> = {}): PaginatedDocument {
    return {
        pages: Array.from({ length: pageCount }, (_, i) => ({
            pageNumber: i + 1,
            nodes: [text(`contenuto ${i}`)],
        })),
        ...extra,
    };
}

describe('renderPages', () => {
    it('emits one sheet per page, at the page size', () => {
        const pages = pagesOf(renderPages(doc(3), a4));
        expect(pages).toHaveLength(3);
        pages.forEach(page => {
            expect(page.style.width).toBe('210mm');
            expect(page.style.height).toBe('297mm');
        });
    });

    it('swaps width and height in landscape', () => {
        const [page] = pagesOf(renderPages(doc(1), { size: 'A4', orientation: 'landscape' }));
        expect(page!.style.width).toBe('297mm');
        expect(page!.style.height).toBe('210mm');
    });

    it('applies the page margin as padding, with border-box sizing', () => {
        // border-box è ciò che tiene il foglio esattamente della dimensione
        // dichiarata anche con il margine applicato come padding.
        const [page] = pagesOf(renderPages(doc(1), a4));
        expect(page!.style.padding).toBe('15mm');
        expect(page!.style.boxSizing).toBe('border-box');
    });

    it('repeats header and footer on every page', () => {
        const html = renderPages(doc(3, { header: text('INTESTAZIONE'), footer: text('PIE DI PAGINA') }), a4);
        const pages = pagesOf(html);
        expect(pages).toHaveLength(3);
        pages.forEach(page => {
            expect(page.textContent).toContain('INTESTAZIONE');
            expect(page.textContent).toContain('PIE DI PAGINA');
        });
    });

    it('keeps header, content and footer in that order', () => {
        const [page] = pagesOf(renderPages(doc(1, { header: text('TESTA'), footer: text('CODA') }), a4));
        const body = page!.textContent ?? '';
        expect(body.indexOf('TESTA')).toBeLessThan(body.indexOf('contenuto 0'));
        expect(body.indexOf('contenuto 0')).toBeLessThan(body.indexOf('CODA'));
    });

    it('renders the page content', () => {
        const [page] = pagesOf(renderPages(doc(1), a4));
        expect(page!.textContent).toContain('contenuto 0');
    });

    it('produces no sheets for an empty document', () => {
        expect(renderPages(doc(0), a4)).toBe('');
    });
});

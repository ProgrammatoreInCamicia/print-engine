import { describe, it, expect } from 'vitest';
import type { Style } from '@print-engine/schema';
import { styleToCss } from './style.js';

describe('styleToCss', () => {
    it('returns an empty string for an undefined style', () => {
        expect(styleToCss(undefined)).toBe('');
    });

    it('makes a declared width rigid', () => {
        // Regressione: senza flex-shrink:0 le celle a larghezza fissa si
        // restringono quando una cella flessibile accanto ha contenuto largo,
        // e le colonne risultano disallineate da una riga all'altra.
        const css = styleToCss({ width: '16mm' });
        expect(css).toContain('width: 16mm');
        expect(css).toContain('flex-shrink: 0');
    });

    it('leaves flex-shrink alone when no width is declared', () => {
        expect(styleToCss({ grow: 1 })).not.toContain('flex-shrink');
    });

    it('always pins min-width to 0', () => {
        // Regressione: senza min-width:0 gli item flex non scendono sotto la
        // min-content del contenuto e le columns annidate escono dalla pagina.
        expect(styleToCss({ grow: 1 })).toContain('min-width: 0');
    });

    it('maps the style model onto the corresponding css properties', () => {
        // Required<Style> is the guard: adding a property to the style model
        // breaks the compilation of this test until it is mapped and asserted.
        const everything: Required<Style> = {
            font: 'Arial',
            size: '8pt',
            weight: 700,
            color: 'black',
            background: 'silver',
            align: 'center',
            padding: '1px 2px',
            border: '1px solid black',
            borderTop: '2px solid black',
            borderBottom: '3px solid navy',
            borderRight: '4px solid teal',
            borderLeft: '5px solid olive',
            gap: '2mm',
            width: '16mm',
            grow: 1,
            borderRadius: '50%',
        };

        const css = styleToCss(everything);

        expect(css).toContain('font-family: Arial');
        expect(css).toContain('font-size: 8pt');
        expect(css).toContain('font-weight: 700');
        expect(css).toContain('color: black');
        expect(css).toContain('background: silver');
        expect(css).toContain('text-align: center');
        expect(css).toContain('padding: 1px 2px');
        expect(css).toContain('gap: 2mm');
        expect(css).toContain('width: 16mm');
        expect(css).toContain('flex-grow: 1');
        expect(css).toContain('border-radius: 50%');
        // The border family is asserted below: once the shorthand and the four
        // sides live in the same declaration the serializer collapses them into
        // border-width/style/color, which says nothing about the mapping.
    });

    it('applies the border shorthand', () => {
        expect(styleToCss({ border: '1px solid black' })).toContain('border: 1px solid black');
    });

    it('keeps the border shorthand when no side overrides it', () => {
        // Regression: the four sides used to be assigned '' unconditionally, and
        // assigning '' to a longhand removes it -- which wiped out the shorthand
        // that had just been expanded into those very longhands.
        const css = styleToCss({ border: '1px solid navy', padding: '2px' });
        expect(css).toContain('border: 1px solid navy');
    });

    it('maps each border side', () => {
        expect(styleToCss({ borderTop: '2px solid black' })).toContain('border-top: 2px solid black');
        expect(styleToCss({ borderBottom: '3px solid navy' })).toContain('border-bottom: 3px solid navy');
        expect(styleToCss({ borderRight: '4px solid teal' })).toContain('border-right: 4px solid teal');
        expect(styleToCss({ borderLeft: '5px solid olive' })).toContain('border-left: 5px solid olive');
    });

    it('lets a single side override the shorthand', () => {
        // Re-parsed instead of string-matched: with a shorthand and one side in
        // the same declaration the serializer collapses them into
        // border-width/style/color, so the text says little. See render.test.ts.
        const el = document.createElement('div');
        el.style.cssText = styleToCss({ border: '1px solid black', borderBottom: '3px solid navy' });

        expect(el.style.borderBottomWidth).toBe('3px');
        expect(el.style.borderBottomColor).toBe('navy');
        expect(el.style.borderTopWidth).toBe('1px');
        expect(el.style.borderTopColor).toBe('black');
    });
});

import { describe, it, expect } from 'vitest';
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
        const css = styleToCss({
            align: 'center',
            weight: 700,
            size: '8pt',
            gap: '2mm',
            borderRadius: '50%',
            padding: '1px 2px',
        });
        expect(css).toContain('text-align: center');
        expect(css).toContain('font-weight: 700');
        expect(css).toContain('font-size: 8pt');
        expect(css).toContain('gap: 2mm');
        expect(css).toContain('border-radius: 50%');
        expect(css).toContain('padding: 1px 2px');
    });
});

import { describe, it, expect } from 'vitest';
import { tokenize } from './ts-engine.js';

describe('tokenize', () => {
    it('tokenize an integer number', () => {
        const toks = tokenize('42');
        expect(toks).toEqual([
        { t: 'num', v: 42 },
        { t: 'eof' },
        ]);
    });

    it('tokenize a double number', () => {
        const toks = tokenize('12.5');
        expect(toks).toEqual([
            { t: 'num', v: 12.5 },
            { t: 'eof' },
        ]);
    });

    it('tokenize a symbol', () => {
        const toks = tokenize('(),[].');
        expect(toks).toEqual([
            { t: 'lparen' },
            { t: 'rparen' },
            { t: 'comma' },
            { t: 'lbrack' },
            { t: 'rbrack' },
            { t: 'dot' },
            { t: 'eof' },
        ]);
    });

    it('ignore spaces', () => {
        const toks = tokenize('  42   ');
        expect(toks).toEqual([
            { t: 'num', v: 42 },
            { t: 'eof' },
        ]);
    });

    it('tokenize root with child', () => {
        const toks = tokenize('$item.child');
        expect(toks).toEqual([
            { t: 'root', v: '$item' },
            { t: 'dot' },
            { t: 'ident', v: 'child' },
            { t: 'eof' },
        ]);
    });

    it('tokenize identifiers at alphabet edges', () => {
        expect(tokenize('azienda')).toEqual([{ t: 'ident', v: 'azienda' }, { t: 'eof' }]);
        expect(tokenize('zona')).toEqual([{ t: 'ident', v: 'zona' }, { t: 'eof' }]);
        expect(tokenize('Alfa')).toEqual([{ t: 'ident', v: 'Alfa' }, { t: 'eof' }]);
        expect(tokenize('Zeta')).toEqual([{ t: 'ident', v: 'Zeta' }, { t: 'eof' }]);
    });

    it('tokenize identifiers with digits and underscore', () => {
        expect(tokenize('item2')).toEqual([{ t: 'ident', v: 'item2' }, { t: 'eof' }]);
        expect(tokenize('campo_0')).toEqual([{ t: 'ident', v: 'campo_0' }, { t: 'eof' }]);
        expect(tokenize('_privato')).toEqual([{ t: 'ident', v: '_privato' }, { t: 'eof' }]);
    });

    it('tokenize bare root', () => {
        expect(tokenize('$')).toEqual([{ t: 'root', v: '$' }, { t: 'eof' }]);
        expect(tokenize('$.periodo')).toEqual([
            { t: 'root', v: '$' },
            { t: 'dot' },
            { t: 'ident', v: 'periodo' },
            { t: 'eof' },
        ]);
    });

    it('tokenize a full expression', () => {
        expect(tokenize('SUM($group.items.passeggeri)')).toEqual([
            { t: 'ident', v: 'SUM' },
            { t: 'lparen' },
            { t: 'root', v: '$group' },
            { t: 'dot' },
            { t: 'ident', v: 'items' },
            { t: 'dot' },
            { t: 'ident', v: 'passeggeri' },
            { t: 'rparen' },
            { t: 'eof' },
        ]);
    });

    it('tokenize array index', () => {
        expect(tokenize('$.corse[0].orario')).toEqual([
            { t: 'root', v: '$' },
            { t: 'dot' },
            { t: 'ident', v: 'corse' },
            { t: 'lbrack' },
            { t: 'num', v: 0 },
            { t: 'rbrack' },
            { t: 'dot' },
            { t: 'ident', v: 'orario' },
            { t: 'eof' },
        ]);
    });

    it('tokenize string with "', () => {
        expect(tokenize('"Hi "')).toEqual([
            { t: 'str', v: 'Hi ' },
            { t: 'eof' },
        ]);
    });

    it('tokenize string with \'', () => {
        expect(tokenize("'Hi '")).toEqual([
            { t: 'str', v: 'Hi ' },
            { t: 'eof' },
        ]);
    });

    it('tokenize string concat', () => {
        expect(tokenize("CONCAT('Hi ', 'Ste')")).toEqual([
            { t: 'ident', v: 'CONCAT' },
            { t: 'lparen' },
            { t: 'str', v: 'Hi ' },
            { t: 'comma' },
            { t: 'str', v: 'Ste' },
            { t: 'rparen' },
            { t: 'eof' },
        ]);
    });
});
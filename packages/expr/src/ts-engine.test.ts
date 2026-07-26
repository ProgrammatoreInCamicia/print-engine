import { describe, it, expect } from 'vitest';
import { parse, tokenize, TsExpressionEngine } from './ts-engine.js';

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

    it('parse letter', () => {
        const ast = parse("'T'");
        expect(ast).toEqual({k: 'lit', v: 'T'});
    });

    it('parse number', () => {
        const ast = parse("2");
        expect(ast).toEqual({k: 'lit', v: 2});
    });

    it('parse empty root', () => {
        const ast = parse("$");
        expect(ast).toEqual({k: 'root', name: "$"});
    });

    it('parse function call without args', () => {
        const ast = parse("SUM()");
        expect(ast).toEqual({k: 'call', name: "SUM", args: []});
    });

    it('parse function call with numbers as args', () => {
        const ast = parse("SUM(1, 2)");
        expect(ast).toEqual({k: 'call', name: "SUM", args: [
            {k: 'lit', v: 1},
            {k: 'lit', v: 2},
        ]});
    });

    it('parse function call with variables as args', () => {
        const ast = parse("SUM(a, b)");
        expect(ast).toEqual({k: 'call', name: "SUM", args: [
            {k: 'member', name: 'a', obj: {k: 'root', name: '$'}},
            {k: 'member', name: 'b', obj: {k: 'root', name: '$'}},
        ]});
    });

    it('parse function call with child root variable as arg', () => {
        const ast = parse("SUM($item.child)");
        expect(ast).toEqual({k: 'call', name: "SUM", args: [
            {k: 'member', name: 'child', obj: {k: 'root', name: '$item'}},
        ]});
    });

    it('parse deep member chain', () => {
        const ast = parse('$group.items.passeggeri');
        expect(ast).toEqual({
            k: 'member', name: 'passeggeri',
            obj: {
                k: 'member', name: 'items',
                obj: { k: 'root', name: '$group' }
            }
        });
    });

    it('parse array index', () => {
        const ast = parse('$.run[0]');
        expect(ast).toEqual({
            k: 'index',
            obj: { k: 'member', name: 'run', obj: { k: 'root', name: '$' } },
            index: { k: 'lit', v: 0 }
        });
    });

    it('parse property in array index', () => {
        const ast = parse('$.run[0].runCode');
        expect(ast).toEqual({
            k: 'member',
            name: 'runCode',
            obj: {
                k: 'index',
                obj: { k: 'member', name: 'run', obj: { k: 'root', name: '$' } },
                index: { k: 'lit', v: 0 }
            }
        });
    });

    it('rejects malformed expressions', () => {
        expect(() => parse('SUM(')).toThrow();
        expect(() => parse('$item.')).toThrow();
        expect(() => parse('42 43')).toThrow();
    });
});

/**
 * Regression: tokenize() does not handle unrecognized characters.
 *
 * In the tokenize() while loop, if the current character is not whitespace,
 * one of the handled symbols (. , ( ) [ ]), a digit, an identifier start,
 * '$' or a quote, then NO branch advances `i`: the loop spins forever on the
 * same character. Any operator ('+', '-', '%', ':', '@', ...) hangs the
 * tokenizer.
 *
 * It is a SYNCHRONOUS loop, so the try/catch in evaluate() does NOT catch it:
 * the thread stays blocked. The explicit per-test timeout below is what turns
 * the hang into a clean failure (with the 'forks' pool, the supervisor kills
 * the child process once the timeout elapses).
 *
 * With the bug present these tests TIME OUT (red).
 * After the fix they must return immediately: tokenize must fail in a
 * controlled way and evaluate must return { ok: false } (green).
 */
describe('tokenize — unrecognized characters must not hang', () => {
    it('evaluate returns ok:false on an unsupported operator instead of looping forever', () => {
        const r = new TsExpressionEngine().evaluate('$.a + $.b', { root: { a: 1, b: 2 } });
        expect(r.ok).toBe(false);
    }, 1000);

    it('tokenize terminates (does not loop) on an unrecognized character', () => {
        // It must not stay blocked: any controlled outcome is fine
        // (throwing or emitting a token), what matters is that it RETURNS.
        expect(() => tokenize('1 % 2')).toThrow();
    }, 1000);
});
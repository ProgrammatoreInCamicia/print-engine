import { describe, expect, it } from "vitest";
import { EvalContext, ExpressionEngine } from "./contract.js";
import { TsExpressionEngine } from "./ts-engine.js";

/**
 * Test about contract not for specific implementation
 */
const engines: ExpressionEngine[] = [new TsExpressionEngine()];

const ctx: EvalContext = {
    root: {
        period: 'Gennuary 2026',
        runs: [
            { line: 'C50', hour: '08:00', passengers: 12 },
            { line: 'C50', hour: '09:00', passengers: 8 },
            { line: 'C80', hour: '08:30', passengers: 20 },
        ],
    },
    item: { line: 'C50', hour: '08:00', passengers: 12 },
    group: { key: 'C50', items: [{ passengers: 12 }, { passengers: 8 }] },
    page: { current: 2, total: 5 },
}

engines.forEach(engine => {
    describe(`ExpressionEngine [${engine.kind}]`, () => {
        it('return sum', () => {
            const r = engine.evaluate('SUM($.runs.passengers)', ctx);
            expect(r).toEqual({ ok: true, value: 40 });
        });

        it('resolve simples path', () => {
            const r = engine.evaluate('$.period', ctx);
            expect(r).toEqual({ ok: true, value: 'Gennuary 2026' });
        });

        it('resolve inside path', () => {
            const r = engine.evaluate('$.runs[0].line', ctx);
            expect(r).toEqual({ ok: true, value: 'C50' });
        });

        it('resolve scopes', () => {
            expect(engine.evaluate('$item.hour', ctx)).toEqual({ ok: true, value: '08:00' });
            expect(engine.evaluate('$group.key', ctx)).toEqual({ ok: true, value: 'C50' });
            expect(engine.evaluate('$page.current', ctx)).toEqual({ ok: true, value: 2 });
        });

        it('resolve pluck', () => {
            expect(engine.evaluate('$.runs.passengers', ctx)).toEqual({ ok: true, value: [12, 8, 20] });
        });

        it('resolve aggregation SUM', () => {
            expect(engine.evaluate('SUM($group.items.passengers)', ctx)).toEqual({ ok: true, value: 20 });
        });

        it('resolve aggregation COUNT', () => {
            expect(engine.evaluate('COUNT($.runs)', ctx)).toEqual({ ok: true, value: 3 });
        });

        it('resolve aggregation MAX', () => {
            expect(engine.evaluate('MAX($.runs.passengers)', ctx)).toEqual({ ok: true, value: 20 });
        });

        it('resolve aggregation AVG', () => {
            expect(engine.evaluate('AVG($group.items.passengers)', ctx)).toEqual({ ok: true, value: 10 });
        });

        it('resolve aggregation SUM with multiple params', () => {
            expect(engine.evaluate('SUM($group.items.passengers, 2)', ctx)).toEqual({ ok: true, value: 22 });
        });

        it('resolve not existing path', () => {
            expect(engine.evaluate('$.notExist', ctx)).toEqual({ok: true, value: null})
            expect(engine.evaluate('$.a.b.c', ctx)).toEqual({ok: true, value: null})
        })

        it('cann\'t resolve unexpected function', () => {
            let r = engine.evaluate('SUM(', ctx);
            expect(r.ok).toBe(false);
            r = engine.evaluate('SUM(,$)', ctx);
            expect(r.ok).toBe(false);
        })
    });    
}); 

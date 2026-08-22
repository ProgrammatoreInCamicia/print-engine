import { describe, expect, it } from "vitest";
import { EvalContext, ExpressionEngine } from "./contract.js";
import { TsExpressionEngine } from "./ts-engine.js";

/**
 * Test about contract not for specific implementation
 */
const engines: ExpressionEngine[] = [new TsExpressionEngine()];

const ctx: EvalContext = {
    root: {
        period: 'January 2026',
        analyses: [
            { ward: 'Ematologia', time: '08:00', samples: 12 },
            { ward: 'Ematologia', time: '09:00', samples: 8 },
            { ward: 'Biochimica', time: '08:30', samples: 20 },
        ],
    },
    item: { ward: 'Ematologia', time: '08:00', samples: 12 },
    group: { key: 'Ematologia', items: [{ samples: 12 }, { samples: 8 }] },
    page: { current: 2, total: 5 },
    row: { name: 'Emocromo', id: 1 },
    column: { time: '08:00', id: 3 },
}

engines.forEach(engine => {
    describe(`ExpressionEngine [${engine.kind}]`, () => {
        it('return sum', () => {
            const r = engine.evaluate('SUM($.analyses.samples)', ctx);
            expect(r).toEqual({ ok: true, value: 40 });
        });

        it('resolve simples path', () => {
            const r = engine.evaluate('$.period', ctx);
            expect(r).toEqual({ ok: true, value: 'January 2026' });
        });

        it('resolve inside path', () => {
            const r = engine.evaluate('$.analyses[0].ward', ctx);
            expect(r).toEqual({ ok: true, value: 'Ematologia' });
        });

        it('resolve scopes', () => {
            expect(engine.evaluate('$item.time', ctx)).toEqual({ ok: true, value: '08:00' });
            expect(engine.evaluate('$group.key', ctx)).toEqual({ ok: true, value: 'Ematologia' });
            expect(engine.evaluate('$page.current', ctx)).toEqual({ ok: true, value: 2 });
            expect(engine.evaluate('$column.time', ctx)).toEqual({ ok: true, value: '08:00' });
            expect(engine.evaluate('$row.name', ctx)).toEqual({ ok: true, value: 'Emocromo' });
        });

        it('resolve pluck', () => {
            expect(engine.evaluate('$.analyses.samples', ctx)).toEqual({ ok: true, value: [12, 8, 20] });
        });

        it('resolve aggregation SUM', () => {
            expect(engine.evaluate('SUM($group.items.samples)', ctx)).toEqual({ ok: true, value: 20 });
        });

        it('resolve aggregation COUNT', () => {
            expect(engine.evaluate('COUNT($.analyses)', ctx)).toEqual({ ok: true, value: 3 });
        });

        it('resolve aggregation MAX', () => {
            expect(engine.evaluate('MAX($.analyses.samples)', ctx)).toEqual({ ok: true, value: 20 });
        });

        it('resolve aggregation AVG', () => {
            expect(engine.evaluate('AVG($group.items.samples)', ctx)).toEqual({ ok: true, value: 10 });
        });

        it('resolve aggregation SUM with multiple params', () => {
            expect(engine.evaluate('SUM($group.items.samples, 2)', ctx)).toEqual({ ok: true, value: 22 });
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
        });

        it('resolves row and column together (pivot cell use case)', () => {
            const r = engine.evaluate("CONCAT($row.name, ' - ', $column.time)", ctx);
            expect(r).toEqual({ ok: true, value: 'Emocromo - 08:00' });
        });
    });
}); 

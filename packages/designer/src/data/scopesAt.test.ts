import { describe, it, expect } from 'vitest';
import type { PrintDocument } from '@print-engine/schema';
import { buildContext, scopesAt } from './scopesAt';
import { TsExpressionEngine } from '@print-engine/expr';

const doc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: {
        type: 'stack',
        children: [
            { type: 'text', value: 'Title' },
            {
                type: 'group',
                dataSource: '$.items',
                groupBy: '$item.category',
                detail: { type: 'text', value: 'row' },
            },
        ],
    },
};

const nestedDoc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: {
        type: 'repeat',
        dataSource: '$.outer',
        template: {
            type: 'repeat',
            dataSource: '$item.inner',
            template: { type: 'text', value: 'x' },
        },
    },
};

describe('scopesAt', () => {
    it('introduces no scope for a node outside any group/repeat', () => {
        const result = scopesAt(doc, ['body', 'children', 0]);

        expect(result).toEqual([]);
    });

    it('adds $item for a node inside a group', () => {
        const result = scopesAt(doc, ['body', 'children', 1, 'detail']);

        expect(result).toEqual([
            { name: '$item', expr: '$.items' },
        ]);
    });

    it('keeps both item steps for nested repeats, in nesting order', () => {
        const result = scopesAt(nestedDoc, ['body', 'template', 'template']);

        expect(result).toEqual([
            { name: '$item', expr: '$.outer' },
            { name: '$item', expr: '$item.inner' },
        ]);
    });
});

describe('buildContext', () => {
    const engine = new TsExpressionEngine();

    it('starts from the root alone when no scope is introduced', () => {
        const sampleData = { a: 1 };

        const result = buildContext([], sampleData, engine);

        expect(result).toEqual({ ctx: { root: sampleData } });
    });

    it('resolves the innermost $item using the outer one', () => {
        const sampleData = {
            outer: [
                { inner: [{ x: 1 }, { x: 2 }] },
            ],
        };

        const scopes = scopesAt(nestedDoc, ['body', 'template', 'template']);
        const result = buildContext(scopes, sampleData, engine);

        expect(result.ctx.item).toEqual({ x: 1 });
    });

    it('reports the failure and keeps the context resolved so far', () => {
        const missingDoc: PrintDocument = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: {
                type: 'repeat',
                dataSource: '$.missing', // not in the sample data
                template: { type: 'text', value: 'x' },
            },
        };
        const sampleData = { present: [{ x: 1 }] };

        const scopes = scopesAt(missingDoc, ['body', 'template']);
        const result = buildContext(scopes, sampleData, engine);

        expect(result.ctx).toEqual({ root: sampleData }); // no item written
        expect(result.error).toEqual({ scope: '$item', reason: 'null' });
    });

    it('clears $item when the inner step breaks, even though the outer one resolved', () => {
        const sampleData = {
            outer: [
                { notInner: 'something' },
            ],
        };

        const scopes = scopesAt(nestedDoc, ['body', 'template', 'template']);
        const result = buildContext(scopes, sampleData, engine);

        expect(result.ctx.item).toBeUndefined();
        expect(result.error).toEqual({ scope: '$item', reason: 'null' });
    });
});

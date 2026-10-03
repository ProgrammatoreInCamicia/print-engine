import { describe, expect, it } from "vitest";
import { fieldTree } from "./fieldTree";

describe('fieldTree', () => {
    it('produces one node per key for a flat object', () => {
        const result = fieldTree({ name: 'test', count: 5 }, '$');

        expect(result).toEqual([
            { name: 'name', kind: 'value', expr: '$.name', sample: '"test"', isPluck: false },
            { name: 'count', kind: 'value', expr: '$.count', sample: '5', isPluck: false },
        ]);
    });

    it('recurses into nested objects', () => {
        const result = fieldTree({ customer: { name: 'Mario' } }, '$');
        expect(result).toEqual([
            {
                name: 'customer',
                kind: 'object',
                expr: '$.customer',
                children: [
                    { name: 'name', kind: 'value', expr: '$.customer.name', sample: '"Mario"', isPluck: false }
                ],
                isPluck: false,
            }
        ]);
    });

    it('deduces array shape from the first element', () => {
        const result = fieldTree({ items: [{ id: 1 }, { id: 2 }] }, '$');

        expect(result).toEqual([
            {
                name: 'items',
                kind: 'array',
                expr: '$.items',
                isPluck: false,
                children: [
                    { name: 'id', kind: 'value', expr: '$.items.id', sample: '1', isPluck: true },
                ],
            },
        ]);
    });

    it('still lists an empty array, with no deducible children', () => {
        const result = fieldTree({ items: [] }, '$');

        expect(result).toEqual([
            { name: 'items', kind: 'array', expr: '$.items', children: undefined, isPluck: false },
        ]);
    });

    it('handles arrays of primitives (no object to recurse into)', () => {
        const result = fieldTree({ tags: ['a', 'b', 'c'] }, '$');

        expect(result).toEqual([
            { name: 'tags', kind: 'array', expr: '$.tags', children: undefined, isPluck: false },
        ]);
    });

    it('stops recursing beyond the depth cap', () => {
        const deeplyNested = {
            l1: { l2: { l3: { l4: { l5: { l6: { tooDeep: 'value' } } } } } },
        };

        const result = fieldTree(deeplyNested, '$');

        let node = result[0];
        for (let i = 0; i < 5; i++) {
            expect(node?.children).toBeDefined();
            node = node!.children![0];
        }
        expect(node?.name).toBe('l6');
        expect(node?.children).toBeUndefined();
    });

    it('builds expressions relative to a different rootExpr (e.g. $item)', () => {
        const result = fieldTree({ category: 'A' }, '$item');

        expect(result).toEqual([
            { name: 'category', kind: 'value', expr: '$item.category', sample: '"A"', isPluck: false },
        ]);
    });

    it('derives fields from an array root using its first element', () => {
        const result = fieldTree([{ sku: 'A1', qty: 2 }, { sku: 'A2', qty: 1 }], '$');

        expect(result).toEqual([
            { name: 'sku', kind: 'value', expr: '$.sku', sample: '"A1"', isPluck: true },
            { name: 'qty', kind: 'value', expr: '$.qty', sample: '2', isPluck: true },
        ]);
    });

    it('propagates isPluck through an object nested inside an array', () => {
        const result = fieldTree({ items: [{ customer: { name: 'Mario' } }] }, '$');

        expect(result).toEqual([
            {
                name: 'items',
                kind: 'array',
                expr: '$.items',
                isPluck: false,
                children: [
                    {
                        name: 'customer',
                        kind: 'object',
                        expr: '$.items.customer',
                        isPluck: true,
                        children: [
                            { name: 'name', kind: 'value', expr: '$.items.customer.name', sample: '"Mario"', isPluck: true },
                        ],
                    },
                ],
            },
        ]);
    });
});

import { describe, expect, it } from "vitest";
import { fieldTree } from "./fieldTree";

describe('fieldTree', () => {
    it('produces one node per key for a flat object', () => {
        const result = fieldTree({ name: 'test', count: 5 }, '$');

        expect(result).toEqual([
            { name: 'name', kind: 'value', expr: '$.name', sample: '"test"' },
            { name: 'count', kind: 'value', expr: '$.count', sample: '5' },
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
                    { name: 'name', kind: 'value', expr: '$.customer.name', sample: '"Mario"' }
                ]
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
                children: [
                    { name: 'id', kind: 'value', expr: '$.items.id', sample: '1' },
                ],
            },
        ]);
    });

    it('still lists an empty array, with no deducible children', () => {
        const result = fieldTree({ items: [] }, '$');

        expect(result).toEqual([
            { name: 'items', kind: 'array', expr: '$.items', children: undefined },
        ]);
    });

    it('handles arrays of primitives (no object to recurse into)', () => {
        const result = fieldTree({ tags: ['a', 'b', 'c'] }, '$');

        expect(result).toEqual([
            { name: 'tags', kind: 'array', expr: '$.tags', children: undefined },
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
            { name: 'category', kind: 'value', expr: '$item.category', sample: '"A"' },
        ]);
    });
});
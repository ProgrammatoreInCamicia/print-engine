import { describe, it, expect } from 'vitest';
import type { PrintDocument } from '@print-engine/schema';
import { scopesAt } from './scopesAt';

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

describe('scopesAt', () => {
    it('returns only $ for a node outside any group/repeat', () => {
        const result = scopesAt(doc, ['body', 'children', 0]);

        expect(result).toEqual([{ name: '$', expr: '$' }]);
    });

    it('adds $item for a node inside a group', () => {
        const result = scopesAt(doc, ['body', 'children', 1, 'detail']);

        expect(result).toEqual([
            { name: '$', expr: '$' },
            { name: '$item', expr: '$.items' },
        ]);
    });

    it('the innermost item wins when repeats are nested', () => {
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

        const result = scopesAt(nestedDoc, ['body', 'template', 'template']);

        // ci si aspetta un solo $item, quello del repeat più interno
        expect(result).toEqual([
            { name: '$', expr: '$' },
            { name: '$item', expr: '$item.inner' },
        ]);
    });
});
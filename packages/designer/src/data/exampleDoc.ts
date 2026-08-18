import type { PrintDocument } from '@print-engine/schema';

export const exampleDoc: PrintDocument = {
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
                groupHeader: { type: 'field', bind: '$group.key' },
                detail: { type: 'text', value: 'row' },
                // groupFooter intentionally omitted, to exercise the empty-slot case
            },
        ],
    },
};
import type { PrintDocument } from '@print-engine/schema';

export const exampleDoc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: {type:'field', bind:'$.sku'}
};

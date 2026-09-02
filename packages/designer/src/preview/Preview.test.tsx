import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import type { Node, PrintDocument } from '@print-engine/schema';
import { Preview } from './Preview';
import { render, screen } from '../utils/test-utils';
import { sampleData } from '../data/sampleData';

// An unknown node type: the validator reports it, and resolve() would throw on
// it. That is the point -- if the preview ran the pipeline before validating,
// this test would blow up instead of failing on the assertion.
const invalidDoc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: { type: 'nope' } as unknown as Node,
};

describe('Preview', () => {
    it('lists the validation issues instead of drawing', () => {
        const { container } = render(<Preview sampleData={sampleData} />, { initialDoc: invalidDoc });

        expect(screen.getByText('Validation Issues')).toBeInTheDocument();
        expect(container.querySelector('.preview-resolved')).toBeNull();
    });

    it('draws the pages when the document is valid', () => {
        const { container } = render(<Preview sampleData={sampleData} />);

        expect(container.querySelector('.preview-resolved')).not.toBeNull();
        expect(screen.queryByText('Validation Issues')).not.toBeInTheDocument();
    });
});

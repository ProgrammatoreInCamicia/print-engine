import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import type { PrintDocument } from '@print-engine/schema';
import { AppLayout } from '../App';
import { fireEvent, render, screen } from '../utils/test-utils';

// The field tree only shows data once a node is selected, so every test starts
// by selecting this field. The repeat binds $item to the default $.items.
const doc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: {
        type: 'repeat',
        dataSource: '$.items',
        template: { type: 'field', bind: '$.start' },
    },
};

function setup() {
    render(<AppLayout />, { initialDoc: doc });
    fireEvent.click(screen.getByText('Field: $.start'));
}

const editor = () => screen.getByPlaceholderText('Incolla qui i dati di esempio in formato JSON');
const loadButton = () => screen.getByRole('button', { name: 'Carica dati' });

function type(text: string) {
    fireEvent.change(editor(), { target: { value: text } });
}

describe('DataPanel', () => {
    it('has nothing to load until the text differs from the loaded data', () => {
        setup();

        expect(loadButton()).toBeDisabled();
    });

    it('rejects invalid JSON and keeps the previous data', () => {
        setup();

        type('{ not json');

        expect(screen.getByText('JSON non valido')).toBeInTheDocument();
        expect(loadButton()).toBeDisabled();
        // the field tree still reads from the data loaded before
        expect(screen.getByText('($.items)')).toBeInTheDocument();
    });

    it('rejects a root that is neither an object nor an array', () => {
        setup();

        type('5');

        expect(screen.getByText('La radice deve essere un oggetto o un array')).toBeInTheDocument();
        expect(loadButton()).toBeDisabled();
    });

    it('loads valid JSON, and the field tree follows', () => {
        setup();

        type('{ "orders": [{ "id": 1 }] }');
        fireEvent.click(loadButton());

        expect(screen.getByText('($.orders)')).toBeInTheDocument();
        expect(screen.queryByText('($.items)')).not.toBeInTheDocument();
        // the repeat still iterates $.items, which the new data no longer has
        expect(screen.getByText(/Dati non disponibili per \$item/)).toBeInTheDocument();
    });

    it('disables the button again once the data is loaded', () => {
        setup();

        type('{ "orders": [] }');
        fireEvent.click(loadButton());

        expect(loadButton()).toBeDisabled();
    });
});

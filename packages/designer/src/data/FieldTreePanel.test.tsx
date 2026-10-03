import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import type { PrintDocument } from '@print-engine/schema';
import { AppLayout } from '../App';
import { fireEvent, render, screen } from '../utils/test-utils';

// These documents run against the default sample data:
//   { items: [{ category: 'A', value: 1 }, { category: 'A', value: 2 }, { category: 'B', value: 3 }] }

// A field inside a repeat over records: $item is an object.
const recordsDoc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: {
        type: 'repeat',
        dataSource: '$.items',
        template: { type: 'field', bind: '$.start' },
    },
};

// A field inside a repeat over a list of strings (a pluck): $item is a scalar.
const scalarsDoc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: {
        type: 'repeat',
        dataSource: '$.items.category',
        template: { type: 'field', bind: '$.start' },
    },
};

function selectTheField() {
    fireEvent.click(screen.getByText('Field: $.start'));
}

function clickExpression(expr: string) {
    fireEvent.click(screen.getByText(`(${expr})`));
}

const bind = () => screen.getByLabelText('Bind');

describe('FieldTreePanel', () => {
    it('inserts a value into the selected field', () => {
        render(<AppLayout />, { initialDoc: recordsDoc });
        selectTheField();

        clickExpression('$item.category');

        expect(bind()).toHaveValue('$item.category');
    });

    it('does not insert an array', () => {
        render(<AppLayout />, { initialDoc: recordsDoc });
        selectTheField();

        clickExpression('$.items');

        expect(bind()).toHaveValue('$.start');
    });

    it('does not insert a field reached through an array', () => {
        // '$.items.category' is a pluck: it evaluates to ['A', 'A', 'B'], not
        // to one category. Inside the repeat the right binding is $item.category.
        render(<AppLayout />, { initialDoc: recordsDoc });
        selectTheField();

        clickExpression('$.items.category');

        expect(bind()).toHaveValue('$.start');
    });

    it('inserts a scalar $item from the scope heading', () => {
        render(<AppLayout />, { initialDoc: scalarsDoc });
        selectTheField();

        fireEvent.click(screen.getByText('$item'));

        expect(bind()).toHaveValue('$item');
    });

    it('does not insert $item from the heading when it is an object', () => {
        render(<AppLayout />, { initialDoc: recordsDoc });
        selectTheField();

        fireEvent.click(screen.getByText('$item'));

        expect(bind()).toHaveValue('$.start');
    });

    it('only offers insertion while a field is selected', () => {
        render(<AppLayout />, { initialDoc: recordsDoc });

        fireEvent.click(screen.getByText('Repeat: $.items'));

        expect(screen.getByText("Seleziona un campo per poter inserire un'espressione")).toBeInTheDocument();
    });

    it('makes an insertion undoable like any other edit', () => {
        render(<AppLayout />, { initialDoc: recordsDoc });
        selectTheField();
        clickExpression('$item.category');

        fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));

        expect(bind()).toHaveValue('$.start');
    });
});

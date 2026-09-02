import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { AppLayout } from '../App';
import { fireEvent, render, screen } from '../utils/test-utils';

// exampleDoc: stack [ text 'Title', group { groupHeader: field '$group.key', detail: text 'row' } ]
const FIELD_LABEL = 'Field: $group.key';
const TEXT_LABEL = 'Text: Title';

function selectByLabel(label: string) {
    fireEvent.click(screen.getByText(label));
}

describe('PropertiesPanel', () => {
    it('shows the empty state while nothing is selected', () => {
        render(<AppLayout />);

        expect(screen.getByText('No node is selected')).toBeInTheDocument();
    });

    it('opens the field panel for a selected field', () => {
        render(<AppLayout />);

        selectByLabel(FIELD_LABEL);

        expect(screen.getByLabelText('Bind')).toHaveValue('$group.key');
    });

    it('says so for a type that has no panel yet', () => {
        render(<AppLayout />);

        selectByLabel(TEXT_LABEL);

        expect(screen.getByText(/No panel yet for type: text/)).toBeInTheDocument();
    });

    it('writes an edit through to the document', () => {
        render(<AppLayout />);
        selectByLabel(FIELD_LABEL);

        fireEvent.change(screen.getByLabelText('Bind'), { target: { value: '$group.items' } });

        // The structure surface reads from the same document, so its label is
        // the proof that the edit reached the state and not only the input.
        expect(screen.getByText('Field: $group.items')).toBeInTheDocument();
        expect(screen.queryByText(FIELD_LABEL)).not.toBeInTheDocument();
    });

    it('keeps the focus in the input across the edit', () => {
        // This is what the whole React decision was made for: if the panel were
        // remounted on every keystroke, the caret would be lost while typing.
        render(<AppLayout />);
        selectByLabel(FIELD_LABEL);

        const input = screen.getByLabelText('Bind');
        input.focus();
        fireEvent.change(input, { target: { value: '$group.items' } });

        expect(document.activeElement).toBe(input);
    });

    it('swaps the panel when the selection moves to another node', () => {
        render(<AppLayout />);
        selectByLabel(FIELD_LABEL);
        expect(screen.getByLabelText('Bind')).toBeInTheDocument();

        selectByLabel(TEXT_LABEL);

        expect(screen.queryByLabelText('Bind')).not.toBeInTheDocument();
    });

    it('undoes and redoes an edit from the toolbar', () => {
        render(<AppLayout />);
        selectByLabel(FIELD_LABEL);
        fireEvent.change(screen.getByLabelText('Bind'), { target: { value: '$group.items' } });

        fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
        expect(screen.getByText(FIELD_LABEL)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Ripeti' }));
        expect(screen.getByText('Field: $group.items')).toBeInTheDocument();
    });

    it('clears the selection when the surface background is clicked', () => {
        const { container } = render(<AppLayout />);
        selectByLabel(FIELD_LABEL);
        expect(screen.getByLabelText('Bind')).toBeInTheDocument();

        fireEvent.click(container.querySelector('.app-structure')!);

        expect(screen.getByText('No node is selected')).toBeInTheDocument();
    });

    it('keeps the selection when the preview is clicked', () => {
        // The preview shares the pane with the structure surface, but nothing
        // in it is selectable: clicking it must not close the panel.
        const { container } = render(<AppLayout />);
        selectByLabel(FIELD_LABEL);
        fireEvent.click(screen.getByRole('button', { name: 'Anteprima' }));

        fireEvent.click(container.querySelector('.preview')!);

        expect(screen.getByLabelText('Bind')).toBeInTheDocument();
    });

    it('keeps the selection when the toolbar is clicked', () => {
        // The toolbar lives inside the surface: without absorbing the click,
        // pressing undo would also clear the selection on the way up.
        render(<AppLayout />);
        selectByLabel(FIELD_LABEL);
        fireEvent.change(screen.getByLabelText('Bind'), { target: { value: '$group.items' } });

        fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));

        expect(screen.getByLabelText('Bind')).toHaveValue('$group.key');
    });

    it('disables undo and redo when there is nothing to undo or redo', () => {
        render(<AppLayout />);

        expect(screen.getByRole('button', { name: 'Annulla' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Ripeti' })).toBeDisabled();
    });
});

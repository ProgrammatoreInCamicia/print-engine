import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { exampleDoc } from "../data/exampleDoc";
import { fireEvent, render, screen } from "../utils/test-utils";
import { StructureNode } from "./StructureNode";

describe("StructureNode", () => {

    it('renders without crashing', () => {
        render(<StructureNode node={exampleDoc.body} path={['body']} />);
    });

    it('selecting a deeply nested leaf selects only that leaf', () => {
        const { container } = render(<StructureNode node={exampleDoc.body} path={['body']} />);

        const leaf = screen.getByText('Text: row');
        fireEvent.click(leaf);

        expect(leaf.closest('.structure-node')).toHaveClass('selected');
        expect(container.getElementsByClassName('selected').length).toBe(1);
    });

    it('clicking an empty slot leaves the selection where it was', () => {
        const { container } = render(<StructureNode node={exampleDoc.body} path={['body']} />);

        const groupNode = screen.getByText(/^Group by/).closest('.structure-node')!;
        fireEvent.click(groupNode);
        expect(groupNode).toHaveClass('selected');

        // The empty slot swallows the click: if it let it bubble, the parent's
        // handler (and then the stack's) would move the selection.
        fireEvent.click(screen.getByText(/group footer/));

        expect(groupNode).toHaveClass('selected');
        expect(container.getElementsByClassName('selected').length).toBe(1);
    });

})
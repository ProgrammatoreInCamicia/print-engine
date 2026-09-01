import { describe, it, expect } from 'vitest';
import type { PrintDocument, Node } from '@print-engine/schema';
import { designerReducer, DesignerState } from './reducer';

function makeState(doc: PrintDocument): DesignerState {
    return {
        current: doc,
        selection: null,
        past: [],
        future: [],
    };
}

const baseDoc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: {
        type: 'stack',
        children: [
            { type: 'text', value: 'a' },
            { type: 'text', value: 'b' },
        ],
    },
};

describe('designerReducer', () => {
    it('SET_SELECTION updates only the selection, not the history', () => {
        const state = makeState(baseDoc);
        const result = designerReducer(state, { type: 'SET_SELECTION', path: ['body'] });

        expect(result.selection).toEqual(['body']);
        expect(result.current).toBe(state.current); // same reference, untouched
        expect(result.past).toEqual([]);
        expect(result.future).toEqual([]);
    });

    it('UPDATE_NODE applies the change and pushes the old document onto past', () => {
        const state = makeState(baseDoc);
        const newNode: Node = { type: 'text', value: 'changed' };

        const result = designerReducer(state, {
            type: 'UPDATE_NODE',
            path: ['body', 'children', 0],
            node: newNode,
        });

        expect(result.past).toEqual([{ doc: baseDoc, selection: null }]);
        expect(result.future).toEqual([]);
        expect(
            (result.current.body as Extract<Node, { type: 'stack' }>).children[0],
        ).toEqual(newNode);
    });

    it('UPDATE_NODE clears future (history branches on a new change)', () => {
        let state = makeState(baseDoc);
        state = designerReducer(state, {
            type: 'UPDATE_NODE',
            path: ['body', 'children', 0],
            node: { type: 'text', value: 'first change' },
        });
        state = designerReducer(state, { type: 'UNDO' });
        expect(state.future).toHaveLength(1); // there is something to redo

        state = designerReducer(state, {
            type: 'UPDATE_NODE',
            path: ['body', 'children', 0],
            node: { type: 'text', value: 'different change' },
        });

        expect(state.future).toEqual([]); // the old "forward" no longer makes sense
    });

    it('UNDO does nothing when past is empty', () => {
        const state = makeState(baseDoc);
        const result = designerReducer(state, { type: 'UNDO' });

        expect(result).toBe(state); // no change, same object
    });

    it('REDO does nothing when future is empty', () => {
        const state = makeState(baseDoc);
        const result = designerReducer(state, { type: 'REDO' });

        expect(result).toBe(state);
    });

    it('UNDO then REDO returns to the exact same document as after the change', () => {
        let state = makeState(baseDoc);
        state = designerReducer(state, {
            type: 'UPDATE_NODE',
            path: ['body', 'children', 0],
            node: { type: 'text', value: 'changed' },
        });
        const afterChange = state.current;

        state = designerReducer(state, { type: 'UNDO' });
        expect(state.current).toEqual(baseDoc);

        state = designerReducer(state, { type: 'REDO' });
        expect(state.current).toEqual(afterChange);
    });

    it('UNDO moves the change from past to future', () => {
        let state = makeState(baseDoc);
        state = designerReducer(state, {
            type: 'UPDATE_NODE',
            path: ['body', 'children', 0],
            node: { type: 'text', value: 'x' },
        });
        const afterChange = state.current;   // <-- capture the document produced by the change

        state = designerReducer(state, { type: 'UNDO' });

        expect(state.past).toEqual([]);
        // <-- compare against that one, not baseDoc
        expect(state.future).toEqual([{ doc: afterChange, selection: null }]);
    });

    it('UNDO puts the selection back where it was before the change', () => {
        let state = makeState(baseDoc);
        state = designerReducer(state, { type: 'SET_SELECTION', path: ['body', 'children', 0] });
        state = designerReducer(state, {
            type: 'UPDATE_NODE',
            path: ['body', 'children', 0],
            node: { type: 'text', value: 'changed' },
        });
        // the user then clicks somewhere else before undoing
        state = designerReducer(state, { type: 'SET_SELECTION', path: ['body'] });

        state = designerReducer(state, { type: 'UNDO' });

        expect(state.selection).toEqual(['body', 'children', 0]);
    });

    it('REDO restores the selection as it was when undo was pressed', () => {
        let state = makeState(baseDoc);
        state = designerReducer(state, { type: 'SET_SELECTION', path: ['body', 'children', 0] });
        state = designerReducer(state, {
            type: 'UPDATE_NODE',
            path: ['body', 'children', 0],
            node: { type: 'text', value: 'changed' },
        });
        state = designerReducer(state, { type: 'SET_SELECTION', path: ['body'] });
        state = designerReducer(state, { type: 'UNDO' });

        state = designerReducer(state, { type: 'REDO' });

        expect(state.selection).toEqual(['body']);
    });

    it('SET_SELECTION alone is not undoable', () => {
        let state = makeState(baseDoc);
        state = designerReducer(state, { type: 'SET_SELECTION', path: ['body'] });

        const result = designerReducer(state, { type: 'UNDO' });

        expect(result).toBe(state);   // nothing to undo: no edit happened
    });
});
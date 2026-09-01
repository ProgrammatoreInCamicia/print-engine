import { Node, PrintDocument } from "@print-engine/schema";
import { NodePath, setAtPath } from "../structure/paths";

/**
 * A point the history can return to. The selection travels with the document
 * because an edit is only intelligible together with what was selected when it
 * happened -- undoing a deletion has to put the selection back on the node it
 * brings back.
 */
export interface DesignerSnapshot {
    doc: PrintDocument;
    selection: NodePath | null;
}

export interface DesignerState {
    current: PrintDocument;
    selection: NodePath | null;
    past: DesignerSnapshot[];
    future: DesignerSnapshot[];
}

type DesignerAction =
    { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'UPDATE_NODE'; path: NodePath; node: Node }
    | { type: 'SET_SELECTION'; path: NodePath | null };

function snapshot(state: DesignerState): DesignerSnapshot {
    return { doc: state.current, selection: state.selection };
}

export function designerReducer(state: DesignerState, action: DesignerAction): DesignerState {
    switch (action.type) {
        // Moving the selection is not an edit, so it does not enter the
        // history: undo steps back through changes to the document, not
        // through everything the user clicked on along the way.
        case 'SET_SELECTION':
            return {
                ...state,
                selection: action.path
            }
        case 'UPDATE_NODE': {
            const newDoc = setAtPath(state.current, action.path, action.node);
            return {
                ...state,
                past: [
                    ...state.past,
                    snapshot(state)
                ],
                current: newDoc,
                future: []
            }
        };
        case 'UNDO': {
            if (state.past.length === 0)
            {
                return state;
            }
            const previous = state.past[state.past.length - 1]!;
            return {
                ...state,
                current: previous.doc,
                selection: previous.selection,
                past: state.past.slice(0, -1),
                future: [snapshot(state), ...state.future],
            }
        };
        case 'REDO': {
            if (state.future.length === 0)
            {
                return state;
            }
            const next = state.future[0]!;
            return {
                ...state,
                current: next.doc,
                selection: next.selection,
                past: [...state.past, snapshot(state)],
                future: state.future.slice(1),
            }
        };
    }
}
